import { Task } from './types';
import { buildContextDocument } from './build-context';

function buildTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    title: 'Fix OAuth login',
    created: '2026-06-10',
    status: 'done',
    filePath: '/project/manta/tasks/done/task-1.md',
    body: 'Some body text.\n',
    ...overrides,
  };
}

describe('buildContextDocument', () => {
  it('should render a titled document with task header, meta and body', () => {
    const document = buildContextDocument([buildTask()]);

    expect(document).toBe(
      [
        '# Manta Context',
        '',
        '## task-1 — Fix OAuth login',
        '',
        '- status: done',
        '- created: 2026-06-10',
        '',
        'Some body text.',
      ].join('\n'),
    );
  });

  it('should keep tasks in the caller-given order', () => {
    const document = buildContextDocument([
      buildTask({ id: 'task-4', title: 'later task' }),
      buildTask({ id: 'task-1', title: 'earlier task' }),
    ]);

    expect(document.indexOf('task-4')).toBeLessThan(document.indexOf('task-1'));
  });

  it('should omit the body block for tasks with empty bodies', () => {
    const document = buildContextDocument([buildTask({ body: '' })]);

    expect(document).toBe(
      [
        '# Manta Context',
        '',
        '## task-1 — Fix OAuth login',
        '',
        '- status: done',
        '- created: 2026-06-10',
      ].join('\n'),
    );
  });

  it('should be deterministic for the same input', () => {
    const tasks = [buildTask(), buildTask({ id: 'task-2' })];

    expect(buildContextDocument(tasks, { maxChars: 150 })).toBe(
      buildContextDocument(tasks, { maxChars: 150 }),
    );
  });

  it('should return the full document when it fits within maxChars', () => {
    const fullDocument = buildContextDocument([buildTask()]);

    expect(buildContextDocument([buildTask()], { maxChars: fullDocument.length })).toBe(
      fullDocument,
    );
  });

  it('should never exceed maxChars', () => {
    const longBodyTask = buildTask({ body: 'long line of text\n'.repeat(200) });

    for (const maxChars of [10, 50, 120, 400, 2000]) {
      const document = buildContextDocument([longBodyTask, buildTask({ id: 'task-2' })], {
        maxChars,
      });
      expect(document.length).toBeLessThanOrEqual(maxChars);
    }
  });

  it('should drop Notes before Result when the budget forces a choice', () => {
    const sectionedTask = buildTask({
      body: [
        '## Notes',
        'scratch notes '.repeat(20),
        '## Result',
        'shipped the fix and all tests pass',
      ].join('\n'),
    });

    const fullLength = buildContextDocument([sectionedTask]).length;
    const document = buildContextDocument([sectionedTask], { maxChars: fullLength - 50 });

    expect(document).toContain('## Result');
    expect(document).toContain('shipped the fix');
    expect(document).not.toContain('scratch notes');
  });

  it('should keep surviving sections in original document order', () => {
    const sectionedTask = buildTask({
      body: [
        '## Intent',
        'the why',
        '## Notes',
        'noise '.repeat(50),
        '## Result',
        'the outcome',
      ].join('\n'),
    });

    const fullLength = buildContextDocument([sectionedTask]).length;
    const document = buildContextDocument([sectionedTask], { maxChars: fullLength - 100 });

    // Intent와 Result가 살아남되, 원문 순서(Intent → Result)를 유지해야 한다.
    expect(document.indexOf('## Intent')).toBeGreaterThan(0);
    expect(document.indexOf('## Intent')).toBeLessThan(document.indexOf('## Result'));
  });

  it('should hard-truncate the highest priority section when nothing fits whole', () => {
    const sectionedTask = buildTask({
      body: ['## Result', 'r'.repeat(500), '## Notes', 'n'.repeat(500)].join('\n'),
    });

    const document = buildContextDocument([sectionedTask], { maxChars: 200 });

    expect(document.length).toBeLessThanOrEqual(200);
    expect(document).toContain('## Result');
    expect(document).not.toContain('## Notes');
  });
});
