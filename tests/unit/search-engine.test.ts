import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import type { LifeOSNote } from '../../src/types.js';
import { QueryParser } from '../../src/query-parser.js';

jest.mock('../../src/vault-utils.js', () => ({
  VaultUtils: {
    findNotes: jest.fn(),
    readNote: jest.fn(),
    resetSingletons: jest.fn()
  }
}));

import { SearchEngine } from '../../src/search-engine.js';
import { VaultUtils } from '../../src/vault-utils.js';

describe('SearchEngine MCP-59 regressions', () => {
  const findNotesMock = VaultUtils.findNotes as jest.MockedFunction<typeof VaultUtils.findNotes>;
  const readNoteMock = VaultUtils.readNote as jest.MockedFunction<typeof VaultUtils.readNote>;

  const query = 'trip to india november planning';
  const firstNotePath = '/vault/projects/travel/first-note.md';
  const targetNotePath = '/Users/shayon/Library/Mobile Documents/iCloud~md~obsidian/Documents/LifeOS (iCloud)/20 - Areas/26 - Interests/Travel/Trip Planning/India Trip (Nov 24 - Dec 23, 2025).md';

  const makeNote = (path: string, frontmatter: LifeOSNote['frontmatter'], content: string): LifeOSNote => ({
    path,
    frontmatter,
    content,
    created: new Date('2025-09-01T10:00:00Z'),
    modified: new Date('2025-10-01T12:00:00Z')
  });

  beforeEach(() => {
    jest.clearAllMocks();
    SearchEngine.clearCache();
  });

  it('returns matches for all_terms queries after evaluating multiple notes', async () => {
    const firstNote = makeNote(
      firstNotePath,
      { title: 'Travel Brainstorm' },
      [
        'Trip to India November planning kickoff happens next week.',
        'This content is intentionally long to grow the regex lastIndex.',
        'X'.repeat(600)
      ].join('\n')
    );

    const targetNote = makeNote(
      targetNotePath,
      { title: 'India Trip (Nov 24 - Dec 23, 2025)' },
      [
        'Planning checklist:',
        'trip to',
        'india schedule review',
        'November planning milestones'
      ].join('\n')
    );

    const notesByPath: Record<string, LifeOSNote> = {
      [firstNotePath]: firstNote,
      [targetNotePath]: targetNote
    };

    findNotesMock.mockResolvedValue([firstNotePath, targetNotePath]);
    readNoteMock.mockImplementation((path: string) => {
      const note = notesByPath[path];
      if (!note) {
        throw new Error(`Unexpected read for path: ${path}`);
      }
      return note;
    });

    const parsed = QueryParser.parse(query);
    const pattern = QueryParser.createPatterns(parsed.terms, 'all_terms', false)[0];
    pattern.lastIndex = 0;
    const combinedText = [
      targetNote.frontmatter.title ?? '',
      'India Trip (Nov 24 - Dec 23, 2025)',
      targetNote.content
    ].join('\n');
    throw new Error(`pattern:${pattern.source}\ncombined:${combinedText}`);

    const results = await SearchEngine.search({ query, includeContent: true });

    expect(results.length).toBeGreaterThan(0);
    const resultPaths = results.map(result => result.note.path);
    expect(resultPaths).toContain(targetNotePath);
  });
});
