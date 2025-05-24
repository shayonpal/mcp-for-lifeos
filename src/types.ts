export interface LifeOSConfig {
  vaultPath: string;
  attachmentsPath: string;
  templatesPath: string;
  dailyNotesPath: string;
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