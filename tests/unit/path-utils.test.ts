/**
 * Unit tests for path-utils module
 * Tests the stripMdExtension function and MD_EXTENSION_REGEX constant
 *
 * @since MCP-89
 */

import { stripMdExtension, MD_EXTENSION_REGEX } from '../../src/path-utils.js';

describe('path-utils', () => {
  describe('MD_EXTENSION_REGEX constant', () => {
    test('should match .md extension at end of string', () => {
      expect('template.md'.match(MD_EXTENSION_REGEX)).toBeTruthy();
      expect('note.md'.match(MD_EXTENSION_REGEX)).toBeTruthy();
    });

    test('should not match .md in middle of filename', () => {
      expect('my.mdfile'.match(MD_EXTENSION_REGEX)).toBeFalsy();
      expect('template.mdx'.match(MD_EXTENSION_REGEX)).toBeFalsy();
    });

    test('should match only final .md in double extension', () => {
      const match = 'template.md.md'.match(MD_EXTENSION_REGEX);
      expect(match).toBeTruthy();
      expect(match?.[0]).toBe('.md');
    });
  });

  describe('stripMdExtension', () => {
    describe('basic functionality', () => {
      test('should strip .md extension from filename', () => {
        expect(stripMdExtension('template.md')).toBe('template');
        expect(stripMdExtension('note.md')).toBe('note');
        expect(stripMdExtension('document.md')).toBe('document');
      });

      test('should return filename unchanged when no .md extension', () => {
        expect(stripMdExtension('template')).toBe('template');
        expect(stripMdExtension('note')).toBe('note');
        expect(stripMdExtension('document.txt')).toBe('document.txt');
      });
    });

    describe('edge cases', () => {
      test('should handle empty string', () => {
        expect(stripMdExtension('')).toBe('');
      });

      test('should strip only final .md from double extension', () => {
        expect(stripMdExtension('template.md.md')).toBe('template.md');
        expect(stripMdExtension('note.md.md')).toBe('note.md');
      });

      test('should preserve .md in middle of filename', () => {
        expect(stripMdExtension('my.mdfile.md')).toBe('my.mdfile');
        expect(stripMdExtension('test.mdformat.md')).toBe('test.mdformat');
      });

      test('should not strip non-.md extensions', () => {
        expect(stripMdExtension('document.txt')).toBe('document.txt');
        expect(stripMdExtension('script.js')).toBe('script.js');
        expect(stripMdExtension('style.css')).toBe('style.css');
        expect(stripMdExtension('template.mdx')).toBe('template.mdx');
      });

      test('should handle multiple dots in filename', () => {
        expect(stripMdExtension('my.note.file.md')).toBe('my.note.file');
        expect(stripMdExtension('test.backup.v2.md')).toBe('test.backup.v2');
        expect(stripMdExtension('2025.01.15.md')).toBe('2025.01.15');
      });
    });

    describe('path preservation', () => {
      test('should preserve relative directory paths', () => {
        expect(stripMdExtension('folder/template.md')).toBe('folder/template');
        expect(stripMdExtension('folder/subfolder/note.md')).toBe('folder/subfolder/note');
        expect(stripMdExtension('path/to/document.md')).toBe('path/to/document');
      });

      test('should preserve absolute directory paths', () => {
        expect(stripMdExtension('/absolute/path/note.md')).toBe('/absolute/path/note');
        expect(stripMdExtension('/vault/templates/daily.md')).toBe('/vault/templates/daily');
      });

      test('should preserve paths with multiple dots', () => {
        expect(stripMdExtension('folder.name/file.md')).toBe('folder.name/file');
        expect(stripMdExtension('my.folder/my.file.md')).toBe('my.folder/my.file');
      });

      test('should handle paths with no extension', () => {
        expect(stripMdExtension('folder/template')).toBe('folder/template');
        expect(stripMdExtension('/absolute/path/note')).toBe('/absolute/path/note');
      });
    });

    describe('pure function behavior', () => {
      test('should not modify input parameter', () => {
        const input = 'template.md';
        const inputCopy = input;
        stripMdExtension(input);
        expect(input).toBe(inputCopy);
      });

      test('should return consistent results for same input', () => {
        const input = 'note.md';
        const result1 = stripMdExtension(input);
        const result2 = stripMdExtension(input);
        const result3 = stripMdExtension(input);
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      });

      test('should work with const inputs', () => {
        const filename = 'immutable.md' as const;
        expect(stripMdExtension(filename)).toBe('immutable');
      });
    });

    describe('real-world use cases', () => {
      test('should handle daily note filenames', () => {
        expect(stripMdExtension('2025-10-26.md')).toBe('2025-10-26');
        expect(stripMdExtension('2025.10.26.md')).toBe('2025.10.26');
      });

      test('should handle template filenames', () => {
        expect(stripMdExtension('tpl-daily.md')).toBe('tpl-daily');
        expect(stripMdExtension('template-note.md')).toBe('template-note');
      });

      test('should handle vault paths', () => {
        expect(stripMdExtension('Daily Notes/2025-10-26.md')).toBe('Daily Notes/2025-10-26');
        expect(stripMdExtension('Templates/tpl-daily.md')).toBe('Templates/tpl-daily');
        expect(stripMdExtension('Projects/MCP-89/notes.md')).toBe('Projects/MCP-89/notes');
      });

      test('should handle special characters in filenames', () => {
        expect(stripMdExtension('note (draft).md')).toBe('note (draft)');
        expect(stripMdExtension('test-note_v2.md')).toBe('test-note_v2');
        expect(stripMdExtension('file with spaces.md')).toBe('file with spaces');
      });
    });
  });
});
