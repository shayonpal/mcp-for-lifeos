import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { VaultUtils } from '../../src/vault-utils.js';
import { LIFEOS_CONFIG } from '../../src/config.js';
import { writeFileSync, mkdirSync, rmSync, existsSync } from 'fs';
import { join } from 'path';

describe('VaultUtils.insertContent', () => {
  const testDir = join(LIFEOS_CONFIG.vaultPath, 'test-notes');
  const testNotePath = join(testDir, 'test-note.md');
  
  beforeEach(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });
  
  afterEach(() => {
    // Clean up test files
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  describe('Heading-based insertion', () => {
    it('should insert content after a heading', () => {
      // Create test note with headings
      const content = `---
title: Test Note
---

# Main Title

Some content here.

## Section One

First section content.

## Section Two

Second section content.
`;
      writeFileSync(testNotePath, content);
      
      // Insert content after Section One
      const result = VaultUtils.insertContent(
        testNotePath,
        '- New item added',
        { heading: '## Section One' },
        'after'
      );
      
      expect(result.content).toContain('## Section One\n\n- New item added\n\nFirst section content');
    });
    
    it('should insert content before a heading', () => {
      const content = `---
title: Test Note
---

# Main Title

## Tasks

- Task 1
- Task 2
`;
      writeFileSync(testNotePath, content);
      
      const result = VaultUtils.insertContent(
        testNotePath,
        '## New Section\n\nSome new content',
        { heading: '## Tasks' },
        'before'
      );
      
      expect(result.content).toContain('## New Section\n\nSome new content\n\n## Tasks');
    });
    
    it('should handle headings without hash prefix in target', () => {
      const content = `---
title: Test Note
---

# Main Title

## Today's Tasks

Tasks go here
`;
      writeFileSync(testNotePath, content);
      
      const result = VaultUtils.insertContent(
        testNotePath,
        '- New task',
        { heading: "Today's Tasks" }, // Without ## prefix
        'after'
      );
      
      expect(result.content).toContain("## Today's Tasks\n\n- New task");
    });
    
    it('should throw error if heading not found', () => {
      const content = `---
title: Test Note
---

# Main Title

Content here
`;
      writeFileSync(testNotePath, content);
      
      expect(() => {
        VaultUtils.insertContent(
          testNotePath,
          'New content',
          { heading: '## Non-existent Heading' },
          'after'
        );
      }).toThrow('Heading not found');
    });
  });
  
  describe('Block reference insertion', () => {
    it('should insert content after a block reference', () => {
      const content = `---
title: Test Note
---

# Main Title

This is an important paragraph. ^important-block

## Another Section
`;
      writeFileSync(testNotePath, content);
      
      const result = VaultUtils.insertContent(
        testNotePath,
        'Additional context about the important paragraph.',
        { blockRef: '^important-block' },
        'after'
      );
      
      expect(result.content).toContain('This is an important paragraph. ^important-block\n\nAdditional context');
    });
    
    it('should handle block ref without caret prefix', () => {
      const content = `---
title: Test Note
---

Decision made: Use TypeScript. ^decision-ts
`;
      writeFileSync(testNotePath, content);
      
      const result = VaultUtils.insertContent(
        testNotePath,
        'Rationale: Better type safety',
        { blockRef: 'decision-ts' }, // Without ^ prefix
        'after'
      );
      
      expect(result.content).toContain('^decision-ts\n\nRationale: Better type safety');
    });
  });
  
  describe('Pattern-based insertion', () => {
    it('should insert content after a text pattern', () => {
      const content = `---
title: Test Note
---

# Meeting Notes

Attendees: John, Jane, Bob

Topics discussed:
`;
      writeFileSync(testNotePath, content);
      
      const result = VaultUtils.insertContent(
        testNotePath,
        '\n- Budget review\n- Q4 planning',
        { pattern: 'Topics discussed:' },
        'after'
      );
      
      expect(result.content).toContain('Topics discussed:\n\n- Budget review\n- Q4 planning');
    });
    
    it('should throw error if pattern not found', () => {
      const content = `---
title: Test Note
---

# Content
`;
      writeFileSync(testNotePath, content);
      
      expect(() => {
        VaultUtils.insertContent(
          testNotePath,
          'New content',
          { pattern: 'Non-existent pattern' },
          'after'
        );
      }).toThrow('Pattern not found');
    });
  });
  
  describe('Line number insertion', () => {
    it('should insert content at specific line number', () => {
      const content = `---
title: Test Note
---
Line 1
Line 2
Line 3
Line 4`;
      writeFileSync(testNotePath, content);
      
      const result = VaultUtils.insertContent(
        testNotePath,
        'Inserted line',
        { lineNumber: 5 }, // After "Line 2"
        'after'
      );
      
      const lines = result.content.split('\n');
      expect(lines[5]).toBe('Inserted line');
    });
    
    it('should throw error if line number out of range', () => {
      const content = `---
title: Test Note
---
Line 1`;
      writeFileSync(testNotePath, content);
      
      expect(() => {
        VaultUtils.insertContent(
          testNotePath,
          'New content',
          { lineNumber: 100 },
          'after'
        );
      }).toThrow('Line number 100 is out of range');
    });
  });
  
  describe('Position options', () => {
    beforeEach(() => {
      const content = `---
title: Test Note
---

## Target Section

Target content here`;
      writeFileSync(testNotePath, content);
    });
    
    it('should append to end of target line', () => {
      const result = VaultUtils.insertContent(
        testNotePath,
        ' - appended',
        { heading: '## Target Section' },
        'append'
      );
      
      expect(result.content).toContain('## Target Section - appended');
    });
    
    it('should prepend to beginning of target line', () => {
      const result = VaultUtils.insertContent(
        testNotePath,
        'PREFIX: ',
        { heading: '## Target Section' },
        'prepend'
      );
      
      expect(result.content).toContain('PREFIX: ## Target Section');
    });
  });
  
  describe('Newline handling', () => {
    it('should ensure newlines by default', () => {
      const content = `---
title: Test Note
---
## Section
Content`;
      writeFileSync(testNotePath, content);
      
      const result = VaultUtils.insertContent(
        testNotePath,
        'New paragraph',
        { heading: '## Section' },
        'after',
        true // ensureNewline = true (default)
      );
      
      // Should have proper spacing
      expect(result.content).toContain('## Section\n\nNew paragraph\n\nContent');
    });
    
    it('should not add newlines when disabled', () => {
      const content = `---
title: Test Note
---
## Section
Content`;
      writeFileSync(testNotePath, content);
      
      const result = VaultUtils.insertContent(
        testNotePath,
        'inline',
        { heading: '## Section' },
        'append',
        false // ensureNewline = false
      );
      
      expect(result.content).toContain('## Sectioninline');
    });
  });
});