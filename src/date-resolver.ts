import { format, parse, addDays, subDays, startOfWeek, endOfWeek, isValid } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { logger } from './logger.js';

export class DateResolver {
  private userTimezone: string;
  
  constructor(timezone?: string) {
    // Try to detect timezone, fallback to UTC
    this.userTimezone = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    logger.info(`DateResolver initialized with timezone: ${this.userTimezone}`);
  }

  /**
   * Parse a date string or relative date into a Date object
   * Handles: today, yesterday, tomorrow, YYYY-MM-DD, and relative formats
   */
  public parseDate(input: string, referenceDate?: Date): Date {
    const ref = referenceDate || new Date();
    const normalizedInput = input.toLowerCase().trim();
    
    logger.info(`Parsing date input: "${input}" (normalized: "${normalizedInput}")`);
    logger.debug(`Reference date: ${ref.toISOString()}, Timezone: ${this.userTimezone}`);
    
    // Get current date in user's timezone
    const zonedRef = toZonedTime(ref, this.userTimezone);
    logger.debug(`Zoned reference date: ${zonedRef.toISOString()}`)
    
    // Handle relative dates
    switch (normalizedInput) {
      case 'today':
      case 'now':
        logger.info(`Resolved "${normalizedInput}" to: ${zonedRef.toISOString()}`);
        return zonedRef;
        
      case 'yesterday':
        return subDays(zonedRef, 1);
        
      case 'tomorrow':
        return addDays(zonedRef, 1);
        
      case 'monday':
      case 'tuesday':
      case 'wednesday':
      case 'thursday':
      case 'friday':
      case 'saturday':
      case 'sunday':
        return this.getNextWeekday(normalizedInput, zonedRef);
        
      default:
        // Try parsing as date
        return this.parseDateString(input, zonedRef);
    }
  }

  /**
   * Format a date for daily note filename (YYYY-MM-DD)
   */
  public formatForDailyNote(date: Date): string {
    return format(date, 'yyyy-MM-dd');
  }

  /**
   * Format a date with custom format
   */
  public formatDate(date: Date, formatString: string): string {
    try {
      return format(date, formatString);
    } catch (error) {
      logger.error(`Error formatting date with format ${formatString}:`, error);
      return this.formatForDailyNote(date);
    }
  }

  /**
   * Check if a date string is valid
   */
  public isValidDate(dateString: string): boolean {
    // First try our custom parser
    try {
      const parsed = this.parseDate(dateString);
      return isValid(parsed);
    } catch {
      return false;
    }
  }

  /**
   * Parse various date formats
   */
  private parseDateString(input: string, referenceDate: Date): Date {
    // Common date formats to try
    const formats = [
      'yyyy-MM-dd',      // 2025-06-28
      'yyyy/MM/dd',      // 2025/06/28
      'MM-dd-yyyy',      // 06-28-2025
      'MM/dd/yyyy',      // 06/28/2025
      'dd-MM-yyyy',      // 28-06-2025
      'dd/MM/yyyy',      // 28/06/2025
      'MMM dd, yyyy',    // Jun 28, 2025
      'MMMM dd, yyyy',   // June 28, 2025
      'dd MMM yyyy',     // 28 Jun 2025
      'dd MMMM yyyy',    // 28 June 2025
    ];
    
    // Try each format
    for (const fmt of formats) {
      try {
        const parsed = parse(input, fmt, referenceDate);
        if (isValid(parsed)) {
          return parsed;
        }
      } catch {
        // Continue to next format
      }
    }
    
    // Try relative dates like "+1", "-3", "in 2 days", "3 days ago"
    const relativeMatch = input.match(/^([+-]?\d+)$/);
    if (relativeMatch) {
      const days = parseInt(relativeMatch[1]);
      return addDays(referenceDate, days);
    }
    
    // Handle "in X days" or "X days from now"
    const futureDaysMatch = input.match(/^(?:in\s+)?(\d+)\s+days?(?:\s+from\s+now)?$/i);
    if (futureDaysMatch) {
      const days = parseInt(futureDaysMatch[1]);
      return addDays(referenceDate, days);
    }
    
    // Handle "X days ago"
    const pastDaysMatch = input.match(/^(\d+)\s+days?\s+ago$/i);
    if (pastDaysMatch) {
      const days = parseInt(pastDaysMatch[1]);
      return subDays(referenceDate, days);
    }
    
    // Last resort: try native Date parsing
    const nativeDate = new Date(input);
    if (isValid(nativeDate)) {
      return nativeDate;
    }
    
    throw new Error(`Unable to parse date: ${input}`);
  }

  /**
   * Get the next occurrence of a weekday
   */
  private getNextWeekday(weekdayName: string, referenceDate: Date): Date {
    const weekdays = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = weekdays.indexOf(weekdayName);
    
    if (targetDay === -1) {
      throw new Error(`Invalid weekday: ${weekdayName}`);
    }
    
    const currentDay = referenceDate.getDay();
    let daysToAdd = targetDay - currentDay;
    
    // If the day has already passed this week, get next week's
    if (daysToAdd <= 0) {
      daysToAdd += 7;
    }
    
    return addDays(referenceDate, daysToAdd);
  }

  /**
   * Get start and end of current week
   */
  public getWeekBounds(date: Date = new Date()): { start: Date; end: Date } {
    const zonedDate = toZonedTime(date, this.userTimezone);
    return {
      start: startOfWeek(zonedDate, { weekStartsOn: 1 }), // Monday
      end: endOfWeek(zonedDate, { weekStartsOn: 1 })      // Sunday
    };
  }

  /**
   * Convert a date to user's timezone
   */
  public toUserTimezone(date: Date): Date {
    return toZonedTime(date, this.userTimezone);
  }

  /**
   * Convert from user's timezone to UTC
   */
  public fromUserTimezone(date: Date): Date {
    return fromZonedTime(date, this.userTimezone);
  }

  /**
   * Get current date in user's timezone formatted for daily note
   */
  public getTodayForDailyNote(): string {
    const today = this.toUserTimezone(new Date());
    return this.formatForDailyNote(today);
  }

  /**
   * Resolve a date input to a daily note filename
   * This is the main method tools should use
   */
  public resolveDailyNoteDate(input: string = 'today'): string {
    try {
      logger.info(`Resolving daily note date for input: "${input}"`);
      const date = this.parseDate(input);
      const formatted = this.formatForDailyNote(date);
      logger.info(`Daily note date resolved: "${input}" → ${formatted}`);
      return formatted;
    } catch (error) {
      logger.error(`Error resolving daily note date for input "${input}":`, error);
      // Fallback to today
      const fallback = this.getTodayForDailyNote();
      logger.warn(`Using fallback date: ${fallback}`);
      return fallback;
    }
  }
}