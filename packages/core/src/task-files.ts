export interface TaskFileFrontmatter {
  id: string;
  title: string;
  created: string;
}

export type ParseTaskFileResult =
  | { ok: true; frontmatter: TaskFileFrontmatter; body: string }
  | { ok: false; reason: string };

const FRONTMATTER_DELIMITER = '---';
const REQUIRED_FRONTMATTER_KEYS = ['id', 'title', 'created'] as const;

/**
 * task 파일의 frontmatter를 파싱한다.
 *
 * core는 런타임 의존성을 두지 않으므로 YAML 라이브러리 대신 수제 파서를 쓴다.
 * 파일 계약이 `key: value` 한 줄짜리 3필드(id/title/created)로 고정되어 있어
 * 범용 YAML이 필요 없다 — 계약이 단순하니 파서도 단순해야 한다.
 */
export function parseTaskFileContent(content: string): ParseTaskFileResult {
  const lines = content.split('\n');

  if (lines[0] !== FRONTMATTER_DELIMITER) {
    return { ok: false, reason: 'missing frontmatter opening ---' };
  }

  const closingDelimiterIndex = lines.indexOf(FRONTMATTER_DELIMITER, 1);
  if (closingDelimiterIndex === -1) {
    return { ok: false, reason: 'missing frontmatter closing ---' };
  }

  const frontmatterFields: Record<string, string> = {};
  for (const line of lines.slice(1, closingDelimiterIndex)) {
    if (line.trim() === '') {
      continue;
    }
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) {
      return { ok: false, reason: `invalid frontmatter line: ${line.trim()}` };
    }
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim();
    frontmatterFields[key] = value;
  }

  for (const requiredKey of REQUIRED_FRONTMATTER_KEYS) {
    if (!frontmatterFields[requiredKey]) {
      return { ok: false, reason: `missing frontmatter field: ${requiredKey}` };
    }
  }

  let bodyLines = lines.slice(closingDelimiterIndex + 1);
  // 닫는 구분선 직후의 빈 줄 하나는 포맷의 일부이지 본문이 아니다.
  if (bodyLines[0] === '') {
    bodyLines = bodyLines.slice(1);
  }

  return {
    ok: true,
    frontmatter: {
      id: frontmatterFields.id,
      title: frontmatterFields.title,
      created: frontmatterFields.created,
    },
    body: bodyLines.join('\n'),
  };
}

export function serializeTaskFileContent(frontmatter: TaskFileFrontmatter, body: string): string {
  // title에 개행이 들어가면 한 줄 frontmatter 계약이 깨지므로 한 줄로 접는다.
  const singleLineTitle = frontmatter.title.replace(/\s+/g, ' ').trim();

  const header = [
    FRONTMATTER_DELIMITER,
    `id: ${frontmatter.id}`,
    `title: ${singleLineTitle}`,
    `created: ${frontmatter.created}`,
    FRONTMATTER_DELIMITER,
  ].join('\n');

  if (body.trim() === '') {
    return header + '\n';
  }
  return header + '\n\n' + body.replace(/\n*$/, '\n');
}
