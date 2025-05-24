import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
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
}

export class TemplateEngine {
  private static templates: Map<string, TemplateInfo> = new Map();

  static {
    // Initialize template mappings
    this.templates.set('restaurant', {
      name: 'Restaurant',
      path: 'tpl-restaurant.md',
      description: 'Template for restaurant notes with cuisine, location, and ratings',
      targetFolder: '30 - Resources/Restaurants',
      contentType: 'Reference'
    });

    this.templates.set('article', {
      name: 'Article',
      path: 'Article.md',
      description: 'Template for article notes with source and author',
      targetFolder: '30 - Resources/Reading',
      contentType: 'Article'
    });

    this.templates.set('person', {
      name: 'Person',
      path: 'tpl-person.md',
      description: 'Template for person/contact notes with relationships',
      targetFolder: '20 - Areas/22 - Relationships',
      contentType: 'MOC'
    });

    this.templates.set('reference', {
      name: 'Reference',
      path: 'tpl-reference.md',
      description: 'Template for general reference notes',
      targetFolder: '30 - Resources',
      contentType: 'Reference'
    });

    this.templates.set('fleeting', {
      name: 'Fleeting Note',
      path: 'tpl-fleeting.md',
      description: 'Template for quick capture and temporary thoughts',
      targetFolder: '05 - Fleeting Notes',
      contentType: 'Fleeting'
    });

    this.templates.set('daily', {
      name: 'Daily Note',
      path: 'tpl-daily.md',
      description: 'Template for daily journal entries',
      targetFolder: '20 - Areas/21 - Myself/Journals/Daily',
      contentType: 'Daily Note'
    });

    this.templates.set('moc', {
      name: 'Map of Content',
      path: 'tpl-moc.md',
      description: 'Template for organizing and linking related notes',
      targetFolder: '00 - Meta/MOCs',
      contentType: 'MOC'
    });

    this.templates.set('application', {
      name: 'Application',
      path: 'Application.md',
      description: 'Template for application/software reviews',
      targetFolder: '30 - Resources/Tools & Systems',
      contentType: 'Reference'
    });

    this.templates.set('medicine', {
      name: 'Medicine',
      path: 'Medicine.md',
      description: 'Template for medicine/medication notes',
      targetFolder: '20 - Areas/23 - Health',
      contentType: 'Medical'
    });

    this.templates.set('book', {
      name: 'Book',
      path: 'Books.md',
      description: 'Template for book notes and reviews',
      targetFolder: '30 - Resources/Reading',
      contentType: 'Reference'
    });

    this.templates.set('place', {
      name: 'Place to Visit',
      path: 'Place To Visit.md',
      description: 'Template for travel and places to visit',
      targetFolder: '10 - Projects',
      contentType: 'Planning'
    });
  }

  static getAllTemplates(): TemplateInfo[] {
    return Array.from(this.templates.values());
  }

  static getTemplate(templateKey: string): TemplateInfo | undefined {
    return this.templates.get(templateKey.toLowerCase());
  }

  static readTemplateContent(templatePath: string): { frontmatter: YAMLFrontmatter; content: string } {
    const fullPath = join(LIFEOS_CONFIG.templatesPath, templatePath);
    
    if (!existsSync(fullPath)) {
      throw new Error(`Template not found: ${templatePath}`);
    }

    try {
      const templateContent = readFileSync(fullPath, 'utf-8');
      const parsed = matter(templateContent);
      
      return {
        frontmatter: parsed.data as YAMLFrontmatter,
        content: parsed.content
      };
    } catch (error) {
      console.error(`Error reading template ${templatePath}:`, error);
      throw new Error(`Failed to parse template: ${templatePath}`);
    }
  }

  static processTemplate(
    templateKey: string, 
    noteTitle: string, 
    customData: Record<string, any> = {}
  ): { frontmatter: YAMLFrontmatter; content: string; targetFolder?: string } {
    const template = this.getTemplate(templateKey);
    
    if (!template) {
      throw new Error(`Template not found: ${templateKey}`);
    }

    const { frontmatter, content } = this.readTemplateContent(template.path);

    // Process Templater variables
    const processedFrontmatter = this.processTemplaterVariables(frontmatter, noteTitle, customData);
    const processedContent = this.processTemplaterVariables(content, noteTitle, customData);

    return {
      frontmatter: processedFrontmatter,
      content: processedContent,
      targetFolder: template.targetFolder
    };
  }

  private static processTemplaterVariables(
    input: any, 
    noteTitle: string, 
    customData: Record<string, any>
  ): any {
    if (typeof input === 'string') {
      // Process common Templater variables
      let processed = input
        .replace(/<% tp\.file\.title %>/g, noteTitle)
        .replace(/<% moment\(\)\.format\(['"]YYYY-MM-DD['"]\) %>/g, format(new Date(), 'yyyy-MM-dd'))
        .replace(/<% moment\(\)\.format\(['"]MMMM DD, YYYY['"]\) %>/g, format(new Date(), 'MMMM dd, yyyy'))
        .replace(/<%.*?moment\(tp\.file\.title,['"]YYYY-MM-DD['"]\)\.format\(['"]YYYY-MM-DD['"]\).*?%>/g, noteTitle)
        .replace(/<%.*?moment\(tp\.file\.title,['"]YYYY-MM-DD['"]\)\.format\(['"]MMMM DD, YYYY['"]\).*?%>/g, 
          this.formatDateTitle(noteTitle))
        .replace(/\{\{title\}\}/g, noteTitle);

      // Process custom data replacements
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
    // Try to parse title as date (YYYY-MM-DD format)
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

  static inferTemplateFromContext(
    noteTitle: string, 
    contentType?: string, 
    category?: string,
    keywords?: string[]
  ): string | undefined {
    const title = noteTitle.toLowerCase();
    const content = contentType?.toLowerCase();
    const cat = category?.toLowerCase();

    // Direct content type matches
    if (content === 'daily note') return 'daily';
    if (content === 'article') return 'article';
    if (content === 'reference' && cat === 'restaurant') return 'restaurant';
    if (content === 'medical') return 'medicine';
    if (content === 'planning') return 'place';
    if (content === 'moc') return 'person';

    // Category-based inference
    if (cat === 'restaurant') return 'restaurant';
    if (cat === 'application') return 'application';
    if (cat === 'relationships') return 'person';

    // Title-based inference
    if (title.includes('restaurant') || title.includes('cafe') || title.includes('bar')) return 'restaurant';
    if (title.includes('person') || title.includes('contact')) return 'person';
    if (title.includes('app') || title.includes('application') || title.includes('software')) return 'application';
    if (title.includes('book') || title.includes('reading')) return 'book';
    if (title.includes('medicine') || title.includes('medication') || title.includes('drug')) return 'medicine';
    if (title.includes('place') || title.includes('visit') || title.includes('travel')) return 'place';

    // Keyword-based inference
    if (keywords) {
      const keywordStr = keywords.join(' ').toLowerCase();
      if (keywordStr.includes('restaurant') || keywordStr.includes('food')) return 'restaurant';
      if (keywordStr.includes('person') || keywordStr.includes('contact')) return 'person';
      if (keywordStr.includes('article') || keywordStr.includes('reading')) return 'article';
      if (keywordStr.includes('reference')) return 'reference';
    }

    // Default to fleeting note for unclear cases
    return 'fleeting';
  }

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