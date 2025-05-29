import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { LIFEOS_CONFIG } from './config.js';
import { YAMLFrontmatter } from './types.js';
import matter from 'gray-matter';
import { format } from 'date-fns';

export interface TemplateInfo {
  name: string;
  path: string;
  description: string;
  targetFolder?: string;
  contentType?: string;
  key: string;
}

export class DynamicTemplateEngine {
  private static templateCache: Map<string, TemplateInfo> = new Map();
  private static lastScanTime: number = 0;
  private static CACHE_TTL = 30000; // 30 seconds cache

  /**
   * Scan the templates directory and discover all available templates
   */
  static scanTemplates(): Map<string, TemplateInfo> {
    const now = Date.now();
    
    // Return cached templates if recent scan
    if (now - this.lastScanTime < this.CACHE_TTL && this.templateCache.size > 0) {
      return this.templateCache;
    }

    console.error('Scanning templates directory for changes...');
    this.templateCache.clear();

    try {
      const templateFiles = readdirSync(LIFEOS_CONFIG.templatesPath)
        .filter(file => file.endsWith('.md'))
        .filter(file => existsSync(join(LIFEOS_CONFIG.templatesPath, file)));

      for (const file of templateFiles) {
        try {
          const templateInfo = this.analyzeTemplate(file);
          if (templateInfo) {
            this.templateCache.set(templateInfo.key, templateInfo);
          }
        } catch (error) {
          console.error(`Error analyzing template ${file}:`, error);
          // Continue with other templates
        }
      }

      this.lastScanTime = now;
      console.error(`Discovered ${this.templateCache.size} templates`);
    } catch (error) {
      console.error('Error scanning templates directory:', error);
    }

    return this.templateCache;
  }

  /**
   * Analyze a template file to extract metadata and infer properties
   */
  private static analyzeTemplate(filename: string): TemplateInfo | null {
    const filePath = join(LIFEOS_CONFIG.templatesPath, filename);
    
    try {
      const content = readFileSync(filePath, 'utf-8');
      
      // Check if the file contains Templater syntax in frontmatter
      const hasTemplaterSyntax = this.hasTemplaterSyntaxInFrontmatter(content);
      
      let frontmatter: YAMLFrontmatter = {};
      let bodyContent = content;
      
      if (hasTemplaterSyntax) {
        // Handle templates with Templater syntax - extract what we can safely
        console.error(`Template ${filename} contains Templater syntax, using fallback parsing`);
        frontmatter = this.extractSafeFrontmatter(content);
        bodyContent = this.extractBodyContent(content);
      } else {
        // Standard YAML parsing for templates without Templater syntax
        try {
          const parsed = matter(content);
          frontmatter = parsed.data as YAMLFrontmatter;
          bodyContent = parsed.content;
        } catch (yamlError) {
          console.warn(`YAML parsing failed for ${filename}, falling back to safe parsing:`, yamlError);
          frontmatter = this.extractSafeFrontmatter(content);
          bodyContent = this.extractBodyContent(content);
        }
      }

      // Generate template key from filename
      const key = this.generateTemplateKey(filename);
      
      // Extract or infer template properties
      const name = this.inferTemplateName(filename, frontmatter);
      const description = this.inferTemplateDescription(filename, frontmatter, bodyContent);
      const targetFolder = this.inferTargetFolder(filename, frontmatter);
      const contentType = this.inferContentType(filename, frontmatter);

      return {
        name,
        path: filename,
        description,
        targetFolder,
        contentType,
        key
      };
    } catch (error) {
      console.error(`Failed to analyze template ${filename}:`, error);
      // Return a basic template info even on failure to ensure template is still discoverable
      const key = this.generateTemplateKey(filename);
      return {
        name: this.inferTemplateName(filename, {}),
        path: filename,
        description: `Template for ${key} notes (parsing failed, using fallback)`,
        targetFolder: '30 - Resources',
        contentType: 'Reference',
        key
      };
    }
  }

  /**
   * Check if content contains Templater syntax in the frontmatter section
   */
  private static hasTemplaterSyntaxInFrontmatter(content: string): boolean {
    // Extract frontmatter section (between --- markers)
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return false;
    
    const frontmatterSection = frontmatterMatch[1];
    
    // Check for Templater syntax patterns
    const templaterPatterns = [
      /<%.*?%>/,           // Basic Templater syntax
      /tp\.file\./,        // Templater file operations
      /moment\(/,          // Date/time operations
      /\$\{.*?\}/,         // Template literals
    ];
    
    return templaterPatterns.some(pattern => pattern.test(frontmatterSection));
  }

  /**
   * Extract safe frontmatter properties that don't contain Templater syntax
   */
  private static extractSafeFrontmatter(content: string): YAMLFrontmatter {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontmatterMatch) return {};
    
    const frontmatterSection = frontmatterMatch[1];
    const safeFrontmatter: YAMLFrontmatter = {};
    
    // Parse line by line, skipping lines with Templater syntax
    const lines = frontmatterSection.split('\n');
    
    for (const line of lines) {
      // Skip empty lines and comments
      if (!line.trim() || line.trim().startsWith('#')) continue;
      
      // Skip lines with Templater syntax
      if (line.includes('<%') || line.includes('%>') || line.includes('tp.file') || line.includes('moment(')) {
        continue;
      }
      
      // Try to parse simple key-value pairs
      const match = line.match(/^(\s*)([^:]+):\s*(.*)$/);
      if (match) {
        const [, indent, key, value] = match;
        const trimmedKey = key.trim();
        const trimmedValue = value.trim();
        
        // Only include safe, static values
        if (!trimmedValue.includes('<%') && !trimmedValue.includes('%>')) {
          // Handle basic types
          if (trimmedValue.startsWith('"') && trimmedValue.endsWith('"')) {
            safeFrontmatter[trimmedKey] = trimmedValue.slice(1, -1);
          } else if (trimmedValue.startsWith("'") && trimmedValue.endsWith("'")) {
            safeFrontmatter[trimmedKey] = trimmedValue.slice(1, -1);
          } else if (trimmedValue === 'true' || trimmedValue === 'false') {
            safeFrontmatter[trimmedKey] = trimmedValue === 'true';
          } else if (/^\d+$/.test(trimmedValue)) {
            safeFrontmatter[trimmedKey] = parseInt(trimmedValue, 10);
          } else if (trimmedValue.startsWith('[') && trimmedValue.endsWith(']')) {
            // Skip complex arrays for safety
            continue;
          } else {
            safeFrontmatter[trimmedKey] = trimmedValue;
          }
        }
      }
    }
    
    return safeFrontmatter;
  }

  /**
   * Extract body content (everything after frontmatter)
   */
  private static extractBodyContent(content: string): string {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
    if (frontmatterMatch) {
      return frontmatterMatch[2] || '';
    }
    return content;
  }

  /**
   * Generate a template key from filename
   */
  private static generateTemplateKey(filename: string): string {
    return basename(filename, '.md')
      .replace(/^tpl-/, '') // Remove tpl- prefix
      .toLowerCase()
      .replace(/[^a-z0-9]/g, ''); // Keep only alphanumeric
  }

  /**
   * Infer template name from filename and frontmatter
   */
  private static inferTemplateName(filename: string, frontmatter: YAMLFrontmatter): string {
    // Check if frontmatter has a template name
    if (frontmatter.templateName) return frontmatter.templateName as string;
    if (frontmatter.name) return frontmatter.name as string;

    // Generate from filename
    const baseName = basename(filename, '.md')
      .replace(/^tpl-/, '') // Remove tpl- prefix
      .replace(/[-_]/g, ' ') // Replace dashes/underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Title case

    return baseName;
  }

  /**
   * Infer template description
   */
  private static inferTemplateDescription(filename: string, frontmatter: YAMLFrontmatter, content: string): string {
    // Check frontmatter for description
    if (frontmatter.description) return frontmatter.description as string;
    if (frontmatter.templateDescription) return frontmatter.templateDescription as string;

    // Generate description based on filename and content analysis
    const key = this.generateTemplateKey(filename);
    
    // Predefined descriptions for known patterns
    const descriptions: Record<string, string> = {
      'restaurant': 'Template for restaurant notes with cuisine, location, and ratings',
      'article': 'Template for article notes with source and author',
      'person': 'Template for person/contact notes with relationships',
      'daily': 'Template for daily journal entries',
      'fleeting': 'Template for quick capture and temporary thoughts',
      'reference': 'Template for general reference notes',
      'medicine': 'Template for medicine/medication notes',
      'application': 'Template for application/software reviews',
      'book': 'Template for book notes and reviews',
      'place': 'Template for travel and places to visit',
      'moc': 'Template for organizing and linking related notes'
    };

    if (descriptions[key]) {
      return descriptions[key];
    }

    // Analyze content for clues
    const contentLower = content.toLowerCase();
    if (contentLower.includes('restaurant') || contentLower.includes('cuisine')) {
      return 'Template for restaurant and dining notes';
    }
    if (contentLower.includes('article') || contentLower.includes('source')) {
      return 'Template for article and reading notes';
    }
    if (contentLower.includes('person') || contentLower.includes('contact')) {
      return 'Template for person and relationship notes';
    }

    return `Template for ${key} notes`;
  }

  /**
   * Infer target folder from template analysis
   */
  private static inferTargetFolder(filename: string, frontmatter: YAMLFrontmatter): string | undefined {
    // Check frontmatter for explicit target
    if (frontmatter.targetFolder) return frontmatter.targetFolder as string;
    if (frontmatter.folder) return frontmatter.folder as string;

    const key = this.generateTemplateKey(filename);
    const category = frontmatter.category as string;
    const contentType = frontmatter['content type'] as string | string[];

    // Infer from content type and category
    const folderMappings: Record<string, string> = {
      'restaurant': '30 - Resources/Restaurants',
      'article': '30 - Resources/Reading',
      'person': '20 - Areas/22 - Relationships',
      'daily': '20 - Areas/21 - Myself/Journals/Daily',
      'fleeting': '05 - Fleeting Notes',
      'medicine': '20 - Areas/23 - Health',
      'application': '30 - Resources/Tools & Systems',
      'book': '30 - Resources/Reading',
      'place': '10 - Projects',
      'moc': '00 - Meta/MOCs'
    };

    if (folderMappings[key]) {
      return folderMappings[key];
    }

    // Infer from category
    if (category === 'Restaurant') return '30 - Resources/Restaurants';
    if (category === 'Application') return '30 - Resources/Tools & Systems';
    if (category === 'Relationships') return '20 - Areas/22 - Relationships';

    // Infer from content type
    const contentTypeStr = Array.isArray(contentType) ? contentType[0] : contentType;
    if (contentTypeStr === 'Daily Note') return '20 - Areas/21 - Myself/Journals/Daily';
    if (contentTypeStr === 'Medical') return '20 - Areas/23 - Health';
    if (contentTypeStr === 'Article') return '30 - Resources/Reading';
    if (contentTypeStr === 'Planning') return '10 - Projects';

    // Default fallback
    return '30 - Resources';
  }

  /**
   * Infer content type from template
   */
  private static inferContentType(filename: string, frontmatter: YAMLFrontmatter): string | undefined {
    const contentType = frontmatter['content type'];
    if (contentType) {
      return Array.isArray(contentType) ? contentType[0] : contentType as string;
    }

    const key = this.generateTemplateKey(filename);
    const contentTypeMappings: Record<string, string> = {
      'daily': 'Daily Note',
      'article': 'Article',
      'medicine': 'Medical',
      'place': 'Planning',
      'moc': 'MOC',
      'fleeting': 'Fleeting'
    };

    return contentTypeMappings[key] || 'Reference';
  }

  /**
   * Get all available templates (with fresh scan)
   */
  static getAllTemplates(): TemplateInfo[] {
    const templates = this.scanTemplates();
    return Array.from(templates.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Get a specific template by key
   */
  static getTemplate(templateKey: string): TemplateInfo | undefined {
    const templates = this.scanTemplates();
    return templates.get(templateKey.toLowerCase());
  }

  /**
   * Force refresh of template cache
   */
  static refreshTemplates(): void {
    this.templateCache.clear();
    this.lastScanTime = 0;
    this.scanTemplates();
  }

  /**
   * Read template content with error handling
   */
  static readTemplateContent(templatePath: string): { frontmatter: YAMLFrontmatter; content: string } {
    const fullPath = join(LIFEOS_CONFIG.templatesPath, templatePath);
    
    if (!existsSync(fullPath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    try {
      const templateContent = readFileSync(fullPath, 'utf-8');
      
      // Check if the file contains Templater syntax in frontmatter
      const hasTemplaterSyntax = this.hasTemplaterSyntaxInFrontmatter(templateContent);
      
      if (hasTemplaterSyntax) {
        // Handle templates with Templater syntax - return raw content for processing
        console.error(`Template ${templatePath} contains Templater syntax, returning raw content for processing`);
        const frontmatterMatch = templateContent.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
        if (frontmatterMatch) {
          return {
            frontmatter: {}, // Will be populated during Templater processing
            content: templateContent // Return full content including frontmatter for Templater processing
          };
        } else {
          return {
            frontmatter: {},
            content: templateContent
          };
        }
      } else {
        // Standard YAML parsing for templates without Templater syntax
        const parsed = matter(templateContent);
        return {
          frontmatter: parsed.data as YAMLFrontmatter,
          content: parsed.content
        };
      }
    } catch (error) {
      console.error(`Error reading template ${templatePath}:`, error);
      throw new Error(`Failed to parse template: ${templatePath}`);
    }
  }

  /**
   * Process template with dynamic content
   */
  static processTemplate(
    templateKey: string, 
    noteTitle: string, 
    customData: Record<string, any> = {}
  ): { frontmatter: YAMLFrontmatter; content: string; targetFolder?: string } {
    const template = this.getTemplate(templateKey);
    
    if (!template) {
      throw new Error(`Template not found: ${templateKey}. Available templates: ${this.getAllTemplates().map(t => t.key).join(', ')}`);
    }

    const { frontmatter, content } = this.readTemplateContent(template.path);

    // Check if this is a Templater template (content includes the full template)
    const hasTemplaterSyntax = this.hasTemplaterSyntaxInFrontmatter(content);
    
    if (hasTemplaterSyntax) {
      // For Templater templates, process the entire content and then parse
      const processedFullContent = this.processTemplaterVariables(content, noteTitle, customData);
      
      try {
        // Now try to parse the processed content
        const parsed = matter(processedFullContent);
        return {
          frontmatter: parsed.data as YAMLFrontmatter,
          content: parsed.content,
          targetFolder: template.targetFolder
        };
      } catch (error) {
        console.warn(`Failed to parse processed Templater template ${template.path}, using fallback`);
        // Fallback: extract what we can from the processed content
        return {
          frontmatter: {
            title: noteTitle,
            'content type': template.contentType || 'Reference',
            tags: ['template-processed']
          },
          content: processedFullContent,
          targetFolder: template.targetFolder
        };
      }
    } else {
      // For regular templates, process frontmatter and content separately
      const processedFrontmatter = this.processTemplaterVariables(frontmatter, noteTitle, customData);
      const processedContent = this.processTemplaterVariables(content, noteTitle, customData);

      return {
        frontmatter: processedFrontmatter,
        content: processedContent,
        targetFolder: template.targetFolder
      };
    }
  }

  /**
   * Process Templater variables (copied from original implementation)
   */
  private static processTemplaterVariables(
    input: any, 
    noteTitle: string, 
    customData: Record<string, any>
  ): any {
    if (typeof input === 'string') {
      let processed = input
        .replace(/<% tp\.file\.title %>/g, noteTitle)
        .replace(/<% moment\(\)\.format\(['"]YYYY-MM-DD['"]\) %>/g, format(new Date(), 'yyyy-MM-dd'))
        .replace(/<% moment\(\)\.format\(['"]MMMM DD, YYYY['"]\) %>/g, format(new Date(), 'MMMM dd, yyyy'))
        .replace(/<%.*?moment\(tp\.file\.title,['"]YYYY-MM-DD['"]\)\.format\(['"]YYYY-MM-DD['"]\).*?%>/g, noteTitle)
        .replace(/<%.*?moment\(tp\.file\.title,['"]YYYY-MM-DD['"]\)\.format\(['"]MMMM DD, YYYY['"]\).*?%>/g, 
          this.formatDateTitle(noteTitle))
        .replace(/\{\{title\}\}/g, noteTitle);

      Object.entries(customData).forEach(([key, value]) => {
        const placeholder = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        processed = processed.replace(placeholder, String(value));
      });

      return processed;
    } else if (Array.isArray(input)) {
      return input.map(item => this.processTemplaterVariables(item, noteTitle, customData));
    } else if (typeof input === 'object' && input !== null) {
      const processed: any = {};
      Object.entries(input).forEach(([key, value]) => {
        processed[key] = this.processTemplaterVariables(value, noteTitle, customData);
      });
      return processed;
    }

    return input;
  }

  private static formatDateTitle(title: string): string {
    try {
      const date = new Date(title);
      if (!isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(title)) {
        return format(date, 'MMMM dd, yyyy');
      }
    } catch (error) {
      // Not a date, return as-is
    }
    return title;
  }

  /**
   * Create note from template with dynamic discovery
   */
  static createNoteFromTemplate(
    templateKey: string,
    noteTitle: string,
    customData: Record<string, any> = {}
  ): { frontmatter: YAMLFrontmatter; content: string; targetFolder?: string } {
    try {
      return this.processTemplate(templateKey, noteTitle, customData);
    } catch (error) {
      console.error(`Failed to create note from template ${templateKey}:`, error);
      
      // Fallback to basic note structure
      return {
        frontmatter: {
          title: noteTitle,
          'content type': 'Reference',
          tags: ['template-fallback']
        },
        content: `# ${noteTitle}\n\n`,
        targetFolder: '05 - Fleeting Notes'
      };
    }
  }
}