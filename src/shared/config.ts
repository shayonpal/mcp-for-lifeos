import { LifeOSConfig } from './types.js';

/**
 * LifeOS Configuration with Environment Variable Support
 *
 * Enables test isolation by reading vault paths from environment variables.
 * Falls back to production paths when env vars are not set.
 *
 * Environment Variables (for test/dev overrides):
 * - LIFEOS_VAULT_PATH: Override vault root path
 * - LIFEOS_ATTACHMENTS_PATH: Override attachments path
 * - LIFEOS_TEMPLATES_PATH: Override templates path
 * - LIFEOS_DAILY_NOTES_PATH: Override daily notes path
 * - LIFEOS_YAML_RULES_PATH: Override YAML rules path
 */

export const LIFEOS_CONFIG: LifeOSConfig = {
  vaultPath: process.env.LIFEOS_VAULT_PATH || '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)',
  attachmentsPath: process.env.LIFEOS_ATTACHMENTS_PATH || '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)/00 - Meta/Attachments',
  templatesPath: process.env.LIFEOS_TEMPLATES_PATH || '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)/00 - Meta/Templates',
  dailyNotesPath: process.env.LIFEOS_DAILY_NOTES_PATH || '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)/20 - Areas/21 - Myself/Journals/Daily',
  yamlRulesPath: process.env.LIFEOS_YAML_RULES_PATH || '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)/00 - Meta/System/YAML Rules for LifeOS Vault.md',
  customInstructions: undefined
};;

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