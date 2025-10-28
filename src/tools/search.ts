/**
 * Consolidated Search Tool Handler
 * Handles universal search with intelligent routing and token budget management
 */

import { ToolRouter, UniversalSearchOptions } from '../tool-router.js';
import { ObsidianLinks } from '../obsidian-links.js';
import { NaturalLanguageProcessor } from '../natural-language-processor.js';
import { ResponseTruncator } from '../response-truncator.js';
import { validateMaxResults, DEFAULT_TOKEN_BUDGET } from '../../dev/contracts/MCP-38-contracts.js';
import type { ToolResponse } from './shared.js';
import { validateToolMode } from './shared.js';
import type { ToolMode } from '../../dev/contracts/MCP-6-contracts.js';

/**
 * Execute consolidated search tool
 */
export async function executeSearch(
  args: Record<string, any>,
  toolMode: ToolMode
): Promise<ToolResponse> {
  // Validate tool mode
  validateToolMode(toolMode, 'consolidated');

  // Validate and apply maxResults constraints
  const validatedMaxResults = validateMaxResults(
    typeof args.maxResults === 'number' ? args.maxResults : undefined,
    'search'
  );

  const searchOptions: UniversalSearchOptions = {
    ...args as unknown as UniversalSearchOptions,
    maxResults: validatedMaxResults
  };

  // Note: OR queries are now handled in the ToolRouter by splitting into multiple searches
  const allResults = await ToolRouter.routeSearch(searchOptions);

  // Extract format parameter (default: detailed for backward compatibility)
  const format = (args.format === 'concise' || args.format === 'detailed')
    ? args.format
    : 'detailed';

  // Initialize token budget tracker
  const tokenBudget = new ResponseTruncator(DEFAULT_TOKEN_BUDGET);

  // Check if we have natural language interpretation to display
  let interpretationText = '';
  if (allResults.length > 0 && allResults[0].interpretation) {
    interpretationText = NaturalLanguageProcessor.formatInterpretation(allResults[0].interpretation) + '\n\n';
    // Account for interpretation text in budget
    tokenBudget.consumeBudget(interpretationText);
  }

  // Track results that fit within budget
  const includedResults: string[] = [];
  let truncated = false;

  for (let index = 0; index < allResults.length; index++) {
    const result = allResults[index];
    const note = result.note;
    const score = result.score.toFixed(1);
    const matchCount = result.matches.length;
    const title = ObsidianLinks.extractNoteTitle(note.path, note.frontmatter);

    let output = ObsidianLinks.formatSearchResult(
      index + 1,
      title,
      note.path,
      note.frontmatter['content type'] || 'Unknown',
      result.score,
      `${matchCount} matches`,
      format,
      tokenBudget  // Pass truncator for potential future use
    );

    // Show top 3 matches with context (only in detailed mode for performance)
    if (format === 'detailed') {
      const topMatches = result.matches.slice(0, 3);
      if (topMatches.length > 0) {
        output += '\n\n**Matches:**\n';
        topMatches.forEach(match => {
          const type = match.type === 'frontmatter' ? `${match.type} (${match.field})` : match.type;
          output += `- *${type}*: "${match.context}"\n`;
        });
      }
    }

    // Check if adding this result would exceed budget
    if (!tokenBudget.canAddResult(output + '\n\n---\n\n')) {
      truncated = true;
      break;  // Stop adding results (early termination)
    }

    // Consume budget for this result
    tokenBudget.consumeBudget(output + '\n\n---\n\n');
    includedResults.push(output);
  }

  const resultText = includedResults.join('\n\n---\n\n');

  // Generate truncation metadata
  const truncationInfo = tokenBudget.getTruncationInfo(
    includedResults.length,
    allResults.length,
    format,
    false  // autoDowngraded not implemented yet
  );

  // Build response text with truncation notice if applicable
  let responseText = `${interpretationText}Found ${allResults.length} results`;
  if (truncationInfo.truncated) {
    responseText += ` (showing ${truncationInfo.shownCount})\n\n${truncationInfo.suggestion}`;
  } else {
    responseText += ':';
  }
  responseText += `\n\n${resultText}`;

  return {
    content: [{
      type: 'text',
      text: responseText
    }],
    // Add truncation metadata for debugging/telemetry
    truncation: truncationInfo.truncated ? truncationInfo : undefined
  };
}
