import { format, parse } from 'date-fns';
import { logger } from '../../shared/index.js';

export interface TemplateContext {
  title: string;           // File title (usually the date for daily notes)
  date: Date;             // Date object for the note
  folder?: string;        // Folder path where the note will be created
  [key: string]: any;     // Additional context variables
}

export class TemplateParser {
  /**
   * Process a template string with Templater variables
   */
  public async processTemplate(templateContent: string, context: TemplateContext): Promise<string> {
    let processed = templateContent;
    
    // Process all Templater commands
    processed = await this.processTemplaterCommands(processed, context);
    
    // Ensure no unprocessed Templater syntax remains
    if (processed.includes('<%') && processed.includes('%>')) {
      logger.warn('Template contains unprocessed Templater syntax');
    }
    
    return processed;
  }

  /**
   * Process Templater commands in the template
   */
  private async processTemplaterCommands(content: string, context: TemplateContext): Promise<string> {
    let processed = content;
    
    // Process tp.file.title
    processed = processed.replace(/<% tp\.file\.title %>/g, context.title);
    
    // Process moment-based date formatting
    // Pattern: <% moment(tp.file.title,'YYYY-MM-DD').format("FORMAT") %>
    processed = processed.replace(
      /<% moment\(tp\.file\.title,\s*['"]YYYY-MM-DD['"]\)\.format\(['"]([^'"]+)['"]\) %>/g,
      (match, dateFormat) => {
        try {
          // Parse the title as a date
          const titleDate = parse(context.title, 'yyyy-MM-dd', new Date());
          
          // Convert moment format to date-fns format
          const convertedFormat = this.convertMomentToDateFns(dateFormat);
          
          // Format the date
          return format(titleDate, convertedFormat);
        } catch (error) {
          logger.error(`Error processing date format: ${error}`);
          return context.title; // Fallback to title
        }
      }
    );
    
    // Process tp.date.now() with optional offset
    processed = processed.replace(
      /<% tp\.date\.now\(["']([^"']+)["'](?:,\s*(-?\d+))?\) %>/g,
      (match, dateFormat, offset) => {
        try {
          const date = new Date(context.date);
          if (offset) {
            date.setDate(date.getDate() + parseInt(offset));
          }
          
          const convertedFormat = this.convertMomentToDateFns(dateFormat);
          return format(date, convertedFormat);
        } catch (error) {
          logger.error(`Error processing tp.date.now: ${error}`);
          return format(context.date, 'yyyy-MM-dd');
        }
      }
    );
    
    // Process tp.date.yesterday
    processed = processed.replace(
      /<% tp\.date\.yesterday\(["']([^"']+)["']\) %>/g,
      (match, dateFormat) => {
        try {
          const yesterday = new Date(context.date);
          yesterday.setDate(yesterday.getDate() - 1);
          
          const convertedFormat = this.convertMomentToDateFns(dateFormat);
          return format(yesterday, convertedFormat);
        } catch (error) {
          logger.error(`Error processing tp.date.yesterday: ${error}`);
          return format(new Date(), 'yyyy-MM-dd');
        }
      }
    );
    
    // Process tp.date.tomorrow
    processed = processed.replace(
      /<% tp\.date\.tomorrow\(["']([^"']+)["']\) %>/g,
      (match, dateFormat) => {
        try {
          const tomorrow = new Date(context.date);
          tomorrow.setDate(tomorrow.getDate() + 1);
          
          const convertedFormat = this.convertMomentToDateFns(dateFormat);
          return format(tomorrow, convertedFormat);
        } catch (error) {
          logger.error(`Error processing tp.date.tomorrow: ${error}`);
          return format(new Date(), 'yyyy-MM-dd');
        }
      }
    );
    
    // Process tp.file.creation_date
    processed = processed.replace(
      /<% tp\.file\.creation_date\(["']([^"']+)["']\) %>/g,
      (match, dateFormat) => {
        try {
          const convertedFormat = this.convertMomentToDateFns(dateFormat);
          return format(context.date, convertedFormat);
        } catch (error) {
          logger.error(`Error processing tp.file.creation_date: ${error}`);
          return format(context.date, 'yyyy-MM-dd');
        }
      }
    );
    
    // Process tp.file.folder
    processed = processed.replace(/<% tp\.file\.folder(?:\([^)]*\))? %>/g, context.folder || '');
    
    // Process tp.file.path
    processed = processed.replace(/<% tp\.file\.path(?:\([^)]*\))? %>/g, `${context.folder}/${context.title}.md`);
    
    return processed;
  }

  /**
   * Convert Moment.js format strings to date-fns format
   * This handles the most common cases used in templates
   */
  private convertMomentToDateFns(momentFormat: string): string {
    // Common conversions
    const conversions: Record<string, string> = {
      'YYYY': 'yyyy',
      'YY': 'yy',
      'MMMM': 'LLLL',    // Full month name
      'MMM': 'LLL',       // Short month name
      'MM': 'MM',         // Two digit month
      'M': 'M',           // One or two digit month
      'DD': 'dd',         // Two digit day
      'D': 'd',           // One or two digit day
      'Do': 'do',         // Day with ordinal
      'dddd': 'EEEE',     // Full weekday name
      'ddd': 'EEE',       // Short weekday name
      'HH': 'HH',         // 24-hour two digit hour
      'H': 'H',           // 24-hour one or two digit hour
      'hh': 'hh',         // 12-hour two digit hour
      'h': 'h',           // 12-hour one or two digit hour
      'mm': 'mm',         // Two digit minute
      'm': 'm',           // One or two digit minute
      'ss': 'ss',         // Two digit second
      's': 's',           // One or two digit second
      'A': 'a',           // AM/PM uppercase
      'a': 'aaa',         // am/pm lowercase
    };
    
    let converted = momentFormat;
    
    // Replace from longest to shortest to avoid conflicts
    const sortedKeys = Object.keys(conversions).sort((a, b) => b.length - a.length);
    
    for (const key of sortedKeys) {
      // Use a regex to replace whole words only
      const regex = new RegExp(`\\b${key}\\b`, 'g');
      converted = converted.replace(regex, conversions[key]);
    }
    
    return converted;
  }

  /**
   * Check if a template contains Templater syntax
   */
  public hasTemplaterSyntax(content: string): boolean {
    return content.includes('<%') && content.includes('%>');
  }

  /**
   * Extract all Templater commands from a template (for debugging/analysis)
   */
  public extractTemplaterCommands(content: string): string[] {
    const commands: string[] = [];
    const regex = /<%([^%]+)%>/g;
    let match;
    
    while ((match = regex.exec(content)) !== null) {
      commands.push(match[0]);
    }
    
    return commands;
  }
}