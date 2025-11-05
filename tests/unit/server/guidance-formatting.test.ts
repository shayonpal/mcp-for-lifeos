/**
 * Unit tests for MCP-121: Note Guidance Formatting
 * Tests formatGuidanceText function and guidance metadata integration
 */

import type { NoteGuidanceMetadata } from '../../../src/shared/types.js';
import { formatGuidanceText } from '../../../src/server/handlers/consolidated-handlers.js';

describe('formatGuidanceText()', () => {
  describe('Priority 1: Complete guidance rendering', () => {
    it('should format complete guidance with all fields', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'restaurant',
        requiredYAML: ['content type', 'category', 'tags'],
        headings: ['Remarks', 'Visit History'],
        temporalHints: 'Use YYYY-MM-DD format',
        timezone: 'America/Toronto (EST)'
      };

      const result = formatGuidanceText(guidance);

      expect(result).toContain('📋 **Note Formatting Guidance**');
      expect(result).toContain('• **Note Type**: restaurant');
      expect(result).toContain('• **Required YAML Fields**: content type, category, tags');
      expect(result).toContain('• **Expected Headings**: Remarks, Visit History');
      expect(result).toContain('• **Date Format**: Use YYYY-MM-DD format');
      expect(result).toContain('• **Timezone**: America/Toronto (EST)');
    });

    it('should format daily note guidance', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'daily',
        requiredYAML: ['date', 'tags'],
        headings: ["Day's Notes", 'Tasks', 'Reflections'],
        temporalHints: 'Use YYYY-MM-DD for file naming',
        timezone: 'America/Toronto (EST)'
      };

      const result = formatGuidanceText(guidance);

      expect(result).toContain('• **Note Type**: daily');
      expect(result).toContain('• **Required YAML Fields**: date, tags');
      expect(result).toContain("• **Expected Headings**: Day's Notes, Tasks, Reflections");
    });

    it('should format recipe guidance', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'recipe',
        requiredYAML: ['content type', 'category', 'cuisine', 'tags'],
        headings: ['Ingredients', 'Instructions', 'Notes'],
        timezone: 'America/Toronto (EST)'
      };

      const result = formatGuidanceText(guidance);

      expect(result).toContain('• **Note Type**: recipe');
      expect(result).toContain('• **Required YAML Fields**: content type, category, cuisine, tags');
      expect(result).toContain('• **Expected Headings**: Ingredients, Instructions, Notes');
    });
  });

  describe('Priority 2: Partial guidance handling', () => {
    it('should handle guidance with only noteType', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'article'
      };

      const result = formatGuidanceText(guidance);

      expect(result).toContain('📋 **Note Formatting Guidance**');
      expect(result).toContain('• **Note Type**: article');
      expect(result).not.toContain('Required YAML Fields');
      expect(result).not.toContain('Expected Headings');
    });

    it('should handle guidance with only YAML fields', () => {
      const guidance: NoteGuidanceMetadata = {
        requiredYAML: ['tags', 'category']
      };

      const result = formatGuidanceText(guidance);

      expect(result).toContain('📋 **Note Formatting Guidance**');
      expect(result).toContain('• **Required YAML Fields**: tags, category');
      expect(result).not.toContain('Note Type');
    });

    it('should handle guidance with only timezone', () => {
      const guidance: NoteGuidanceMetadata = {
        timezone: 'America/New_York (EDT)'
      };

      const result = formatGuidanceText(guidance);

      expect(result).toContain('📋 **Note Formatting Guidance**');
      expect(result).toContain('• **Timezone**: America/New_York (EDT)');
    });

    it('should handle mixed partial guidance', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'person',
        headings: ['Biography', 'Contact Info'],
        timezone: 'America/Toronto (EST)'
      };

      const result = formatGuidanceText(guidance);

      expect(result).toContain('• **Note Type**: person');
      expect(result).toContain('• **Expected Headings**: Biography, Contact Info');
      expect(result).toContain('• **Timezone**: America/Toronto (EST)');
      expect(result).not.toContain('Required YAML Fields');
      expect(result).not.toContain('Date Format');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty guidance object', () => {
      const guidance: NoteGuidanceMetadata = {};

      const result = formatGuidanceText(guidance);

      // Empty guidance should still include header with proper formatting
      expect(result).toBe('\n---\n📋 **Note Formatting Guidance**');
    });

    it('should skip empty requiredYAML array', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'article',
        requiredYAML: []
      };

      const result = formatGuidanceText(guidance);

      expect(result).toContain('• **Note Type**: article');
      expect(result).not.toContain('Required YAML Fields');
    });

    it('should skip empty headings array', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'recipe',
        headings: []
      };

      const result = formatGuidanceText(guidance);

      expect(result).toContain('• **Note Type**: recipe');
      expect(result).not.toContain('Expected Headings');
    });

    it('should handle single-item arrays', () => {
      const guidance: NoteGuidanceMetadata = {
        requiredYAML: ['tags'],
        headings: ['Notes']
      };

      const result = formatGuidanceText(guidance);

      expect(result).toContain('• **Required YAML Fields**: tags');
      expect(result).toContain('• **Expected Headings**: Notes');
    });

    it('should handle undefined arrays vs empty arrays', () => {
      const guidance1: NoteGuidanceMetadata = {
        noteType: 'test',
        requiredYAML: undefined,
        headings: undefined
      };

      const guidance2: NoteGuidanceMetadata = {
        noteType: 'test',
        requiredYAML: [],
        headings: []
      };

      const result1 = formatGuidanceText(guidance1);
      const result2 = formatGuidanceText(guidance2);

      // Both should produce identical output (skipping empty arrays)
      expect(result1).toBe(result2);
      expect(result1).not.toContain('Required YAML Fields');
      expect(result1).not.toContain('Expected Headings');
    });
  });

  describe('Token Efficiency', () => {
    it('should produce concise output respecting token caps', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'restaurant',
        requiredYAML: ['content type', 'category', 'tags', 'location', 'cuisine'],
        headings: ['Overview', 'Menu', 'Experience'],
        temporalHints: 'Include visit dates in YYYY-MM-DD format',
        timezone: 'America/Toronto (EST)'
      };

      const result = formatGuidanceText(guidance);

      // Verify capped at 5 YAML fields (per NoteGuidanceMetadata docs)
      const yamlMatch = result.match(/Required YAML Fields.*$/m);
      expect(yamlMatch).toBeTruthy();
      const yamlFields = yamlMatch![0].split(': ')[1].split(', ');
      expect(yamlFields.length).toBeLessThanOrEqual(5);

      // Verify capped at 3 headings (per NoteGuidanceMetadata docs)
      const headingsMatch = result.match(/Expected Headings.*$/m);
      expect(headingsMatch).toBeTruthy();
      const headings = headingsMatch![0].split(': ')[1].split(', ');
      expect(headings.length).toBeLessThanOrEqual(3);
    });

    it('should produce minimal output for minimal guidance', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'note'
      };

      const result = formatGuidanceText(guidance);
      const lineCount = result.split('\n').length;

      // Actual format: empty line + separator + title + field = 4 lines
      expect(lineCount).toBe(4);

      // Verify it's still concise
      expect(result.length).toBeLessThan(100);
    });
  });

  describe('Real-World Scenarios', () => {
    it('should format restaurant note guidance from MCP-150 integration', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'restaurant',
        requiredYAML: ['content type', 'category', 'tags'],
        headings: ['Remarks'],
        timezone: 'America/Toronto (EST)'
      };

      const result = formatGuidanceText(guidance);

      // Verify LLM-visible content structure
      expect(result).toMatch(/^[\s\S]*---[\s\S]*📋 \*\*Note Formatting Guidance\*\*/);
      expect(result).toContain('restaurant');
      expect(result).toContain('content type, category, tags');
      expect(result).toContain('America/Toronto (EST)');
    });

    it('should format guidance for notes without custom instructions', () => {
      // When no custom instructions match, InstructionProcessor returns undefined
      const guidance: NoteGuidanceMetadata = {
        timezone: 'America/Toronto (EST)'
      };

      const result = formatGuidanceText(guidance);

      // Should still provide timezone context
      expect(result).toContain('📋 **Note Formatting Guidance**');
      expect(result).toContain('• **Timezone**: America/Toronto (EST)');
    });

    it('should handle guidance with special characters in headings', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'daily',
        headings: ["Day's Notes", "Today's Tasks", "Week's Goals"]
      };

      const result = formatGuidanceText(guidance);

      expect(result).toContain("Day's Notes, Today's Tasks, Week's Goals");
    });

    it('should format guidance consistently with Markdown formatting', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'article',
        requiredYAML: ['source', 'author', 'date', 'tags'],
        headings: ['Summary', 'Key Points', 'References'],
        temporalHints: 'Use ISO 8601 format for publication dates'
      };

      const result = formatGuidanceText(guidance);

      // Verify Markdown bold formatting is consistent
      expect(result).toMatch(/\*\*Note Formatting Guidance\*\*/);
      expect(result).toMatch(/\*\*Note Type\*\*/);
      expect(result).toMatch(/\*\*Required YAML Fields\*\*/);
      expect(result).toMatch(/\*\*Expected Headings\*\*/);
      expect(result).toMatch(/\*\*Date Format\*\*/);

      // Verify bullet formatting
      expect(result).toMatch(/• \*\*Note Type\*\*:/);
      expect(result).toMatch(/• \*\*Required YAML Fields\*\*:/);
    });
  });

  describe('MCP Protocol Compliance', () => {
    it('CRITICAL: guidance must be in content text, not _meta', () => {
      // This test documents the critical discovery from MCP-121
      // _meta is NOT visible to LLM - only content text is forwarded
      const guidance: NoteGuidanceMetadata = {
        noteType: 'restaurant',
        requiredYAML: ['content type', 'category'],
        timezone: 'America/Toronto (EST)'
      };

      const result = formatGuidanceText(guidance);

      // Verify result is plain text suitable for content field
      expect(typeof result).toBe('string');
      expect(result).not.toContain('_meta');
      expect(result).not.toContain('"content"');

      // Verify it's formatted for human/LLM readability
      expect(result).toContain('📋');
      expect(result).toContain('**');
      expect(result).toContain('•');
    });

    it('should format guidance for appending to tool response content', () => {
      const guidance: NoteGuidanceMetadata = {
        noteType: 'daily',
        requiredYAML: ['date', 'tags'],
        headings: ["Day's Notes"]
      };

      const result = formatGuidanceText(guidance);

      // Verify starts with separator for appending
      expect(result.startsWith('\n---')).toBe(true);

      // Verify ends without trailing separator (content continues)
      expect(result.endsWith('---')).toBe(false);
    });
  });
});
