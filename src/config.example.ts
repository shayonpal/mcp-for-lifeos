import { LifeOSConfig } from './types.js';

export const LIFEOS_CONFIG: LifeOSConfig = {
  vaultPath: '/path/to/your/vault/LifeOS (iCloud)',
  attachmentsPath: '/path/to/your/vault/LifeOS (iCloud)/00 - Meta/Attachments',
  templatesPath: '/path/to/your/vault/LifeOS (iCloud)/00 - Meta/Templates',
  dailyNotesPath: '/path/to/your/vault/LifeOS (iCloud)/20 - Areas/21 - Myself/Journals/Daily'
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
  
  // Special people tags - customize for your vault
  PEOPLE_MAPPINGS: {
    'Person1': { people: ['[[Person1]]'], tags: ['person1'] },
    'Person2': { people: ['[[Person2]]'], tags: ['person2'] },
    'Person3': { people: ['[[Person3]]'], tags: ['person3'] },
    'Person4': { people: ['[[Person4]]'], tags: ['person4'] }
  }
};