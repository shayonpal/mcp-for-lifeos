import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ObsidianLinks } from '../../src/modules/links/index.js';
import type { YAMLFrontmatter } from '../../src/types.js';

describe('ObsidianLinks.extractNoteTitle()', () => {
  describe('Priority 1: Frontmatter title field', () => {
    it('should prioritize frontmatter.title when provided and non-empty', () => {
      const frontmatter: YAMLFrontmatter = {
        title: 'Custom Note Title',
        created: new Date(),
        modified: new Date()
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/path/2025-08-30.md', frontmatter);

      expect(result).toBe('Custom Note Title');
    });

    it('should use frontmatter.title even for daily note filenames', () => {
      const frontmatter: YAMLFrontmatter = {
        title: 'Special Daily Note',
        created: new Date(),
        modified: new Date()
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/path/2025-08-30.md', frontmatter);

      expect(result).toBe('Special Daily Note');
    });

    it('should handle frontmatter with Record<string, any> type', () => {
      const frontmatter: Record<string, any> = {
        title: 'Generic Title',
        customField: 'value'
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/my-note.md', frontmatter);

      expect(result).toBe('Generic Title');
    });

    it('should ignore empty string frontmatter.title', () => {
      const frontmatter: YAMLFrontmatter = {
        title: '',
        created: new Date(),
        modified: new Date()
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/path/2025-08-30.md', frontmatter);

      // Should fall back to daily note formatting (Priority 2)
      expect(result).toBe('August 30, 2025');
    });

    it('should ignore whitespace-only frontmatter.title', () => {
      const frontmatter: YAMLFrontmatter = {
        title: '   ',
        created: new Date(),
        modified: new Date()
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/my-note.md', frontmatter);

      // Should fall back to filename transformation (Priority 3)
      expect(result).toBe('My Note');
    });

    it('should handle non-string frontmatter.title', () => {
      const frontmatter = {
        title: 123, // Invalid type
        created: new Date(),
        modified: new Date()
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/my-note.md', frontmatter);

      // Should fall back to filename transformation
      expect(result).toBe('My Note');
    });
  });

  describe('Priority 2: Daily note date formatting (YYYY-MM-DD)', () => {
    it('should format daily notes as "Month DD, YYYY"', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/path/2025-08-30.md');

      expect(result).toBe('August 30, 2025');
    });

    it('should handle timezone correctly - MCP-31 FIX (parseISO vs new Date)', () => {
      // Critical test: Verify parseISO() prevents timezone shift
      // Issue: new Date('2025-08-30') creates UTC midnight → previous day in EST/PST
      // Fix: parseISO('2025-08-30') interprets as local date without timezone conversion

      const testCases = [
        { filename: '2025-08-30.md', expected: 'August 30, 2025' },
        { filename: '2025-01-15.md', expected: 'January 15, 2025' },
        { filename: '2025-12-31.md', expected: 'December 31, 2025' },
        { filename: '2025-02-01.md', expected: 'February 01, 2025' }
      ];

      testCases.forEach(({ filename, expected }) => {
        const result = ObsidianLinks.extractNoteTitle(`/vault/path/${filename}`);
        expect(result).toBe(expected);
      });
    });

    it('should handle leap year daily notes', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/2024-02-29.md');

      expect(result).toBe('February 29, 2024');
    });

    it('should handle daily notes without frontmatter parameter', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/2025-10-15.md');

      expect(result).toBe('October 15, 2025');
    });

    it('should handle daily notes with empty frontmatter object', () => {
      const frontmatter: YAMLFrontmatter = {
        created: new Date(),
        modified: new Date()
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/2025-03-20.md', frontmatter);

      expect(result).toBe('March 20, 2025');
    });

    it('should only match YYYY-MM-DD format exactly', () => {
      // These should NOT be treated as daily notes
      const nonDailyNotes = [
        { path: '/vault/2025-08.md', expected: '2025 08' }, // Missing day
        { path: '/vault/25-08-30.md', expected: '25 08 30' }, // 2-digit year
        { path: '/vault/2025-8-30.md', expected: '2025 8 30' }, // Single-digit month
        { path: '/vault/2025-08-3.md', expected: '2025 08 3' } // Single-digit day
      ];

      nonDailyNotes.forEach(({ path, expected }) => {
        const result = ObsidianLinks.extractNoteTitle(path);
        expect(result).toBe(expected);
      });
    });
  });

  describe('Priority 3: Title-cased filename transformation', () => {
    it('should transform dashes to spaces', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/my-project-note.md');

      expect(result).toBe('My Project Note');
    });

    it('should transform underscores to spaces', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/my_project_note.md');

      expect(result).toBe('My Project Note');
    });

    it('should transform mixed dashes and underscores', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/my-project_note-file.md');

      expect(result).toBe('My Project Note File');
    });

    it('should apply title case to each word', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/important-meeting-notes.md');

      expect(result).toBe('Important Meeting Notes');
    });

    it('should handle single word filenames', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/notes.md');

      expect(result).toBe('Notes');
    });

    it('should handle filenames with numbers', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/project-2024-summary.md');

      expect(result).toBe('Project 2024 Summary');
    });

    it('should remove .md extension', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/test-note.md');

      expect(result).not.toContain('.md');
      expect(result).toBe('Test Note');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing frontmatter parameter (undefined)', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/my-note.md', undefined);

      expect(result).toBe('My Note');
    });

    it('should handle null frontmatter', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/my-note.md', null as any);

      expect(result).toBe('My Note');
    });

    it('should handle frontmatter without title field', () => {
      const frontmatter: Record<string, any> = {
        tags: ['test'],
        category: 'notes'
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/my-note.md', frontmatter);

      expect(result).toBe('My Note');
    });

    it('should handle absolute paths', () => {
      const result = ObsidianLinks.extractNoteTitle('/Users/user/vault/my-note.md');

      expect(result).toBe('My Note');
    });

    it('should handle relative paths', () => {
      const result = ObsidianLinks.extractNoteTitle('vault/subfolder/my-note.md');

      expect(result).toBe('My Note');
    });

    it('should handle paths without extension', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/my-note');

      expect(result).toBe('My Note');
    });

    it('should handle empty filename (edge case)', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/.md');

      // basename('', '.md') returns ''
      // Empty string replacement results in empty string
      expect(result).toBe('');
    });

    it('should handle paths with multiple dots', () => {
      const result = ObsidianLinks.extractNoteTitle('/vault/my.project.note.md');

      expect(result).toBe('My.Project.Note');
    });
  });

  describe('Backward Compatibility', () => {
    it('should work without frontmatter parameter (original signature)', () => {
      // Original signature: extractNoteTitle(filePath: string)
      const result = ObsidianLinks.extractNoteTitle('/vault/test-note.md');

      expect(result).toBe('Test Note');
    });

    it('should work with frontmatter parameter (enhanced signature)', () => {
      // Enhanced signature: extractNoteTitle(filePath: string, frontmatter?: YAMLFrontmatter)
      const frontmatter: YAMLFrontmatter = {
        title: 'Enhanced Title',
        created: new Date(),
        modified: new Date()
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/test-note.md', frontmatter);

      expect(result).toBe('Enhanced Title');
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle typical daily note without custom title', () => {
      const frontmatter: YAMLFrontmatter = {
        'content type': 'Daily Note',
        created: new Date('2025-08-30'),
        modified: new Date('2025-08-30')
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/Daily Notes/2025-08-30.md', frontmatter);

      // No title field, so should format as daily note
      expect(result).toBe('August 30, 2025');
    });

    it('should handle project note with custom title', () => {
      const frontmatter: YAMLFrontmatter = {
        title: 'Q4 2025 Planning',
        'content type': 'Project',
        created: new Date(),
        modified: new Date()
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/Projects/q4-planning.md', frontmatter);

      expect(result).toBe('Q4 2025 Planning');
    });

    it('should handle article note with title', () => {
      const frontmatter: YAMLFrontmatter = {
        title: 'Understanding MCP Protocol',
        'content type': 'Article',
        source: 'https://example.com',
        created: new Date(),
        modified: new Date()
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/Resources/mcp-article.md', frontmatter);

      expect(result).toBe('Understanding MCP Protocol');
    });

    it('should handle meeting note without custom title', () => {
      const frontmatter: YAMLFrontmatter = {
        'content type': 'Meeting',
        tags: ['work', 'planning'],
        created: new Date(),
        modified: new Date()
      };

      const result = ObsidianLinks.extractNoteTitle('/vault/Meetings/team-sync-2025-08.md', frontmatter);

      expect(result).toBe('Team Sync 2025 08');
    });
  });
});
