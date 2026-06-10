import { sectionKeepPriority, splitBodyIntoSections } from './task-sections';

describe('splitBodyIntoSections', () => {
  it('should treat a body without headings as a single preamble', () => {
    const sections = splitBodyIntoSections('just some text\nover two lines');

    expect(sections).toEqual([{ heading: null, content: 'just some text\nover two lines' }]);
  });

  it('should split on level-2 headings and keep heading lines in content', () => {
    const body = ['intro line', '## Intent', 'why we did it', '## Result', 'what happened'].join(
      '\n',
    );

    const sections = splitBodyIntoSections(body);

    expect(sections).toEqual([
      { heading: null, content: 'intro line' },
      { heading: 'Intent', content: '## Intent\nwhy we did it' },
      { heading: 'Result', content: '## Result\nwhat happened' },
    ]);
  });

  it('should not emit an empty preamble when body starts with a heading', () => {
    const sections = splitBodyIntoSections('## Notes\nsome notes');

    expect(sections).toEqual([{ heading: 'Notes', content: '## Notes\nsome notes' }]);
  });

  it('should not treat level-3 headings as section boundaries', () => {
    const sections = splitBodyIntoSections('## Decisions\n### sub-point\ndetail');

    expect(sections).toHaveLength(1);
    expect(sections[0].heading).toBe('Decisions');
  });

  it('should return no sections for an empty body', () => {
    expect(splitBodyIntoSections('')).toEqual([]);
  });
});

describe('sectionKeepPriority', () => {
  it('should keep Result first and Notes last', () => {
    const headings = ['Notes', 'Result', 'Intent', 'Decisions', 'Anything', null];

    const sorted = [...headings].sort((a, b) => sectionKeepPriority(a) - sectionKeepPriority(b));

    expect(sorted[0]).toBe('Result');
    expect(sorted[1]).toBe('Decisions');
    expect(sorted[2]).toBe('Intent');
    expect(sorted[sorted.length - 1]).toBe('Notes');
  });
});
