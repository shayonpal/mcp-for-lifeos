/**
 * Links Module
 *
 * Provides link scanning, updating, and Obsidian-specific link utilities.
 */

export { LinkScanner } from './link-scanner.js';
export type {
  LinkScanOptions,
  LinkReference,
  LinkScanResult
} from './link-scanner.js';

export { updateVaultLinks } from './link-updater.js';
export type {
  LinkUpdateMode,
  LinkRenderResult,
  LinkCommitInput,
  LinkUpdateResult,
  LinkUpdateFailure
} from './link-updater.js';

export { ObsidianLinks } from './obsidian-links.js';

export { buildNewLinkText, updateNoteLinks } from './link-text-builder.js';
