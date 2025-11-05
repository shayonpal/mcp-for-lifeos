/**
 * Unit Tests for InstructionProcessor
 *
 * Tests the custom instruction processing scaffolding in pass-through mode.
 * Ensures proper configuration handling, file watching, and test isolation.
 */

import { InstructionProcessor, InstructionContext } from '../../src/modules/config/instruction-processor.js';
import { LIFEOS_CONFIG } from '../../src/shared/config.js';
import { CustomInstructionsConfig } from '../../src/shared/types.js';
import * as fs from 'fs';

// Mock fs.watch to prevent actual file system watchers in tests
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    watch: jest.fn()
  };
});

describe('InstructionProcessor', () => {
  // Store original config to restore after tests
  const originalCustomInstructions = LIFEOS_CONFIG.customInstructions;

  beforeEach(() => {
    // Reset singleton state before each test
    InstructionProcessor.cleanup();

    // Reset config to default (undefined)
    LIFEOS_CONFIG.customInstructions = undefined;

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Ensure cleanup after each test (prevents test pollution)
    InstructionProcessor.cleanup();

    // Restore original config
    LIFEOS_CONFIG.customInstructions = originalCustomInstructions;
  });

  describe('getInstructions()', () => {
    it('returns null when no config provided', () => {
      // Arrange: No custom instructions configured
      LIFEOS_CONFIG.customInstructions = undefined;

      // Act
      const result = InstructionProcessor.getInstructions();

      // Assert
      expect(result.instructions).toBeNull();
      expect(result.source).toBe('none');
      expect(result.loadedAt).toBeInstanceOf(Date);
    });

    it('returns inline config when present', () => {
      // Arrange: Configure inline instructions
      const inlineConfig: CustomInstructionsConfig = {
        inline: {
          noteCreationRules: 'Always use title case',
          editingRules: 'Preserve existing formatting',
          templateRules: 'Apply templates consistently'
        }
      };
      LIFEOS_CONFIG.customInstructions = inlineConfig;

      // Act
      const result = InstructionProcessor.getInstructions();

      // Assert
      expect(result.instructions).toEqual(inlineConfig.inline);
      expect(result.source).toBe('inline');
      expect(result.loadedAt).toBeInstanceOf(Date);
    });

    it('attempts to load file-based config and falls back on error', () => {
      // Arrange: Configure invalid file path
      const fileConfig: CustomInstructionsConfig = {
        filePath: '/nonexistent/path/to/instructions.md',
        enableHotReload: true
      };
      LIFEOS_CONFIG.customInstructions = fileConfig;

      // Spy on logger.error
      const errorSpy = jest.spyOn(require('../../src/shared/logger.js').logger, 'error');

      // Act
      const result = InstructionProcessor.getInstructions();

      // Assert: Should try to load file, fail, and return null
      expect(result.instructions).toBeNull();
      expect(result.source).toBe('none');
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to load file-based instructions, falling back to inline',
        expect.objectContaining({ filePath: fileConfig.filePath })
      );

      errorSpy.mockRestore();
    });

    it('handles undefined customInstructions gracefully', () => {
      // Arrange: Explicitly set to undefined
      LIFEOS_CONFIG.customInstructions = undefined;

      // Act
      const result = InstructionProcessor.getInstructions();

      // Assert: Should not throw, returns null
      expect(result.instructions).toBeNull();
      expect(result.source).toBe('none');
    });

    it('file path takes precedence over inline config', () => {
      // Arrange: Both inline and filePath configured (filePath takes precedence)
      const mixedConfig: CustomInstructionsConfig = {
        inline: {
          noteCreationRules: 'Inline rules as fallback'
        },
        filePath: '/nonexistent/path/to/instructions.md'
      };
      LIFEOS_CONFIG.customInstructions = mixedConfig;

      // Act
      const result = InstructionProcessor.getInstructions();

      // Assert: Should try file first, fail, then fall back to inline
      expect(result.instructions).toEqual(mixedConfig.inline);
      expect(result.source).toBe('inline');
    });
  });

  describe('applyInstructions()', () => {
    it('returns context unchanged (pass-through mode)', () => {
      // Arrange: Create test context
      const context: InstructionContext = {
        operation: 'create',
        noteType: 'daily',
        targetPath: '/path/to/note.md'
      };

      // Act
      const result = InstructionProcessor.applyInstructions(context);

      // Assert: Context should be unchanged
      expect(result.context).toEqual(context);
      expect(result.modified).toBe(false);
      expect(result.appliedRules).toEqual([]);
    });

    it('logs debug message when called', () => {
      // Arrange
      const debugSpy = jest.spyOn(require('../../src/shared/logger.js').logger, 'debug');
      const context: InstructionContext = {
        operation: 'edit',
        noteType: 'restaurant'
      };

      // Act
      InstructionProcessor.applyInstructions(context);

      // Assert: Debug log should be called (updated message for Phase 2)
      expect(debugSpy).toHaveBeenCalledWith(
        'InstructionProcessor.applyInstructions called',
        expect.objectContaining({
          operation: 'edit',
          noteType: 'restaurant'
        })
      );

      debugSpy.mockRestore();
    });

    it('handles all operation types', () => {
      // Test each operation type
      const operations: Array<'create' | 'edit' | 'insert' | 'template'> = [
        'create',
        'edit',
        'insert',
        'template'
      ];

      operations.forEach(operation => {
        // Arrange
        const context: InstructionContext = { operation };

        // Act
        const result = InstructionProcessor.applyInstructions(context);

        // Assert: Should handle all types
        expect(result.context.operation).toBe(operation);
        expect(result.modified).toBe(false);
      });
    });

    it('preserves all context fields', () => {
      // Arrange: Context with all optional fields
      const context: InstructionContext = {
        operation: 'insert',
        noteType: 'person',
        existingContent: '# Existing Content\n\nSome text',
        targetPath: '/vault/people/john-doe.md'
      };

      // Act
      const result = InstructionProcessor.applyInstructions(context);

      // Assert: All fields should be preserved
      expect(result.context).toEqual(context);
      expect(result.context.noteType).toBe('person');
      expect(result.context.existingContent).toBe(context.existingContent);
      expect(result.context.targetPath).toBe(context.targetPath);
    });
  });

  describe('initializeWatcher()', () => {
    beforeEach(() => {
      // Reset environment variable
      delete process.env.DISABLE_CONFIG_WATCH;
    });

    it('skips when DISABLE_CONFIG_WATCH=true', () => {
      // Arrange: Disable config watch (for tests)
      process.env.DISABLE_CONFIG_WATCH = 'true';
      LIFEOS_CONFIG.customInstructions = {
        filePath: '/path/to/instructions.md',
        enableHotReload: true
      };

      // Act
      const result = InstructionProcessor.initializeWatcher();

      // Assert: Should skip initialization
      expect(result.success).toBe(false);
      expect(result.error).toContain('Disabled via environment variable');
      expect(fs.watch).not.toHaveBeenCalled();
    });

    it('skips when no filePath provided', () => {
      // Arrange: No file path configured
      LIFEOS_CONFIG.customInstructions = {
        inline: {
          noteCreationRules: 'Some rules'
        }
      };

      // Act
      const result = InstructionProcessor.initializeWatcher();

      // Assert: Should skip initialization
      expect(result.success).toBe(false);
      expect(result.error).toContain('No file path configured');
      expect(fs.watch).not.toHaveBeenCalled();
    });

    it('skips when enableHotReload=false', () => {
      // Arrange: Hot-reload disabled
      LIFEOS_CONFIG.customInstructions = {
        filePath: '/path/to/instructions.md',
        enableHotReload: false
      };

      // Act
      const result = InstructionProcessor.initializeWatcher();

      // Assert: Should skip initialization
      expect(result.success).toBe(false);
      expect(result.error).toContain('Hot-reload not enabled');
      expect(fs.watch).not.toHaveBeenCalled();
    });

    it('initializes watcher when conditions met', () => {
      // Arrange: All conditions met
      const filePath = '/path/to/instructions.md';
      LIFEOS_CONFIG.customInstructions = {
        filePath,
        enableHotReload: true
      };

      // Mock fs.watch to return a mock watcher
      const mockWatcher = {
        close: jest.fn()
      };
      (fs.watch as jest.Mock).mockReturnValue(mockWatcher);

      // Act
      const result = InstructionProcessor.initializeWatcher();

      // Assert: Should initialize successfully
      expect(result.success).toBe(true);
      expect(result.watchedPath).toBe(filePath);
      expect(fs.watch).toHaveBeenCalledWith(filePath, expect.any(Function));
    });

    it('is idempotent (skips if already initialized)', () => {
      // Arrange: Initialize once
      const filePath = '/path/to/instructions.md';
      LIFEOS_CONFIG.customInstructions = {
        filePath,
        enableHotReload: true
      };

      const mockWatcher = { close: jest.fn() };
      (fs.watch as jest.Mock).mockReturnValue(mockWatcher);

      // Act: Initialize twice
      const result1 = InstructionProcessor.initializeWatcher();
      const result2 = InstructionProcessor.initializeWatcher();

      // Assert: Second call should skip (idempotent)
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(fs.watch).toHaveBeenCalledTimes(1); // Only called once
    });

    it('handles watcher initialization errors gracefully', () => {
      // Arrange: fs.watch throws error
      const filePath = '/invalid/path/instructions.md';
      LIFEOS_CONFIG.customInstructions = {
        filePath,
        enableHotReload: true
      };

      const watchError = new Error('ENOENT: no such file or directory');
      (fs.watch as jest.Mock).mockImplementation(() => {
        throw watchError;
      });

      // Spy on logger.error
      const errorSpy = jest.spyOn(require('../../src/shared/logger.js').logger, 'error');

      // Act
      const result = InstructionProcessor.initializeWatcher();

      // Assert: Should handle error gracefully
      expect(result.success).toBe(false);
      expect(result.error).toBe(watchError.message);
      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to initialize file watcher',
        expect.objectContaining({
          error: watchError.message,
          filePath
        })
      );

      errorSpy.mockRestore();
    });

    it('calls clearCache() when file changes', () => {
      // Arrange: Initialize watcher
      const filePath = '/path/to/instructions.md';
      LIFEOS_CONFIG.customInstructions = {
        filePath,
        enableHotReload: true
      };

      let changeCallback: (eventType: string) => void = () => {};
      (fs.watch as jest.Mock).mockImplementation((path, callback) => {
        changeCallback = callback;
        return { close: jest.fn() };
      });

      InstructionProcessor.initializeWatcher();

      // Spy on clearCache (indirectly via logger)
      const debugSpy = jest.spyOn(require('../../src/shared/logger.js').logger, 'debug');
      const infoSpy = jest.spyOn(require('../../src/shared/logger.js').logger, 'info');

      // Act: Simulate file change
      changeCallback('change');

      // Assert: clearCache should be called (logs debug message)
      expect(infoSpy).toHaveBeenCalledWith(
        'Custom instructions file changed, clearing cache',
        expect.objectContaining({ filePath })
      );
      expect(debugSpy).toHaveBeenCalledWith('Custom instructions cache cleared');

      debugSpy.mockRestore();
      infoSpy.mockRestore();
    });
  });

  describe('clearCache()', () => {
    it('clears cached instructions', () => {
      // Note: Since cachedInstructions is private, we test indirectly
      // by verifying the debug log is called

      // Arrange
      const debugSpy = jest.spyOn(require('../../src/shared/logger.js').logger, 'debug');

      // Act
      InstructionProcessor.clearCache();

      // Assert: Debug log should be called
      expect(debugSpy).toHaveBeenCalledWith('Custom instructions cache cleared');

      debugSpy.mockRestore();
    });
  });

  describe('cleanup()', () => {
    it('closes watcher if exists', () => {
      // Arrange: Initialize watcher
      const filePath = '/path/to/instructions.md';
      LIFEOS_CONFIG.customInstructions = {
        filePath,
        enableHotReload: true
      };

      const mockClose = jest.fn();
      const mockWatcher = { close: mockClose };
      (fs.watch as jest.Mock).mockReturnValue(mockWatcher);

      InstructionProcessor.initializeWatcher();

      // Act
      InstructionProcessor.cleanup();

      // Assert: Watcher should be closed
      expect(mockClose).toHaveBeenCalled();
    });

    it('resets initialization flag', () => {
      // Arrange: Initialize watcher
      const filePath = '/path/to/instructions.md';
      LIFEOS_CONFIG.customInstructions = {
        filePath,
        enableHotReload: true
      };

      const mockWatcher = { close: jest.fn() };
      (fs.watch as jest.Mock).mockReturnValue(mockWatcher);

      InstructionProcessor.initializeWatcher();

      // Act: Cleanup, then try to initialize again
      InstructionProcessor.cleanup();
      (fs.watch as jest.Mock).mockClear(); // Clear mock call count
      InstructionProcessor.initializeWatcher();

      // Assert: Should be able to initialize again (flag was reset)
      expect(fs.watch).toHaveBeenCalled();
    });

    it('clears cache', () => {
      // Arrange
      const debugSpy = jest.spyOn(require('../../src/shared/logger.js').logger, 'debug');

      // Act
      InstructionProcessor.cleanup();

      // Assert: clearCache should be called (logs debug message)
      expect(debugSpy).toHaveBeenCalledWith('Custom instructions cache cleared');

      debugSpy.mockRestore();
    });

    it('handles cleanup when no watcher exists', () => {
      // Arrange: No watcher initialized
      // (nothing to do)

      // Act: Should not throw
      expect(() => {
        InstructionProcessor.cleanup();
      }).not.toThrow();
    });
  });

  describe('Integration: Pass-Through Behavior', () => {
    it('maintains existing behavior with no config', () => {
      // Arrange: No custom instructions configured
      LIFEOS_CONFIG.customInstructions = undefined;

      // Act: Get instructions and apply them
      const instructions = InstructionProcessor.getInstructions();
      const context: InstructionContext = {
        operation: 'create',
        noteType: 'daily'
      };
      const result = InstructionProcessor.applyInstructions(context);

      // Assert: Pure pass-through behavior
      expect(instructions.instructions).toBeNull();
      expect(result.context).toEqual(context);
      expect(result.modified).toBe(false);
    });

    it('maintains existing behavior with inline config', () => {
      // Arrange: Configure inline instructions
      LIFEOS_CONFIG.customInstructions = {
        inline: {
          noteCreationRules: 'Some rules',
          editingRules: 'Some rules',
          templateRules: 'Some rules'
        }
      };

      // Act: Get instructions and apply them
      const instructions = InstructionProcessor.getInstructions();
      const context: InstructionContext = {
        operation: 'edit',
        noteType: 'restaurant',
        existingContent: '# Restaurant Note'
      };
      const result = InstructionProcessor.applyInstructions(context);

      // Assert: Instructions retrieved and rules detected
      expect(instructions.instructions).toBeDefined();
      expect(instructions.source).toBe('inline');
      expect(result.context).toEqual(context);
      expect(result.modified).toBe(true); // Phase 2: Rules detected and logged
      expect(result.appliedRules.length).toBeGreaterThan(0);
    });
  });

  // MCP-150 - Rule Parsing and Application Tests
  describe('MCP-150: Rule Parsing and Application', () => {
    describe('Note-type normalization', () => {
      it('normalizes daily to dailyNotes', () => {
        // Arrange: Configure with dailyNotes rules
        const rulesJson = JSON.stringify({
          general: { urlFieldName: 'source' },
          dailyNotes: {
            yaml: { tags: ['dailyNote'] },
            filenameFormat: 'YYYY-MM-DD'
          }
        });

        LIFEOS_CONFIG.customInstructions = {
          inline: { noteCreationRules: rulesJson }
        };

        const context: InstructionContext = {
          operation: 'create',
          noteType: 'daily' // Template key, not config key
        };

        // Act
        const result = InstructionProcessor.applyInstructions(context);

        // Assert: Should find dailyNotes rules via normalization
        expect(result.modified).toBe(true);
        expect((result.context as any).modifiedFrontmatter).toEqual({ tags: ['dailyNote'] });
        expect((result.context as any).modifiedTitle).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      });

      it('normalizes placetovisit to placeToVisit', () => {
        // Arrange
        const rulesJson = JSON.stringify({
          placeToVisit: {
            yaml: { category: 'Travel' }
          }
        });

        LIFEOS_CONFIG.customInstructions = {
          inline: { noteCreationRules: rulesJson }
        };

        const context: InstructionContext = {
          operation: 'create',
          noteType: 'placetovisit'
        };

        // Act
        const result = InstructionProcessor.applyInstructions(context);

        // Assert
        expect(result.modified).toBe(true);
        expect((result.context as any).modifiedFrontmatter).toEqual({ category: 'Travel' });
      });

      it('normalizes books to book', () => {
        // Arrange
        const rulesJson = JSON.stringify({
          book: {
            yaml: { contentType: 'Reference' }
          }
        });

        LIFEOS_CONFIG.customInstructions = {
          inline: { noteCreationRules: rulesJson }
        };

        const context: InstructionContext = {
          operation: 'create',
          noteType: 'books'
        };

        // Act
        const result = InstructionProcessor.applyInstructions(context);

        // Assert
        expect(result.modified).toBe(true);
        expect((result.context as any).modifiedFrontmatter).toEqual({ contentType: 'Reference' });
      });
    });

    describe('General rule merging', () => {
      it('merges general rules with note-specific rules', () => {
        // Arrange
        const rulesJson = JSON.stringify({
          general: {
            urlFieldName: 'source',
            forbiddenValues: ['Documentation']
          },
          restaurant: {
            yaml: { tags: ['food', 'toronto'], category: 'Restaurant' }
          }
        });

        LIFEOS_CONFIG.customInstructions = {
          inline: { noteCreationRules: rulesJson }
        };

        const context: InstructionContext = {
          operation: 'create',
          noteType: 'restaurant'
        };

        // Act
        const result = InstructionProcessor.applyInstructions(context);

        // Assert: Should have both general and restaurant-specific rules
        expect(result.modified).toBe(true);
        expect((result.context as any).modifiedFrontmatter).toEqual({
          tags: ['food', 'toronto'],
          category: 'Restaurant'
        });
        // Note: general rules are merged at parse time, validated in context
      });

      it('note-specific rules override general rules', () => {
        // Arrange
        const rulesJson = JSON.stringify({
          general: {
            yaml: { tags: ['general'] }
          },
          restaurant: {
            yaml: { tags: ['food', 'toronto'] } // Should override general
          }
        });

        LIFEOS_CONFIG.customInstructions = {
          inline: { noteCreationRules: rulesJson }
        };

        const context: InstructionContext = {
          operation: 'create',
          noteType: 'restaurant'
        };

        // Act
        const result = InstructionProcessor.applyInstructions(context);

        // Assert: Restaurant-specific tags should override general
        expect((result.context as any).modifiedFrontmatter).toEqual({
          tags: ['food', 'toronto']
        });
      });
    });

    describe('Filename format application', () => {
      it('applies YYYY-MM-DD format for daily notes', () => {
        // Arrange
        const rulesJson = JSON.stringify({
          dailyNotes: {
            filenameFormat: 'YYYY-MM-DD'
          }
        });

        LIFEOS_CONFIG.customInstructions = {
          inline: { noteCreationRules: rulesJson }
        };

        const context: InstructionContext = {
          operation: 'create',
          noteType: 'daily'
        };

        // Act
        const result = InstructionProcessor.applyInstructions(context);

        // Assert
        expect(result.modified).toBe(true);
        expect((result.context as any).modifiedTitle).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(result.appliedRules).toContain('naming:format');
      });

      it('handles invalid format gracefully', () => {
        // Arrange
        const rulesJson = JSON.stringify({
          dailyNotes: {
            filenameFormat: 'INVALID_FORMAT_XYZ'
          }
        });

        LIFEOS_CONFIG.customInstructions = {
          inline: { noteCreationRules: rulesJson }
        };

        const context: InstructionContext = {
          operation: 'create',
          noteType: 'daily'
        };

        // Act & Assert: Should not crash (graceful degradation)
        expect(() => {
          const result = InstructionProcessor.applyInstructions(context);
          // Invalid format produces a date anyway (date-fns is permissive)
          // OR modifiedTitle is undefined (depending on format validity)
          expect(result.modified).toBeDefined();
        }).not.toThrow();
      });
    });

    describe('YAML defaults application', () => {
      it('applies YAML defaults from rules', () => {
        // Arrange
        const rulesJson = JSON.stringify({
          restaurant: {
            yaml: {
              tags: ['food', 'toronto'],
              category: 'Restaurant',
              'content type': ['Reference']
            }
          }
        });

        LIFEOS_CONFIG.customInstructions = {
          inline: { noteCreationRules: rulesJson }
        };

        const context: InstructionContext = {
          operation: 'create',
          noteType: 'restaurant'
        };

        // Act
        const result = InstructionProcessor.applyInstructions(context);

        // Assert
        expect(result.modified).toBe(true);
        expect((result.context as any).modifiedFrontmatter).toEqual({
          tags: ['food', 'toronto'],
          category: 'Restaurant',
          'content type': ['Reference']
        });
        expect(result.appliedRules).toContain('yaml:defaults');
      });
    });

    describe('Content structure application', () => {
      it('applies requiredHeadings boilerplate', () => {
        // Arrange
        const rulesJson = JSON.stringify({
          dailyNotes: {
            contentStructure: {
              requiredHeadings: ["Day's Notes", "Linked Notes", "Notes Created On This Day"]
            }
          }
        });

        LIFEOS_CONFIG.customInstructions = {
          inline: { noteCreationRules: rulesJson }
        };

        const context: InstructionContext = {
          operation: 'create',
          noteType: 'daily'
        };

        // Act
        const result = InstructionProcessor.applyInstructions(context);

        // Assert
        expect(result.modified).toBe(true);
        expect((result.context as any).modifiedContent).toContain("## Day's Notes");
        expect((result.context as any).modifiedContent).toContain("## Linked Notes");
        expect((result.context as any).modifiedContent).toContain("## Notes Created On This Day");
        expect(result.appliedRules).toContain('content:structure');
      });
    });

    describe('Complete integration scenarios', () => {
      it('applies all rule types together (YAML + content + filename)', () => {
        // Arrange: Full daily note configuration
        const rulesJson = JSON.stringify({
          general: { urlFieldName: 'source' },
          dailyNotes: {
            filenameFormat: 'YYYY-MM-DD',
            yaml: {
              tags: ['dailyNote'],
              'content type': ['Daily Note']
            },
            contentStructure: {
              requiredHeadings: ["Day's Notes", "Linked Notes"]
            }
          }
        });

        LIFEOS_CONFIG.customInstructions = {
          inline: { noteCreationRules: rulesJson }
        };

        const context: InstructionContext = {
          operation: 'create',
          noteType: 'daily'
        };

        // Act
        const result = InstructionProcessor.applyInstructions(context);

        // Assert: All modifications applied
        expect(result.modified).toBe(true);
        expect((result.context as any).modifiedTitle).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect((result.context as any).modifiedFrontmatter).toEqual({
          tags: ['dailyNote'],
          'content type': ['Daily Note']
        });
        expect((result.context as any).modifiedContent).toContain("## Day's Notes");
        expect((result.context as any).modifiedContent).toContain("## Linked Notes");
        expect(result.appliedRules).toEqual(
          expect.arrayContaining(['yaml:defaults', 'content:structure', 'naming:format'])
        );
      });
    });
  });
});
