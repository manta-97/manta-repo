/**
 * task 본문의 선택적 섹션 인식 (Phase 5: Lightweight History).
 *
 * `## Intent`, `## Notes`, `## Decisions`, `## Result` 같은 2단계 헤딩을
 * 섹션 경계로 본다. 섹션은 있으면 활용하고, 없어도 모든 기능이 동작해야 한다 —
 * 헤딩이 하나도 없는 본문은 전체가 preamble이다.
 */

export interface TaskBodySection {
  /** 헤딩 텍스트. preamble(첫 헤딩 이전 본문)은 null이다. */
  heading: string | null;
  /** 헤딩 줄을 포함한 섹션 원문. */
  content: string;
}

const SECTION_HEADING_PATTERN = /^## +(.+?) *$/;

export function splitBodyIntoSections(body: string): TaskBodySection[] {
  const lines = body.split('\n');
  const sections: TaskBodySection[] = [];

  let currentHeading: string | null = null;
  let currentLines: string[] = [];

  const flushCurrentSection = () => {
    const content = currentLines.join('\n');
    if (currentHeading !== null || content.trim() !== '') {
      sections.push({ heading: currentHeading, content });
    }
  };

  for (const line of lines) {
    const headingMatch = line.match(SECTION_HEADING_PATTERN);
    if (headingMatch) {
      flushCurrentSection();
      currentHeading = headingMatch[1];
      currentLines = [line];
    } else {
      currentLines.push(line);
    }
  }
  flushCurrentSection();

  return sections;
}

/**
 * context 조립 시 예산이 부족할 때 어떤 섹션을 살릴지의 우선순위.
 * 숫자가 낮을수록 먼저 살아남는다.
 *
 * Result/Decisions가 가장 높다 — 미래 AI 세션에 "무엇이 어떻게 결정되어
 * 어떤 결과가 났는가"가 가장 비싼 정보다. Notes는 작업 중 메모이므로 가장 먼저 버린다.
 */
const SECTION_KEEP_PRIORITY: Record<string, number> = {
  Result: 0,
  Decisions: 1,
  Intent: 2,
  Notes: 9,
};

const UNKNOWN_SECTION_PRIORITY = 5;

export function sectionKeepPriority(heading: string | null): number {
  if (heading === null) {
    // preamble은 보통 task의 요약이므로 일반 섹션보다 약간 앞선다.
    return 4;
  }
  return SECTION_KEEP_PRIORITY[heading] ?? UNKNOWN_SECTION_PRIORITY;
}
