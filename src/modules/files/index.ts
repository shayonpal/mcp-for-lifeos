/**
 * Files Module - Barrel Export
 *
 * Central export point for all file operations (MCP-144)
 */

// File I/O with iCloud retry logic
export {
  readFileWithRetry,
  writeFileWithRetry,
  type AtomicWriteOptions,
} from "./file-io.js";

// Note CRUD operations
export {
  readNote,
  writeNote,
  createNote,
  updateNote,
} from "./note-crud.js";

// Daily note service
export {
  getDailyNote,
  createDailyNote,
} from "./daily-note-service.js";

// Content insertion
export { insertContent } from "./content-insertion.js";

// YAML operations
export {
  getYamlPropertyValues,
  getAllYamlProperties,
} from "./yaml-operations.js";

// Folder operations
export { moveItem } from "./folder-operations.js";

// VaultUtils - main utility class (will be moved here)
export { VaultUtils } from "./vault-utils.js";
