/**
 * YAML Operations - Frontmatter Analysis
 *
 * Extracted from vault-utils.ts (MCP-143)
 * Provides vault-wide YAML property analysis and value discovery
 */

import { join, basename } from "path";
import { glob } from "glob";
import matter from "gray-matter";
import { readFileWithRetry } from "./file-io.js";
import { LIFEOS_CONFIG } from "../../config.js";

/**
 * Get all unique values for a specific YAML property across the vault
 *
 * Scans all notes and collects unique values for the specified property,
 * separating single values from arrays. Optionally includes usage counts
 * and example notes.
 */
export function getYamlPropertyValues(
  property: string,
  options?: {
    includeCount?: boolean;
    includeExamples?: boolean;
    sortBy?: "alphabetical" | "usage" | "type";
    maxExamples?: number;
  },
): {
  property: string;
  totalNotes: number;
  values: {
    single: any[];
    array: any[][];
    uniqueValues: any[];
  };
  valueCounts?: Record<string, number>;
  valueExamples?: Record<string, string[]>;
  scannedFiles: number;
  skippedFiles: number;
} {
  const {
    includeCount = false,
    includeExamples = false,
    sortBy = "alphabetical",
    maxExamples = 3,
  } = options || {};

  const singleValues: any[] = [];
  const arrayValues: any[][] = [];
  const uniqueValuesSet = new Set<string>();
  const valueCounts: Record<string, number> = {};
  const valueExamples: Record<string, string[]> = {};
  const singleValueNotes: Map<any, string[]> = new Map();
  const arrayValueNotes: Map<string, string[]> = new Map();
  let totalNotes = 0;
  let scannedFiles = 0;
  let skippedFiles = 0;

  try {
    // Find all markdown files
    const files = glob.sync(join(LIFEOS_CONFIG.vaultPath, "**/*.md"), {
      ignore: ["**/node_modules/**", "**/.*"],
    });

    // Process each file
    for (const file of files) {
      scannedFiles++;
      try {
        const content = readFileWithRetry(file, "utf-8");
        const { data: frontmatter } = matter(content);

        if (
          frontmatter &&
          typeof frontmatter === "object" &&
          frontmatter.hasOwnProperty(property)
        ) {
          totalNotes++;
          const value = frontmatter[property];
          const noteTitle = frontmatter.title || basename(file, ".md");

          if (Array.isArray(value)) {
            // Handle array values
            arrayValues.push(value);
            const arrayKey = JSON.stringify(value);

            // Track notes for this array value
            if (includeExamples) {
              if (!arrayValueNotes.has(arrayKey)) {
                arrayValueNotes.set(arrayKey, []);
              }
              const notes = arrayValueNotes.get(arrayKey)!;
              if (notes.length < maxExamples) {
                notes.push(noteTitle);
              }
            }

            // Add each array element to unique values and count
            value.forEach((item) => {
              if (item !== null && item !== undefined) {
                const itemStr = String(item);
                uniqueValuesSet.add(itemStr);
                if (includeCount) {
                  valueCounts[itemStr] = (valueCounts[itemStr] || 0) + 1;
                }
              }
            });
          } else {
            // Handle single values
            singleValues.push(value);
            if (value !== null && value !== undefined) {
              const valueStr = String(value);
              uniqueValuesSet.add(valueStr);
              if (includeCount) {
                valueCounts[valueStr] = (valueCounts[valueStr] || 0) + 1;
              }

              // Track notes for this single value
              if (includeExamples) {
                if (!singleValueNotes.has(value)) {
                  singleValueNotes.set(value, []);
                }
                const notes = singleValueNotes.get(value)!;
                if (notes.length < maxExamples) {
                  notes.push(noteTitle);
                }
              }
            }
          }
        }
      } catch (error) {
        // Skip files that can't be parsed (malformed YAML, file access issues, etc.)
        skippedFiles++;
      }
    }

    // Sort values based on options
    let sortedSingleValues = singleValues;
    let sortedArrayValues = arrayValues;
    let sortedUniqueValues = Array.from(uniqueValuesSet);

    if (sortBy === "usage" && includeCount) {
      // Sort by usage count (descending)
      sortedUniqueValues.sort(
        (a, b) => (valueCounts[b] || 0) - (valueCounts[a] || 0),
      );

      // Sort single values by their usage count
      const singleValueCounts = new Map<any, number>();
      singleValues.forEach((v) => {
        const key = String(v);
        singleValueCounts.set(v, (singleValueCounts.get(v) || 0) + 1);
      });
      sortedSingleValues = Array.from(new Set(singleValues)).sort((a, b) => {
        const countA = singleValueCounts.get(a) || 0;
        const countB = singleValueCounts.get(b) || 0;
        return countB - countA;
      });

      // Sort array values by their usage count
      const arrayValueCounts = new Map<string, number>();
      arrayValues.forEach((arr) => {
        const key = JSON.stringify(arr);
        arrayValueCounts.set(key, (arrayValueCounts.get(key) || 0) + 1);
      });
      const uniqueArrays = Array.from(
        new Set(arrayValues.map((arr) => JSON.stringify(arr))),
      );
      sortedArrayValues = uniqueArrays
        .sort(
          (a, b) =>
            (arrayValueCounts.get(b) || 0) - (arrayValueCounts.get(a) || 0),
        )
        .map((arrStr) => JSON.parse(arrStr));
    } else if (sortBy === "type") {
      // Sort by type (singles first, then arrays)
      // Already separated by type
    } else {
      // Sort alphabetically
      sortedUniqueValues.sort((a, b) =>
        a.toLowerCase().localeCompare(b.toLowerCase()),
      );
      sortedSingleValues = Array.from(new Set(singleValues)).sort((a, b) =>
        String(a).toLowerCase().localeCompare(String(b).toLowerCase()),
      );
      sortedArrayValues = Array.from(
        new Set(arrayValues.map((arr) => JSON.stringify(arr))),
      )
        .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
        .map((arrStr) => JSON.parse(arrStr));
    }

    // Build examples if requested
    if (includeExamples) {
      // Add examples for single values
      singleValueNotes.forEach((notes, value) => {
        valueExamples[String(value)] = notes;
      });

      // Add examples for array values
      arrayValueNotes.forEach((notes, arrayKey) => {
        valueExamples[arrayKey] = notes;
      });
    }

    const result: any = {
      property,
      totalNotes,
      values: {
        single: sortedSingleValues,
        array: sortedArrayValues,
        uniqueValues: sortedUniqueValues,
      },
      scannedFiles,
      skippedFiles,
    };

    if (includeCount) {
      result.valueCounts = valueCounts;
    }

    if (includeExamples) {
      result.valueExamples = valueExamples;
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to get YAML property values: ${String(error)}`);
  }
}

/**
 * Get all unique YAML properties used across the vault
 *
 * Scans all notes and collects unique property names from frontmatter.
 * Optionally excludes standard LifeOS properties and includes usage counts.
 */
export function getAllYamlProperties(
  options: {
    includeCount?: boolean;
    excludeStandard?: boolean;
  } = {},
): {
  properties: string[];
  counts?: Record<string, number>;
  totalNotes?: number;
  scannedFiles?: number;
  skippedFiles?: number;
} {
  const { includeCount = false, excludeStandard = false } = options;

  // Standard LifeOS properties to exclude if requested
  const standardProperties = new Set([
    "title",
    "contentType",
    "category",
    "subCategory",
    "tags",
    "created",
    "modified",
    "source",
    "people",
    "author",
    "status",
    "priority",
    "due",
    "completed",
    "project",
    "area",
    "resources",
    "archive",
    "rating",
    "favorite",
    "pinned",
  ]);

  const propertySet = new Set<string>();
  const propertyCounts: Record<string, number> = {};
  let totalNotes = 0;
  let scannedFiles = 0;
  let skippedFiles = 0;

  try {
    // Find all markdown files
    const files = glob.sync(join(LIFEOS_CONFIG.vaultPath, "**/*.md"), {
      ignore: ["**/node_modules/**", "**/.*"],
    });

    // Process each file
    for (const file of files) {
      scannedFiles++;
      try {
        const content = readFileWithRetry(file, "utf-8");
        const { data: frontmatter } = matter(content);

        if (frontmatter && typeof frontmatter === "object") {
          totalNotes++;

          // Extract all property names
          for (const prop of Object.keys(frontmatter)) {
            // Skip if excluding standard and this is a standard property
            if (excludeStandard && standardProperties.has(prop)) {
              continue;
            }

            propertySet.add(prop);

            if (includeCount) {
              propertyCounts[prop] = (propertyCounts[prop] || 0) + 1;
            }
          }
        }
      } catch (error) {
        // Skip files that can't be parsed (malformed YAML, file access issues, etc.)
        skippedFiles++;
      }
    }

    const result: {
      properties: string[];
      counts?: Record<string, number>;
      totalNotes?: number;
      scannedFiles?: number;
      skippedFiles?: number;
    } = {
      properties: Array.from(propertySet),
      scannedFiles,
      skippedFiles,
    };

    if (includeCount) {
      result.counts = propertyCounts;
      result.totalNotes = totalNotes;
    }

    return result;
  } catch (error) {
    throw new Error(`Failed to get YAML properties: ${String(error)}`);
  }
}
