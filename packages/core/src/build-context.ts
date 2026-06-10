import { Task } from './types';
import { sectionKeepPriority, splitBodyIntoSections } from './task-sections';

/**
 * `manta context` v0 — 여러 task 파일을 미래 AI 세션의 입력으로 조립한다.
 *
 * 계약 (cli-design.md Phase 3):
 * - 모델/네트워크 없음. 입력은 이미 읽힌 task뿐이다.
 * - deterministic extractive output — 같은 입력이면 항상 같은 출력.
 * - maxChars가 주어지면 출력 길이는 절대 그 값을 넘지 않는다.
 */

export interface BuildContextOptions {
  maxChars?: number;
}

const DOCUMENT_TITLE = '# Manta Context';
const BLOCK_SEPARATOR = '\n\n';
const TRUNCATION_MARKER = '… (truncated)';

function renderTaskHeader(task: Task): string {
  return [
    `## ${task.id} — ${task.title}`,
    '',
    `- status: ${task.status}`,
    `- created: ${task.created}`,
  ].join('\n');
}

function renderTaskBlock(task: Task, selectedBody: string): string {
  const header = renderTaskHeader(task);
  if (selectedBody === '') {
    return header;
  }
  return header + BLOCK_SEPARATOR + selectedBody;
}

function assembleDocument(taskBlocks: string[]): string {
  return [DOCUMENT_TITLE, ...taskBlocks].join(BLOCK_SEPARATOR);
}

/**
 * 예산 안에서 본문을 고른다. 통째로 들어가면 그대로, 아니면 섹션 단위로 선별한다.
 *
 * 선별 규칙 (Phase 5: 섹션은 있으면 활용한다):
 * - `sectionKeepPriority` 순서로 통째로 들어가는 섹션만 살린다 (Result > Decisions > Intent > 기타 > Notes).
 * - 최고 우선순위 섹션조차 안 들어가면 그 섹션을 잘라서라도 넣는다.
 * - 살아남은 섹션은 원문 순서대로 다시 배열한다 — 선별은 하되 문서 흐름은 유지한다.
 */
function selectBodyWithinBudget(body: string, budget: number): string {
  const trimmedBody = body.trimEnd();
  if (trimmedBody.length <= budget) {
    return trimmedBody;
  }
  if (budget <= 0) {
    return '';
  }

  const sections = splitBodyIntoSections(trimmedBody).map((section, documentIndex) => ({
    ...section,
    documentIndex,
    content: section.content.trim() === '' ? '' : section.content.trimEnd(),
  }));

  const prioritizedSections = [...sections].sort(
    (a, b) =>
      sectionKeepPriority(a.heading) - sectionKeepPriority(b.heading) ||
      a.documentIndex - b.documentIndex,
  );

  const keptIndexes = new Set<number>();
  let truncatedFirstSection: { documentIndex: number; content: string } | null = null;
  let remainingBudget = budget;
  let droppedAnySection = false;

  for (const section of prioritizedSections) {
    const joinCost = keptIndexes.size > 0 || truncatedFirstSection !== null ? 1 : 0;
    const sectionCost = section.content.length + joinCost;

    if (sectionCost <= remainingBudget) {
      keptIndexes.add(section.documentIndex);
      remainingBudget -= sectionCost;
      continue;
    }

    if (keptIndexes.size === 0 && truncatedFirstSection === null) {
      // 가장 중요한 섹션조차 통째로 안 들어간다 — 잘라서라도 최우선 내용을 남긴다.
      const sliceLength = Math.max(0, remainingBudget - TRUNCATION_MARKER.length - 1);
      truncatedFirstSection = {
        documentIndex: section.documentIndex,
        content: `${section.content.slice(0, sliceLength)}\n${TRUNCATION_MARKER}`.slice(0, budget),
      };
      remainingBudget = 0;
    }
    droppedAnySection = true;
  }

  const selectedParts = sections
    .filter(
      (section) =>
        keptIndexes.has(section.documentIndex) ||
        truncatedFirstSection?.documentIndex === section.documentIndex,
    )
    .map((section) =>
      truncatedFirstSection?.documentIndex === section.documentIndex
        ? truncatedFirstSection.content
        : section.content,
    );

  let selectedBody = selectedParts.join('\n');

  if (droppedAnySection && truncatedFirstSection === null) {
    const markerCost = TRUNCATION_MARKER.length + (selectedBody === '' ? 0 : 1);
    if (markerCost <= remainingBudget) {
      selectedBody =
        selectedBody === '' ? TRUNCATION_MARKER : `${selectedBody}\n${TRUNCATION_MARKER}`;
    }
  }

  return selectedBody.slice(0, budget);
}

export function buildContextDocument(tasks: Task[], options: BuildContextOptions = {}): string {
  const { maxChars } = options;

  const fullDocument = assembleDocument(
    tasks.map((task) => renderTaskBlock(task, task.body.trimEnd())),
  );
  if (maxChars === undefined || fullDocument.length <= maxChars) {
    return fullDocument;
  }

  // 헤더(제목/메타)는 항상 포함이고, 남는 예산을 본문에 배분한다.
  const documentOverhead = assembleDocument(tasks.map((task) => renderTaskBlock(task, ''))).length;
  let remainingBodyBudget = Math.max(0, maxChars - documentOverhead);

  const taskBlocks = tasks.map((task, taskIndex) => {
    const tasksLeft = tasks.length - taskIndex;
    // 균등 분배하되 앞 task가 다 쓰지 못한 예산은 뒤로 넘어간다 (단일 패스, 결정적).
    const taskBudget = Math.floor(remainingBodyBudget / tasksLeft);
    const bodyWithSeparator = selectBodyWithinBudget(
      task.body,
      Math.max(0, taskBudget - BLOCK_SEPARATOR.length),
    );
    const consumed =
      bodyWithSeparator === '' ? 0 : bodyWithSeparator.length + BLOCK_SEPARATOR.length;
    remainingBodyBudget -= consumed;
    return renderTaskBlock(task, bodyWithSeparator);
  });

  // 마지막 안전망: 어떤 경우에도 maxChars 계약을 지킨다 (overhead 자체가 예산보다 클 때 등).
  return assembleDocument(taskBlocks).slice(0, maxChars);
}
