import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { DateResolver } from '../../src/shared/index.js';
import { format } from 'date-fns';

describe('DateResolver - Timezone Edge Cases', () => {
  const originalTZ = process.env.TZ;
  
  afterEach(() => {
    jest.useRealTimers();
    process.env.TZ = originalTZ;
  });

  describe('midnight boundary crossing', () => {
    it('should handle "today" correctly near midnight UTC', () => {
      // Test at 23:59:59 UTC
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-28T23:59:59Z'));
      
      // Test with different timezones
      const timezones = [
        { tz: 'UTC', expected: '2025-06-28' },
        { tz: 'America/New_York', expected: '2025-06-28' }, // Still 19:59 on 28th
        { tz: 'Asia/Tokyo', expected: '2025-06-29' }, // Already 08:59 on 29th
        { tz: 'Australia/Sydney', expected: '2025-06-29' }, // Already 09:59 on 29th
      ];
      
      timezones.forEach(({ tz, expected }) => {
        const resolver = new DateResolver(tz);
        const result = resolver.resolveDailyNoteDate('today');
        expect(result).toBe(expected);
      });
    });

    it('should handle "today" correctly just after midnight UTC', () => {
      // Test at 00:00:01 UTC
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-29T00:00:01Z'));
      
      const timezones = [
        { tz: 'UTC', expected: '2025-06-29' },
        { tz: 'America/Los_Angeles', expected: '2025-06-28' }, // Still 17:00 on 28th
        { tz: 'America/New_York', expected: '2025-06-28' }, // Still 20:00 on 28th
        { tz: 'Europe/London', expected: '2025-06-29' }, // 01:00 on 29th
      ];
      
      timezones.forEach(({ tz, expected }) => {
        const resolver = new DateResolver(tz);
        const result = resolver.resolveDailyNoteDate('today');
        expect(result).toBe(expected);
      });
    });
  });

  describe('DST transitions', () => {
    it('should handle spring forward DST transition', () => {
      // March 10, 2024 at 2:00 AM EST -> 3:00 AM EDT
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-10T07:00:00Z')); // 2:00 AM EST
      
      const resolver = new DateResolver('America/New_York');
      expect(resolver.resolveDailyNoteDate('today')).toBe('2024-03-10');
      expect(resolver.resolveDailyNoteDate('tomorrow')).toBe('2024-03-11');
    });

    it('should handle fall back DST transition', () => {
      // November 3, 2024 at 2:00 AM EDT -> 1:00 AM EST
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-11-03T06:00:00Z')); // 2:00 AM EDT
      
      const resolver = new DateResolver('America/New_York');
      expect(resolver.resolveDailyNoteDate('today')).toBe('2024-11-03');
      expect(resolver.resolveDailyNoteDate('tomorrow')).toBe('2024-11-04');
    });
  });

  describe('extreme timezone differences', () => {
    it('should handle Pacific/Kiritimati (UTC+14)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-28T10:00:00Z')); // 10:00 UTC
      
      const resolver = new DateResolver('Pacific/Kiritimati');
      // At 10:00 UTC, it's already 00:00 on June 29 in Kiritimati
      expect(resolver.resolveDailyNoteDate('today')).toBe('2025-06-29');
    });

    it('should handle Pacific/Midway (UTC-11)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-28T10:00:00Z')); // 10:00 UTC
      
      const resolver = new DateResolver('Pacific/Midway');
      // At 10:00 UTC, it's still 23:00 on June 27 in Midway
      expect(resolver.resolveDailyNoteDate('today')).toBe('2025-06-27');
    });
  });

  describe('user scenario simulations', () => {
    it('should handle late night work session in EST', () => {
      // User working at 11:30 PM EST
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-29T03:30:00Z')); // 11:30 PM EST on June 28
      
      const resolver = new DateResolver('America/New_York');
      expect(resolver.resolveDailyNoteDate('today')).toBe('2025-06-28');
      
      // 30 minutes later, after midnight
      jest.setSystemTime(new Date('2025-06-29T04:30:00Z')); // 12:30 AM EST on June 29
      expect(resolver.resolveDailyNoteDate('today')).toBe('2025-06-29');
    });

    it('should handle morning work session in various timezones', () => {
      // 6:00 AM local time in different zones
      const scenarios = [
        { time: '2025-06-28T11:00:00Z', tz: 'America/New_York', expected: '2025-06-28' }, // 7:00 AM EDT
        { time: '2025-06-28T21:00:00Z', tz: 'Asia/Tokyo', expected: '2025-06-29' }, // 6:00 AM JST on 29th
        { time: '2025-06-27T20:00:00Z', tz: 'Australia/Sydney', expected: '2025-06-28' }, // 6:00 AM AEST on 28th
      ];
      
      scenarios.forEach(({ time, tz, expected }) => {
        jest.useFakeTimers();
        jest.setSystemTime(new Date(time));
        
        const resolver = new DateResolver(tz);
        const result = resolver.resolveDailyNoteDate('today');
        expect(result).toBe(expected);
      });
    });
  });

  describe('relative dates across timezone boundaries', () => {
    it('should calculate "yesterday" correctly across timezones', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-29T02:00:00Z')); // 2:00 AM UTC
      
      const scenarios = [
        { tz: 'UTC', expected: '2025-06-28' },
        { tz: 'America/Los_Angeles', expected: '2025-06-27' }, // Still June 28 at 7 PM
        { tz: 'Asia/Tokyo', expected: '2025-06-28' }, // June 29 at 11 AM
      ];
      
      scenarios.forEach(({ tz, expected }) => {
        const resolver = new DateResolver(tz);
        expect(resolver.resolveDailyNoteDate('yesterday')).toBe(expected);
      });
    });

    it('should calculate relative offsets correctly', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-06-28T23:00:00Z')); // 11 PM UTC
      
      const resolver = new DateResolver('America/New_York'); // 7 PM EST on June 28
      expect(resolver.resolveDailyNoteDate('+1')).toBe('2025-06-29');
      expect(resolver.resolveDailyNoteDate('-1')).toBe('2025-06-27');
      expect(resolver.resolveDailyNoteDate('+7')).toBe('2025-07-05');
    });
  });
});