import { LifeOSConfig } from './types.js';

export const LIFEOS_CONFIG: LifeOSConfig = {
  vaultPath: '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)',
  attachmentsPath: '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)/00 - Meta/Attachments',
  templatesPath: '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)/00 - Meta/Templates',
  dailyNotesPath: '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)/20 - Areas/21 - Myself/Journals/Daily'
};

export const YAML_RULES = {
  // Never edit these fields - managed by Linter plugin
  AUTO_MANAGED_FIELDS: ['date created', 'date modified'],
  
  // URL field naming
  URL_FIELD: 'source',
  
  // Location format
  LOCATION_FORMAT: {
    CANADA: 'Canada [CA]',
    INDIA: 'India [IN]'
  },
  
  // Content type mappings
  CONTENT_TYPE_MAPPINGS: {
    'Article': 'Article',
    'Daily Note': 'Daily Note',
    'Recipe': 'Recipe',
    'Medical': 'Medical',
    'Planning': 'Planning',
    'Reference': 'Reference',
    'Writing': ['Writing']
  },
  
  // Special people tags
  PEOPLE_MAPPINGS: {
    'Sugar': { people: ['[[Sugar]]'], tags: ['sugar'] },
    'Mishti': { people: ['[[Mishti]]'], tags: ['mishti'] },
    'Sakshi': { people: ['[[Sakshi Chopra|Sakshi]]'], tags: ['sakshi'] },
    'Vidushi': { people: ['[[Vidushi Soni|Vidushi]]'], tags: ['vidushi'] }
  }
};