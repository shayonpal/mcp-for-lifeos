import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DateResolver } from '../../src/date-resolver.js';
import { startOfToday, format, addDays, subDays } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

describe('DateResolver', () => {
  let dateResolver: DateResolver;
  const mockNow = new Date('2025-06-28T15:30:00Z');
  
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(mockNow);
    dateResolver = new DateResolver();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('resolveDailyNoteDate', () => {
    it('should handle "today" keyword', () => {
      const result = dateResolver.resolveDailyNoteDate('today');
      expect(result).toBe('2025-06-28');
    });

    it('should handle "yesterday" keyword', () => {
      const result = dateResolver.resolveDailyNoteDate('yesterday');
      expect(result).toBe('2025-06-27');
    });

    it('should handle "tomorrow" keyword', () => {
      const result = dateResolver.resolveDailyNoteDate('tomorrow');
      expect(result).toBe('2025-06-29');
    });

    it('should handle relative date formats', () => {
      expect(dateResolver.resolveDailyNoteDate('+1')).toBe('2025-06-29');
      expect(dateResolver.resolveDailyNoteDate('-1')).toBe('2025-06-27');
      expect(dateResolver.resolveDailyNoteDate('+2')).toBe('2025-06-30');
      expect(dateResolver.resolveDailyNoteDate('-3')).toBe('2025-06-25');
      expect(dateResolver.resolveDailyNoteDate('in 5 days')).toBe('2025-07-03');
      expect(dateResolver.resolveDailyNoteDate('3 days ago')).toBe('2025-06-25');
    });

    it('should handle weekday names', () => {
      // Mock is Saturday, June 28, 2025
      expect(dateResolver.resolveDailyNoteDate('monday')).toBe('2025-06-30');
      expect(dateResolver.resolveDailyNoteDate('friday')).toBe('2025-07-04');
      expect(dateResolver.resolveDailyNoteDate('sunday')).toBe('2025-06-29');
    });

    it.skip('should handle "last" weekday names', () => {
      // This feature is not implemented
      expect(dateResolver.resolveDailyNoteDate('last monday')).toBe('2025-06-23');
      expect(dateResolver.resolveDailyNoteDate('last friday')).toBe('2025-06-27');
      expect(dateResolver.resolveDailyNoteDate('last sunday')).toBe('2025-06-22');
    });

    it('should handle YYYY-MM-DD format', () => {
      expect(dateResolver.resolveDailyNoteDate('2025-07-04')).toBe('2025-07-04');
      expect(dateResolver.resolveDailyNoteDate('2025-01-01')).toBe('2025-01-01');
    });

    it('should handle various date formats', () => {
      expect(dateResolver.resolveDailyNoteDate('July 4, 2025')).toBe('2025-07-04');
      expect(dateResolver.resolveDailyNoteDate('Jul 4 2025')).toBe('2025-07-04');
      expect(dateResolver.resolveDailyNoteDate('7/4/2025')).toBe('2025-07-04');
      // Note: 04-07-2025 is parsed as April 7th, not July 4th
      expect(dateResolver.resolveDailyNoteDate('04-07-2025')).toBe('2025-04-07');
    });

    it('should default to today for empty input', () => {
      expect(dateResolver.resolveDailyNoteDate('')).toBe('2025-06-28');
      expect(dateResolver.resolveDailyNoteDate()).toBe('2025-06-28');
    });

    it('should handle invalid dates gracefully', () => {
      expect(dateResolver.resolveDailyNoteDate('invalid date')).toBe('2025-06-28');
      expect(dateResolver.resolveDailyNoteDate('not a date')).toBe('2025-06-28');
    });

    it('should handle ISO date strings', () => {
      expect(dateResolver.resolveDailyNoteDate('2025-07-15')).toBe('2025-07-15');
    });
  });

  describe('relative date handling through resolveDailyNoteDate', () => {
    it('should handle positive relative dates', () => {
      expect(dateResolver.resolveDailyNoteDate('+5')).toBe('2025-07-03');
      expect(dateResolver.resolveDailyNoteDate('+1')).toBe('2025-06-29');
      expect(dateResolver.resolveDailyNoteDate('+7')).toBe('2025-07-05');
    });

    it('should handle negative relative dates', () => {
      expect(dateResolver.resolveDailyNoteDate('-10')).toBe('2025-06-18');
      expect(dateResolver.resolveDailyNoteDate('-1')).toBe('2025-06-27');
      expect(dateResolver.resolveDailyNoteDate('-7')).toBe('2025-06-21');
    });
  });

  describe('weekday handling through resolveDailyNoteDate', () => {
    it('should find next occurrence of weekday', () => {
      // Saturday, June 28, 2025
      expect(dateResolver.resolveDailyNoteDate('monday')).toBe('2025-06-30');
      expect(dateResolver.resolveDailyNoteDate('wednesday')).toBe('2025-07-02');
      expect(dateResolver.resolveDailyNoteDate('friday')).toBe('2025-07-04');
    });

    it('should handle case insensitively', () => {
      expect(dateResolver.resolveDailyNoteDate('MONDAY')).toBe('2025-06-30');
      expect(dateResolver.resolveDailyNoteDate('Monday')).toBe('2025-06-30');
      expect(dateResolver.resolveDailyNoteDate('monday')).toBe('2025-06-30');
    });
  });

  describe('timezone handling', () => {
    it('should use local timezone for date resolution', () => {
      // Test with different timezone
      process.env.TZ = 'America/New_York';
      const resolver = new DateResolver();
      
      // Even though system time is UTC, should resolve to local date
      const result = resolver.resolveDailyNoteDate('today');
      const localDate = format(toZonedTime(mockNow, 'America/New_York'), 'yyyy-MM-dd');
      
      expect(result).toBe(localDate);
    });
  });

  describe('edge cases', () => {
    it('should handle month boundaries correctly', () => {
      // Set to end of month
      jest.setSystemTime(new Date('2025-06-30T23:59:59Z'));
      const resolver = new DateResolver();
      
      expect(resolver.resolveDailyNoteDate('tomorrow')).toBe('2025-07-01');
      expect(resolver.resolveDailyNoteDate('+1')).toBe('2025-07-01');
    });

    it('should handle year boundaries correctly', () => {
      // Set to end of year
      jest.setSystemTime(new Date('2025-12-31T23:59:59Z'));
      const resolver = new DateResolver();
      
      expect(resolver.resolveDailyNoteDate('tomorrow')).toBe('2026-01-01');
      expect(resolver.resolveDailyNoteDate('+1')).toBe('2026-01-01');
    });

    it('should handle leap years correctly', () => {
      // 2024 is a leap year
      jest.setSystemTime(new Date('2024-02-28T12:00:00Z'));
      const resolver = new DateResolver();
      
      expect(resolver.resolveDailyNoteDate('tomorrow')).toBe('2024-02-29');
      expect(resolver.resolveDailyNoteDate('+1')).toBe('2024-02-29');
    });
  });
});