/**
 * Folder Operations
 *
 * Extracted from vault-utils.ts (MCP-144)
 * Provides folder and note moving operations with merge support
 */

import {
  existsSync,
  statSync,
  mkdirSync,
  rmSync,
  renameSync,
  readdirSync,
} from "fs";
import { basename, join } from "path";
import { normalizePath } from "../../shared/index.js";
import { LIFEOS_CONFIG } from "../../shared/index.js";

/**
 * Recursively merge source folder into destination folder
 * @private
 */
function mergeFolders(
  source: string,
  destination: string,
): { success: boolean; newPath: string; itemType: 'note' | 'folder'; error?: string } {
  try {
    const items = readdirSync(source, { withFileTypes: true });

    for (const item of items) {
      const sourcePath = join(source, item.name);
      const destPath = join(destination, item.name);

      if (item.isDirectory()) {
        if (existsSync(destPath)) {
          // Recursively merge subdirectories
          const result = mergeFolders(sourcePath, destPath);
          if (!result.success) {
            return result;
          }
        } else {
          // Move the subdirectory
          renameSync(sourcePath, destPath);
        }
      } else {
        // Move the file (overwriting if exists)
        if (existsSync(destPath)) {
          rmSync(destPath);
        }
        renameSync(sourcePath, destPath);
      }
    }

    // Remove the now-empty source directory
    rmSync(source, { recursive: true });
    return { success: true, newPath: destination, itemType: 'folder' };
  } catch (error) {
    return {
      success: false,
      newPath: "",
      itemType: 'folder',
      error: `Failed to merge folders: ${String(error)}`,
    };
  }
}

/**
 * Move a note or folder to a new location
 *
 * Supports:
 * - Moving files and folders
 * - Automatic destination creation
 * - Overwrite handling
 * - Folder merging
 * - Renaming during move
 */
export function moveItem(
  sourcePath: string,
  destinationFolder: string,
  options: {
    createDestination?: boolean;
    overwrite?: boolean;
    mergeFolders?: boolean;
    newFilename?: string;
  } = {},
): { success: boolean; newPath: string; itemType: 'note' | 'folder'; error?: string } {
  // Normalize paths using shared utility (MCP-64)
  // Replaces previous string prefix check with cross-platform path.isAbsolute()
  const normalizedSource = normalizePath(sourcePath, LIFEOS_CONFIG.vaultPath);
  const normalizedDest = normalizePath(destinationFolder, LIFEOS_CONFIG.vaultPath);

  // Validate source exists
  if (!existsSync(normalizedSource)) {
    return { success: false, newPath: "", itemType: 'note', error: "Source item not found" };
  }

  // Check if source is file or folder
  const isDirectory = statSync(normalizedSource).isDirectory();

  // Prevent moving folder into itself or its subdirectories
  if (isDirectory && normalizedDest.startsWith(normalizedSource)) {
    return {
      success: false,
      newPath: "",
      itemType: 'folder',
      error: "Cannot move folder into itself or its subdirectories",
    };
  }

  // Create destination if needed
  if (!existsSync(normalizedDest)) {
    if (options.createDestination) {
      mkdirSync(normalizedDest, { recursive: true });
    } else {
      return {
        success: false,
        newPath: "",
        itemType: isDirectory ? 'folder' : 'note',
        error: "Destination folder does not exist",
      };
    }
  }

  // Ensure destination is a directory
  if (!statSync(normalizedDest).isDirectory()) {
    return {
      success: false,
      newPath: "",
      itemType: isDirectory ? 'folder' : 'note',
      error: "Destination must be a folder",
    };
  }

  const itemName = options.newFilename || basename(normalizedSource);
  const newPath = join(normalizedDest, itemName);

  // Handle existing items
  if (existsSync(newPath)) {
    if (isDirectory && options.mergeFolders) {
      // Merge folder contents
      return mergeFolders(normalizedSource, newPath);
    } else if (!options.overwrite) {
      return {
        success: false,
        newPath: "",
        itemType: isDirectory ? 'folder' : 'note',
        error: "Item already exists in destination",
      };
    } else if (!isDirectory) {
      // For files with overwrite=true, remove the existing file first
      rmSync(newPath);
    } else {
      // For directories with overwrite=true but mergeFolders=false, remove existing directory
      rmSync(newPath, { recursive: true });
    }
  }

  try {
    renameSync(normalizedSource, newPath);
    return { success: true, newPath, itemType: isDirectory ? 'folder' : 'note' };
  } catch (error) {
    return { success: false, newPath: "", itemType: isDirectory ? 'folder' : 'note', error: String(error) };
  }
}
