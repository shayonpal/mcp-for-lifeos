/**
 * Unit tests for path-utils module
 * Tests the stripMdExtension function and MD_EXTENSION_REGEX constant
 *
 * @since MCP-89
 */

import { stripMdExtension, MD_EXTENSION_REGEX, normalizePath } from '../../src/path-utils.js';
import * as path from 'path';

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

  describe('normalizePath', () => {
    describe('absolute path handling', () => {
      test('should return absolute POSIX path as-is', () => {
        const absolutePath = '/Users/shayon/vault/Daily';
        const basePath = '/Users/shayon/vault';
        expect(normalizePath(absolutePath, basePath)).toBe(absolutePath);
      });

      test('should return absolute Windows path as-is (Windows only)', () => {
        const absolutePath = 'C:\\Users\\vault\\Daily';
        const basePath = 'C:\\Users\\vault';
        const result = normalizePath(absolutePath, basePath);

        // On Windows, path.isAbsolute() recognizes Windows paths
        // On POSIX, Windows paths are treated as relative (expected behavior)
        if (path.isAbsolute(absolutePath)) {
          expect(result).toBe(absolutePath);
        } else {
          // On POSIX, Windows path is relative and gets joined
          expect(result).toBe(path.join(basePath, absolutePath));
        }
      });

      test('should return UNC network path as-is (Windows only)', () => {
        const uncPath = '\\\\server\\share\\vault';
        const basePath = '\\\\server\\share';
        const result = normalizePath(uncPath, basePath);

        // UNC paths are only absolute on Windows
        if (path.isAbsolute(uncPath)) {
          expect(result).toBe(uncPath);
        } else {
          // On POSIX, treated as relative
          expect(result).toBe(path.join(basePath, uncPath));
        }
      });

      test('should not modify absolute paths regardless of basePath', () => {
        const absolutePath = '/absolute/path/to/file';
        expect(normalizePath(absolutePath, '/different/base')).toBe(absolutePath);
        expect(normalizePath(absolutePath, '/another/base/path')).toBe(absolutePath);
      });
    });

    describe('relative path handling', () => {
      test('should join relative POSIX path with basePath', () => {
        const relativePath = '20 - Areas/Daily';
        const basePath = '/Users/shayon/vault';
        const expected = path.join(basePath, relativePath);
        expect(normalizePath(relativePath, basePath)).toBe(expected);
      });

      test('should join relative Windows path with basePath', () => {
        const relativePath = '20 - Areas\\Daily';
        const basePath = 'C:\\Users\\vault';
        const expected = path.join(basePath, relativePath);
        expect(normalizePath(relativePath, basePath)).toBe(expected);
      });

      test('should handle simple relative paths', () => {
        expect(normalizePath('folder', '/base')).toBe(path.join('/base', 'folder'));
        expect(normalizePath('path/to/folder', '/base')).toBe(path.join('/base', 'path/to/folder'));
      });
    });

    describe('cross-platform path detection', () => {
      test('should correctly identify POSIX absolute paths', () => {
        const posixAbsolute = '/usr/local/bin';
        const basePath = '/home/user';
        // If path.isAbsolute() returns true, should use path as-is
        if (path.isAbsolute(posixAbsolute)) {
          expect(normalizePath(posixAbsolute, basePath)).toBe(posixAbsolute);
        }
      });

      test('should correctly identify Windows absolute paths', () => {
        const winAbsolute = 'C:\\Program Files\\App';
        const basePath = 'C:\\Users';
        // If path.isAbsolute() returns true, should use path as-is
        if (path.isAbsolute(winAbsolute)) {
          expect(normalizePath(winAbsolute, basePath)).toBe(winAbsolute);
        }
      });

      test('should correctly identify relative paths', () => {
        const relativePath = 'relative/path';
        const basePath = '/base/path';
        // Relative paths should always be joined
        expect(normalizePath(relativePath, basePath)).toBe(path.join(basePath, relativePath));
      });
    });

    describe('path traversal edge cases', () => {
      test('should handle path traversal attempts', () => {
        const traversalPath = '../../../etc';
        const basePath = '/Users/shayon/vault';
        // path.join handles traversal correctly
        const expected = path.join(basePath, traversalPath);
        expect(normalizePath(traversalPath, basePath)).toBe(expected);
      });

      test('should preserve path traversal in relative paths', () => {
        const relativePath = '../../sibling/folder';
        const basePath = '/base/path/current';
        const expected = path.join(basePath, relativePath);
        expect(normalizePath(relativePath, basePath)).toBe(expected);
      });
    });

    describe('real-world vault scenarios', () => {
      test('should handle absolute dailyNotesPath from LIFEOS_CONFIG', () => {
        const dailyNotesPath = '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)/20 - Areas/21 - Myself/Journals/Daily';
        const vaultPath = '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)';
        expect(normalizePath(dailyNotesPath, vaultPath)).toBe(dailyNotesPath);
      });

      test('should handle relative template inference paths', () => {
        const relativePath = '30 - Resources/Recipes';
        const vaultPath = '/Users/shayon/vault';
        expect(normalizePath(relativePath, vaultPath)).toBe(path.join(vaultPath, relativePath));
      });

      test('should handle relative user input paths', () => {
        const relativePath = 'Projects/Active';
        const vaultPath = '/Users/shayon/vault';
        expect(normalizePath(relativePath, vaultPath)).toBe(path.join(vaultPath, relativePath));
      });

      test('should handle paths with spaces', () => {
        const pathWithSpaces = '20 - Areas/21 - Myself/Journals/Daily';
        const vaultPath = '/Users/shayon/vault';
        expect(normalizePath(pathWithSpaces, vaultPath)).toBe(path.join(vaultPath, pathWithSpaces));
      });
    });

    describe('pure function behavior', () => {
      test('should not modify input parameters', () => {
        const inputPath = 'folder/path';
        const basePath = '/base/path';
        const inputCopy = inputPath;
        const baseCopy = basePath;
        normalizePath(inputPath, basePath);
        expect(inputPath).toBe(inputCopy);
        expect(basePath).toBe(baseCopy);
      });

      test('should return consistent results for same input', () => {
        const inputPath = 'relative/path';
        const basePath = '/base';
        const result1 = normalizePath(inputPath, basePath);
        const result2 = normalizePath(inputPath, basePath);
        const result3 = normalizePath(inputPath, basePath);
        expect(result1).toBe(result2);
        expect(result2).toBe(result3);
      });

      test('should be deterministic', () => {
        const inputs = [
          ['/absolute/path', '/base'],
          ['relative/path', '/base'],
          ['C:\\Windows\\Path', 'C:\\Base'],
          ['nested/relative/path', '/some/base/path'],
        ] as const;

        inputs.forEach(([inputPath, basePath]) => {
          const result1 = normalizePath(inputPath, basePath);
          const result2 = normalizePath(inputPath, basePath);
          expect(result1).toBe(result2);
        });
      });
    });

    describe('no I/O operations', () => {
      test('should not check if paths exist', () => {
        // Non-existent paths should still be normalized
        const nonExistentPath = '/this/path/does/not/exist';
        const basePath = '/base';
        expect(() => normalizePath(nonExistentPath, basePath)).not.toThrow();
        expect(normalizePath(nonExistentPath, basePath)).toBe(nonExistentPath);
      });

      test('should work with invalid paths', () => {
        // Invalid paths should still be processed (validation happens elsewhere)
        const invalidPath = 'relative/with/../traversal';
        const basePath = '/base';
        expect(() => normalizePath(invalidPath, basePath)).not.toThrow();
        expect(normalizePath(invalidPath, basePath)).toBe(path.join(basePath, invalidPath));
      });
    });

    describe('escaped space handling (MCP-64)', () => {
      test('should convert escaped spaces to regular spaces', () => {
        const pathWithEscapedSpaces = '20\\ -\\ Areas/file.md';
        const basePath = '/Users/shayon/vault';
        const expected = path.join(basePath, '20 - Areas/file.md');
        expect(normalizePath(pathWithEscapedSpaces, basePath)).toBe(expected);
      });

      test('should handle multiple escaped spaces', () => {
        const pathWithMultipleEscapes = 'folder\\ name/sub\\ folder/file\\ name.md';
        const basePath = '/vault';
        const expected = path.join(basePath, 'folder name/sub folder/file name.md');
        expect(normalizePath(pathWithMultipleEscapes, basePath)).toBe(expected);
      });

      test('should handle escaped spaces in absolute paths', () => {
        const absolutePathWithEscapes = '/Users/shayon/vault/20\\ -\\ Areas';
        const basePath = '/Users/shayon/vault';
        expect(normalizePath(absolutePathWithEscapes, basePath)).toBe('/Users/shayon/vault/20 - Areas');
      });

      test('should preserve regular spaces (non-escaped)', () => {
        const pathWithSpaces = '20 - Areas/21 - Myself/file.md';
        const basePath = '/vault';
        const expected = path.join(basePath, pathWithSpaces);
        expect(normalizePath(pathWithSpaces, basePath)).toBe(expected);
      });

      test('should handle CLI compatibility scenario', () => {
        // Simulates CLI input like: move_items "20\ -\ Areas/file.md"
        const cliInput = '20\\ -\\ Areas/21\\ -\\ Myself/Journals/Daily';
        const basePath = '/Users/shayon/vault';
        const expected = path.join(basePath, '20 - Areas/21 - Myself/Journals/Daily');
        expect(normalizePath(cliInput, basePath)).toBe(expected);
      });

      test('should not affect paths without escaped spaces', () => {
        const normalPath = 'folder/subfolder/file.md';
        const basePath = '/vault';
        const expected = path.join(basePath, normalPath);
        expect(normalizePath(normalPath, basePath)).toBe(expected);
      });
    });

    describe('path traversal validation (MCP-64)', () => {
      test('should allow paths within vault when validation disabled (default)', () => {
        const safePath = 'Projects/Active/note.md';
        const basePath = '/Users/shayon/vault';
        expect(() => normalizePath(safePath, basePath)).not.toThrow();
      });

      test('should allow paths within vault when validation enabled', () => {
        const safePath = 'Projects/Active/note.md';
        const basePath = '/Users/shayon/vault';
        const result = normalizePath(safePath, basePath, { validateVaultConfinement: true });
        expect(result).toBe(path.join(basePath, safePath));
      });

      test('should throw error for path traversal when validation enabled', () => {
        const traversalPath = '../../../etc/passwd';
        const basePath = '/Users/shayon/vault';
        expect(() => {
          normalizePath(traversalPath, basePath, { validateVaultConfinement: true });
        }).toThrow(/Path traversal detected/);
      });

      test('should throw error for absolute path outside vault when validation enabled', () => {
        const outsidePath = '/etc/passwd';
        const basePath = '/Users/shayon/vault';
        expect(() => {
          normalizePath(outsidePath, basePath, { validateVaultConfinement: true });
        }).toThrow(/Path traversal detected/);
      });

      test('should allow path traversal when validation disabled (default)', () => {
        const traversalPath = '../../../etc/passwd';
        const basePath = '/Users/shayon/vault';
        const expected = path.join(basePath, traversalPath);
        expect(() => normalizePath(traversalPath, basePath)).not.toThrow();
        expect(normalizePath(traversalPath, basePath)).toBe(expected);
      });

      test('should provide detailed error message for path traversal', () => {
        const traversalPath = '../../outside';
        const basePath = '/Users/shayon/vault';
        try {
          normalizePath(traversalPath, basePath, { validateVaultConfinement: true });
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toMatch(/Path traversal detected/);
          expect((error as Error).message).toContain(traversalPath);
          expect((error as Error).message).toContain(basePath);
        }
      });

      test('should handle vault root path correctly', () => {
        const vaultRoot = '';
        const basePath = '/Users/shayon/vault';
        const result = normalizePath(vaultRoot, basePath, { validateVaultConfinement: true });
        expect(result).toBe(basePath);
      });

      test('should handle current directory reference', () => {
        const currentDir = './Projects/note.md';
        const basePath = '/Users/shayon/vault';
        const result = normalizePath(currentDir, basePath, { validateVaultConfinement: true });
        expect(result).toBe(path.join(basePath, currentDir));
      });
    });

    describe('combined features (MCP-64)', () => {
      test('should handle escaped spaces with path traversal validation', () => {
        const pathWithEscapes = '20\\ -\\ Areas/note.md';
        const basePath = '/Users/shayon/vault';
        const result = normalizePath(pathWithEscapes, basePath, { validateVaultConfinement: true });
        expect(result).toBe(path.join(basePath, '20 - Areas/note.md'));
      });

      test('should detect traversal even with escaped spaces', () => {
        const maliciousPath = '../../../etc\\ passwd';
        const basePath = '/Users/shayon/vault';
        expect(() => {
          normalizePath(maliciousPath, basePath, { validateVaultConfinement: true });
        }).toThrow(/Path traversal detected/);
      });

      test('should handle complex real-world path with all features', () => {
        const complexPath = '20\\ -\\ Areas/21\\ -\\ Myself/Journals/Daily/2025-10-26.md';
        const basePath = '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)';
        const result = normalizePath(complexPath, basePath, { validateVaultConfinement: true });
        const expected = path.join(basePath, '20 - Areas/21 - Myself/Journals/Daily/2025-10-26.md');
        expect(result).toBe(expected);
      });
    });
  });
});
