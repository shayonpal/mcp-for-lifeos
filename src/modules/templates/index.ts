/**
 * Templates Module
 *
 * Handles Obsidian template discovery, processing, and Templater syntax support.
 */

// Template Manager - Discovery and caching
export { TemplateManager } from './template-manager.js';

// Template Engine - Basic template processing
export { TemplateEngine, type TemplateInfo } from './template-engine.js';

// Dynamic Template Engine - Advanced template processing with metadata injection
export { DynamicTemplateEngine } from './template-engine-dynamic.js';

// Template Parser - Templater syntax processing
export { TemplateParser, type TemplateContext } from './template-parser.js';
