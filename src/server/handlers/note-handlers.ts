/**
 * Note operation handlers for MCP-98
 * Handles CRUD operations on notes: read, edit, insert content
 */

import type { ToolHandler, ToolHandlerContext } from '../../../dev/contracts/MCP-8-contracts.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import type { EditNoteInput, InsertContentInput } from '../../types.js';
import type { RenameNoteInput, RenameNoteOutput, RenameNoteError } from '../../../dev/contracts/MCP-105-contracts.js';
import type { MutableToolHandlerRegistry } from '../../../dev/contracts/MCP-98-contracts.js';
import { NOTE_HANDLER_TOOL_NAMES } from '../../../dev/contracts/MCP-98-contracts.js';
import { VaultUtils } from '../../vault-utils.js';
import { ObsidianLinks } from '../../obsidian-links.js';
import { normalizePath } from '../../path-utils.js';
import { addVersionMetadata } from '../tool-registry.js';
import { format } from 'date-fns';
import { LIFEOS_CONFIG } from '../../config.js';
import { logger } from '../../logger.js';

/**
 * Type-safe interface for note update operations
 */
interface NoteUpdateParams {
  mode: 'merge' | 'replace';
  content?: string;
  frontmatter?: Record<string, unknown>;
}

/**
 * Shared helper to resolve note path from either direct path or title search
 * @param args - Object containing either path or title
 * @param vaultPath - Vault base path for normalization
 * @returns Normalized note path
 * @throws Error if neither path nor title provided
 */
async function resolveNotePath(
  args: { path?: string; title?: string },
  vaultPath: string
): Promise<string> {
  if (args.path) {
    return normalizePath(args.path, vaultPath);
  } else if (args.title) {
    return await VaultUtils.findNoteByTitle(args.title);
  } else {
    throw new Error('Either path or title is required');
  }
}

/**
 * Handler registry (lazy initialization)
 */
let noteHandlers: Map<string, ToolHandler> | null = null;

/**
 * Ensure handlers are initialized
 */
function ensureNoteHandlersInitialized(): void {
  if (noteHandlers) return;

  noteHandlers = new Map<string, ToolHandler>();
  noteHandlers.set('read_note', readNoteHandler);
  noteHandlers.set('edit_note', editNoteHandler);
  noteHandlers.set('rename_note', renameNoteHandler);
  noteHandlers.set('insert_content', insertContentHandler);
}

/**
 * Read note handler
 * Reads a note from the vault and returns formatted content
 */
const readNoteHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolHandlerContext
): Promise<CallToolResult> => {
  const path = args.path as string;
  if (!path) {
    throw new Error('Path is required');
  }

  // Normalize path using shared utility (cross-platform, escaped spaces, path traversal safe)
  const normalizedPath = normalizePath(path, LIFEOS_CONFIG.vaultPath);

  // Debug logging removed for MCP compatibility
  const note = VaultUtils.readNote(normalizedPath);
  const obsidianLink = ObsidianLinks.createClickableLink(note.path, note.frontmatter.title);

  // Normalize tags to array format
  const tags = VaultUtils.normalizeTagsToArray(note.frontmatter.tags);
  const tagsDisplay = tags.length > 0 ? tags.join(', ') : 'None';

  return addVersionMetadata({
    content: [{
      type: 'text',
      text: `# ${ObsidianLinks.extractNoteTitle(note.path, note.frontmatter)}\n\n**Path:** ${note.path}\n**Content Type:** ${note.frontmatter['content type']}\n**Tags:** ${tagsDisplay}\n\n${obsidianLink}\n\n---\n\n${note.content}`
    }]
  }, context.registryConfig) as CallToolResult;
};

/**
 * Edit note handler
 * Updates note frontmatter and/or content
 */
const editNoteHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolHandlerContext
): Promise<CallToolResult> => {
  const typedArgs = args as unknown as EditNoteInput;

  // Get note path using shared helper
  const notePath = await resolveNotePath(typedArgs, LIFEOS_CONFIG.vaultPath);

  // Prepare update object with type safety
  const updates: NoteUpdateParams = {
    mode: (typedArgs.mode as 'merge' | 'replace') || 'merge'
  };

  if (typedArgs.content !== undefined) {
    updates.content = typedArgs.content as string;
  }

  if (typedArgs.frontmatter) {
    const fm = typedArgs.frontmatter;
    updates.frontmatter = {};

    // Map from API field names to YAML field names
    if (fm.contentType) updates.frontmatter['content type'] = fm.contentType;
    if (fm.category) updates.frontmatter.category = fm.category;
    if (fm.subCategory) updates.frontmatter['sub-category'] = fm.subCategory;
    if (fm.tags) updates.frontmatter.tags = fm.tags;
    if (fm.source) updates.frontmatter.source = fm.source;
    if (fm.people) updates.frontmatter.people = fm.people;

    // Allow any other custom fields
    Object.keys(fm).forEach(key => {
      if (!['contentType', 'category', 'subCategory', 'tags', 'source', 'people'].includes(key)) {
        updates.frontmatter![key] = fm[key];
      }
    });
  }

  // Update the note
  const updatedNote = VaultUtils.updateNote(notePath, updates);
  const obsidianLink = ObsidianLinks.createClickableLink(updatedNote.path, updatedNote.frontmatter.title);

  return addVersionMetadata({
    content: [{
      type: 'text',
      text: `✅ Updated note: **${ObsidianLinks.extractNoteTitle(updatedNote.path, updatedNote.frontmatter)}**\n\n${obsidianLink}\n\n📁 Location: \`${updatedNote.path.replace(LIFEOS_CONFIG.vaultPath + '/', '')}\`\n📝 Mode: ${updates.mode}\n⏰ Modified: ${format(updatedNote.modified, 'yyyy-MM-dd HH:mm:ss')}`
    }]
  }, context.registryConfig) as CallToolResult;
};

/**
 * Rename note handler
 * Renames a note file (Phase 1: basic rename without link updates)
 */
const renameNoteHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolHandlerContext
): Promise<CallToolResult> => {
  const typedArgs = args as unknown as RenameNoteInput;

  // Validate required parameters
  if (!typedArgs.oldPath) {
    throw new Error('oldPath is required');
  }
  if (!typedArgs.newPath) {
    throw new Error('newPath is required');
  }

  // Normalize paths
  const normalizedOldPath = normalizePath(typedArgs.oldPath, LIFEOS_CONFIG.vaultPath);
  const normalizedNewPath = normalizePath(typedArgs.newPath, LIFEOS_CONFIG.vaultPath);

  // Import path utilities
  const { dirname, basename, extname } = await import('path');

  // Validate .md extension on both paths
  if (extname(normalizedOldPath) !== '.md') {
    const error: RenameNoteError = {
      success: false,
      error: 'Source file must have .md extension',
      errorCode: 'INVALID_PATH'
    };
    return addVersionMetadata({
      content: [{ type: 'text', text: JSON.stringify(error, null, 2) }],
      isError: true
    }, context.registryConfig) as CallToolResult;
  }

  if (extname(normalizedNewPath) !== '.md') {
    const error: RenameNoteError = {
      success: false,
      error: 'New filename must have .md extension',
      errorCode: 'INVALID_PATH'
    };
    return addVersionMetadata({
      content: [{ type: 'text', text: JSON.stringify(error, null, 2) }],
      isError: true
    }, context.registryConfig) as CallToolResult;
  }

  // Extract destination folder and new filename from newPath
  const destinationFolder = dirname(normalizedNewPath);
  const newFilename = basename(normalizedNewPath);

  // Validate source exists
  const { existsSync } = await import('fs');
  if (!existsSync(normalizedOldPath)) {
    const fileName = basename(normalizedOldPath, '.md');
    const error: RenameNoteError = {
      success: false,
      error: `Note not found: ${normalizedOldPath}. Run search(query='${fileName}') to find similar notes.`,
      errorCode: 'FILE_NOT_FOUND'
    };
    return addVersionMetadata({
      content: [{ type: 'text', text: JSON.stringify(error, null, 2) }],
      isError: true
    }, context.registryConfig) as CallToolResult;
  }

  // Check if renaming to same name (no-op)
  if (normalizedOldPath === normalizedNewPath) {
    const error: RenameNoteError = {
      success: false,
      error: 'Old path and new path are identical - no rename needed',
      errorCode: 'INVALID_PATH'
    };
    return addVersionMetadata({
      content: [{ type: 'text', text: JSON.stringify(error, null, 2) }],
      isError: true
    }, context.registryConfig) as CallToolResult;
  }

  // Use VaultUtils.moveItem with newFilename parameter
  const moveResult = VaultUtils.moveItem(
    normalizedOldPath,
    destinationFolder,
    { newFilename }
  );

  if (!moveResult.success) {
    // Map VaultUtils errors to RenameNoteError codes
    let errorCode: RenameNoteError['errorCode'] = 'UNKNOWN_ERROR';
    if (moveResult.error?.includes('already exists')) {
      errorCode = 'FILE_EXISTS';
    } else if (moveResult.error?.includes('not found')) {
      errorCode = 'FILE_NOT_FOUND';
    } else if (moveResult.error?.includes('Permission') || moveResult.error?.includes('EACCES')) {
      errorCode = 'PERMISSION_DENIED';
    }

    const error: RenameNoteError = {
      success: false,
      error: moveResult.error || 'Unknown error during rename',
      errorCode
    };
    return addVersionMetadata({
      content: [{ type: 'text', text: JSON.stringify(error, null, 2) }],
      isError: true
    }, context.registryConfig) as CallToolResult;
  }

  // Build success response
  const warnings: string[] = [];

  // Add Phase 1 limitation warnings if flags were provided
  if (typedArgs.updateLinks) {
    warnings.push('Link updates not implemented yet (available in Phase 3)');
  }
  if (typedArgs.dryRun) {
    warnings.push('Dry-run mode not implemented yet (available in Phase 5)');
  }

  const output: RenameNoteOutput = {
    success: true,
    oldPath: normalizedOldPath,
    newPath: moveResult.newPath,
    message: `Successfully renamed note from ${basename(normalizedOldPath)} to ${basename(moveResult.newPath)}`,
    ...(warnings.length > 0 && { warnings })
  };

  return addVersionMetadata({
    content: [{ type: 'text', text: JSON.stringify(output, null, 2) }]
  }, context.registryConfig) as CallToolResult;
};

/**
 * Insert content handler
 * Inserts content at specific locations within a note
 */
const insertContentHandler: ToolHandler = async (
  args: Record<string, unknown>,
  context: ToolHandlerContext
): Promise<CallToolResult> => {
  const typedArgs = args as unknown as InsertContentInput;

  // Get note path using shared helper
  const notePath = await resolveNotePath(typedArgs, LIFEOS_CONFIG.vaultPath);

  // Validate required parameters
  const content = typedArgs.content;
  const target = typedArgs.target;

  if (!content) {
    throw new Error('Content is required');
  }

  if (!target || typeof target !== 'object') {
    throw new Error('Target is required and must be an object');
  }

  // Validate target has at least one valid field
  if (!target.heading && !target.blockRef && !target.pattern && !target.lineNumber) {
    throw new Error('Target must specify at least one of: heading, blockRef, pattern, or lineNumber');
  }

  // Get optional parameters
  const position = (typedArgs.position as 'before' | 'after' | 'append' | 'prepend' | 'end-of-section') || 'after';
  const ensureNewline = typedArgs.ensureNewline !== false; // Default true

  logger.info(`[insert_content] Inserting content into ${notePath}`);
  logger.info(`[insert_content] Target: ${JSON.stringify(target)}`);
  logger.info(`[insert_content] Position: ${position}`);

  // Perform the insertion
  let updatedNote;
  try {
    updatedNote = VaultUtils.insertContent(
      notePath,
      content,
      target,
      position,
      ensureNewline
    );
  } catch (insertError) {
    logger.error(`[insert_content] Failed to insert content: ${insertError}`);
    throw insertError;
  }

  try {
    const obsidianLink = ObsidianLinks.createClickableLink(updatedNote.path, updatedNote.frontmatter.title);

    // Build target description
    let targetDesc = '';
    if (target.heading) targetDesc = `heading "${target.heading}"`;
    else if (target.blockRef) targetDesc = `block reference "${target.blockRef}"`;
    else if (target.pattern) targetDesc = `pattern "${target.pattern}"`;
    else if (target.lineNumber) targetDesc = `line ${target.lineNumber}`;

    const formattedDate = format(updatedNote.modified, 'yyyy-MM-dd HH:mm:ss');

    const response = addVersionMetadata({
      content: [{
        type: 'text',
        text: `✅ Inserted content in **${ObsidianLinks.extractNoteTitle(updatedNote.path, updatedNote.frontmatter)}**\n\n` +
              `${obsidianLink}\n\n` +
              `📁 Location: \`${updatedNote.path.replace(LIFEOS_CONFIG.vaultPath + '/', '')}\`\n` +
              `🎯 Target: ${targetDesc}\n` +
              `📍 Position: ${position}\n` +
              `⏰ Modified: ${formattedDate}`
      }]
    }, context.registryConfig);

    return response as CallToolResult;
  } catch (responseError) {
    throw new Error(`Failed to generate response: ${responseError instanceof Error ? responseError.message : String(responseError)}`);
  }
};

/**
 * Register note handlers in the global handler registry
 *
 * @param registry - Mutable tool handler registry
 * @returns Same registry for chaining
 */
export function registerNoteHandlers<T extends MutableToolHandlerRegistry>(
  registry: T
): T {
  ensureNoteHandlersInitialized();

  NOTE_HANDLER_TOOL_NAMES.forEach(toolName => {
    const handler = noteHandlers!.get(toolName);
    if (handler) {
      registry.set(toolName, handler);
    }
  });

  return registry;
}
