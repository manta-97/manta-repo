import { parseTaskFileContent, serializeTaskFileContent } from './task-files';

describe('parseTaskFileContent', () => {
  it('should parse valid frontmatter and return fields with body', () => {
    const content = [
      '---',
      'id: task-1',
      'title: Build the CLI',
      'created: 2026-06-10',
      '---',
      '',
      'Free-form body.',
      '',
    ].join('\n');

    const result = parseTaskFileContent(content);

    expect(result).toEqual({
      ok: true,
      frontmatter: { id: 'task-1', title: 'Build the CLI', created: '2026-06-10' },
      body: 'Free-form body.\n',
    });
  });

  it('should keep colons inside the title value', () => {
    const content = [
      '---',
      'id: task-2',
      'title: fix: handle empty list',
      'created: 2026-06-10',
      '---',
    ].join('\n');

    const result = parseTaskFileContent(content);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.frontmatter.title).toBe('fix: handle empty list');
    }
  });

  it('should return empty body when file has frontmatter only', () => {
    const content = ['---', 'id: task-3', 'title: t', 'created: 2026-06-10', '---', ''].join('\n');

    const result = parseTaskFileContent(content);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.body).toBe('');
    }
  });

  it('should fail when frontmatter opening is missing', () => {
    const result = parseTaskFileContent('just some text');

    expect(result).toEqual({ ok: false, reason: 'missing frontmatter opening ---' });
  });

  it('should fail when frontmatter closing is missing', () => {
    const content = ['---', 'id: task-1', 'title: t', 'created: 2026-06-10'].join('\n');

    const result = parseTaskFileContent(content);

    expect(result).toEqual({ ok: false, reason: 'missing frontmatter closing ---' });
  });

  it('should fail when a required field is missing', () => {
    const content = ['---', 'id: task-1', 'created: 2026-06-10', '---'].join('\n');

    const result = parseTaskFileContent(content);

    expect(result).toEqual({ ok: false, reason: 'missing frontmatter field: title' });
  });

  it('should fail when a frontmatter line has no colon', () => {
    const content = [
      '---',
      'id: task-1',
      'broken line',
      'title: t',
      'created: 2026-06-10',
      '---',
    ].join('\n');

    const result = parseTaskFileContent(content);

    expect(result).toEqual({ ok: false, reason: 'invalid frontmatter line: broken line' });
  });
});

describe('serializeTaskFileContent', () => {
  it('should serialize frontmatter with empty body as header only', () => {
    const result = serializeTaskFileContent(
      { id: 'task-1', title: 'Build the CLI', created: '2026-06-10' },
      '',
    );

    expect(result).toBe(
      ['---', 'id: task-1', 'title: Build the CLI', 'created: 2026-06-10', '---', ''].join('\n'),
    );
  });

  it('should separate body from frontmatter with one blank line', () => {
    const result = serializeTaskFileContent(
      { id: 'task-1', title: 't', created: '2026-06-10' },
      'Body text.',
    );

    expect(result).toBe(
      ['---', 'id: task-1', 'title: t', 'created: 2026-06-10', '---', '', 'Body text.', ''].join(
        '\n',
      ),
    );
  });

  it('should fold multi-line titles into a single line', () => {
    const result = serializeTaskFileContent(
      { id: 'task-1', title: 'line one\nline two', created: '2026-06-10' },
      '',
    );

    expect(result).toContain('title: line one line two');
  });

  it('should round-trip through parseTaskFileContent', () => {
    const serialized = serializeTaskFileContent(
      { id: 'task-9', title: 'round trip', created: '2026-06-10' },
      '## Notes\n\nsome notes\n',
    );

    const parsed = parseTaskFileContent(serialized);

    expect(parsed).toEqual({
      ok: true,
      frontmatter: { id: 'task-9', title: 'round trip', created: '2026-06-10' },
      body: '## Notes\n\nsome notes\n',
    });
  });
});
