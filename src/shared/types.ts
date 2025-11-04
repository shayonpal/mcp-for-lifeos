export interface LifeOSConfig {
  vaultPath: string;
  attachmentsPath: string;
  templatesPath: string;
  dailyNotesPath: string;
  yamlRulesPath?: string;
  customInstructions?: CustomInstructionsConfig;
}

/**
 * Configuration for custom instructions with support for both
 * inline definitions and file-based references
 */
export interface CustomInstructionsConfig {
  /**
   * Inline instruction definitions
   * For immediate configuration without external files
   */
  inline?: {
    /** Rules applied during note creation */
    noteCreationRules?: string;

    /** Rules applied during note editing */
    editingRules?: string;

    /** Rules applied during template processing */
    templateRules?: string;
  };

  /**
   * File path reference to external instructions file
   * Enables hot-reload when combined with enableHotReload
   */
  filePath?: string;

  /**
   * Enable hot-reload for file-based instructions
   * Uses fs.watch() to detect changes and clear cache
   * Default: false
   */
  enableHotReload?: boolean;
}

export interface YAMLFrontmatter {
  title?: string;
  aliases?: string[];
  'content type'?: string | string[];
  category?: string;
  'sub-category'?: string;
  tags?: string[];
  'date created'?: string;
  'date modified'?: string;
  source?: string;
  author?: string[];
  people?: string[];
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  [key: string]: any;
}

export interface LifeOSNote {
  path: string;
  frontmatter: YAMLFrontmatter;
  content: string;
  created: Date;
  modified: Date;
}

export interface SearchOptions {
  contentType?: string | string[];
  category?: string;
  tags?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  folder?: string;
  author?: string;
}

export interface NoteTemplate {
  name: string;
  frontmatter: Partial<YAMLFrontmatter>;
  content: string;
  targetFolder?: string;
}

// TODO: Plan eventual split to types/tool-inputs.ts if file becomes unwieldy

// ============================================================================
// TOOL INPUT INTERFACES
// ============================================================================

/**
 * Input interface for edit_note tool
 * @see src/index.ts line 456 for JSON Schema definition
 */
export interface EditNoteInput {
  /** Path to the note file (absolute or relative to vault) */
  path?: string;

  /** Note title (alternative to path) */
  title?: string;

  /** New content (optional - preserves existing if not provided) */
  content?: string;

  /** Frontmatter fields to update (merged with existing) */
  frontmatter?: EditNoteFrontmatter;

  /** Update mode: merge (default) or replace frontmatter */
  mode?: 'merge' | 'replace';
}

/**
 * Frontmatter structure for edit_note tool
 * Subset of YAMLFrontmatter with editable fields only
 * Allows arbitrary custom fields via index signature
 */
export interface EditNoteFrontmatter {
  /** Content type */
  contentType?: string;

  /** Category */
  category?: string;

  /** Sub-category */
  subCategory?: string;

  /** Tags array */
  tags?: string[];

  /** Source URL */
  source?: string;

  /** People mentioned */
  people?: string[];

  /** Allow arbitrary custom fields */
  [key: string]: unknown;
}

/**
 * Input interface for insert_content tool
 * @see src/index.ts line 776 for JSON Schema definition
 */
export interface InsertContentInput {
  /** Path to the note file (absolute or relative to vault) */
  path?: string;

  /** Note title (alternative to path) */
  title?: string;

  /** Content to insert (required) */
  content: string;

  /** Target location for insertion (required) */
  target: InsertContentTarget;

  /** Where to insert content relative to target (default: after) */
  position?: 'before' | 'after' | 'append' | 'prepend' | 'end-of-section';

  /** Ensure proper line breaks around inserted content (default: true) */
  ensureNewline?: boolean;
}

/**
 * Target location structure for insert_content tool
 * One of the following must be specified
 */
export interface InsertContentTarget {
  /** Heading text to target (e.g., "## Today's Tasks") */
  heading?: string;

  /** Block reference ID to target (e.g., "^block-id") */
  blockRef?: string;

  /** Text pattern to search for */
  pattern?: string;

  /** Specific line number (1-based) */
  lineNumber?: number;
}

/**
 * Input interface for move_items tool
 * @see src/index.ts line 733 for JSON Schema definition
 */
export interface MoveItemsInput {
  /** Array of items to move (use this OR item, not both) */
  items?: MoveItemType[];

  /** Single item path to move (use this OR items, not both) */
  item?: string;

  /** Target folder path (relative to vault root) - required */
  destination: string;

  /** Create destination folder if it doesn't exist (default: false) */
  createDestination?: boolean;

  /** Overwrite existing files in destination (default: false) */
  overwrite?: boolean;

  /** When moving folders, merge with existing folder of same name (default: false) */
  mergeFolders?: boolean;
}

/**
 * Item structure for move_items tool batch operations
 */
export interface MoveItemType {
  /** Path to note or folder */
  path: string;

  /** Item type (auto-detected if not specified) */
  type?: 'note' | 'folder';
}

export const CONTENT_TYPES = {
  ARTICLE: 'Article',
  DAILY_NOTE: 'Daily Note',
  RECIPE: 'Recipe',
  MEDICAL: 'Medical',
  PLANNING: 'Planning',
  REFERENCE: 'Reference',
  WRITING: 'Writing'
} as const;

export const FOLDERS = {
  META: '00 - Meta',
  FLEETING: '05 - Fleeting Notes',
  PROJECTS: '10 - Projects',
  AREAS: '20 - Areas',
  RESOURCES: '30 - Resources',
  ARCHIVES: '40 - Archives'
} as const;