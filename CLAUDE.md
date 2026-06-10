# manta-repo — Code Repository

## Commands

```bash
# Build all packages (order matters: core → engine → cli)
npm run build

# Run tests (core / cli / engine jest projects)
npm test

# Watch mode
npm run test:watch

# Lint & format
npm run lint
npm run format

# Dev mode (watch)
npm run --workspace packages/core dev
npm run --workspace packages/cli dev

# Run CLI directly
node packages/cli/dist/index.js

# Desktop (Electron)
npm run --workspace packages/desktop typecheck
npm run --workspace packages/desktop start
```

## Architecture

```
packages/
├── core/      # @manta/core — 파일 계약 소유자: anchor, task repository, 상태 모델 (no runtime deps)
├── engine/    # @manta/engine — root SQLite 운영 엔진 (better-sqlite3), ~/.manta/manta.sqlite
├── cli/       # @manta/cli — CLI adapter (commander, chalk), 13개 명령
└── desktop/   # @manta/desktop — Electron Local Workspace (forge + vite + react + tailwind)
```

의존 방향: `cli → engine → core`, `desktop → core`. core는 누구도 모른다.

### Key Decisions
- **TypeScript + CommonJS**: `module: node16`, source uses `import`, compiled output is CJS
  - 예외: desktop은 Vite 번들이므로 `moduleResolution: bundler`, noEmit typecheck
- **Monorepo**: npm workspaces. `@manta/core`가 파일 계약을 소유하므로 CLI/GUI 동작이 갈라질 수 없다
- **@manta/core has zero runtime dependencies**: Node built-ins only.
  SQLite처럼 무거운 의존성은 `@manta/engine` 같은 별도 패키지(adapter 경계)에 둔다
- **상태는 폴더다**: `tasks/{todo,in-progress,done}/task-N.md`. frontmatter는 id/title/created 3필드
- **CLI 오류 정책**: exit 0(성공/no-op) / 1(runtime) / 2(usage), stderr `[CODE] message` 한 줄
- **글로벌 데이터**: `~/.manta/` (projects.json, manta.sqlite). `MANTA_HOME` env로 오버라이드 (테스트 격리)
- **help registry가 source of truth**: 구현된 명령만 `commandHelpEntries`에 등록한다
- **context는 all-or-nothing**: `manta context`와 GUI Copy AI Context는 같은
  `buildContextDocument()`를 쓰고, 조회가 하나라도 실패하면 출력하지 않는다
- **import/export**: `manta-tasks` JSON 번들 v1. import는 검증 후 일괄 쓰기(부분 import 없음), 새 id 재채번

## Git Conventions

### Branch Naming
`task-N-short-description` (예: `task-7-manta-init`, `task-8-error-centralization`)

### Commit Message
Husky `commit-msg` hook이 브랜치명에서 prefix를 자동 추출하여 prepend한다:
- `task-7-manta-init` 브랜치 → 커밋 메시지에 `TASK-7` 자동 추가
- `main`, `develop` 등 숫자 없는 브랜치 → prefix 없음

### Pre-commit
`lint-staged`가 staged된 `.ts` 파일에 prettier + eslint 자동 실행.

## Code Design Principles

### YAGNI (You Aren't Gonna Need It)
- Do not write unused code. Remove it when found.
- Do not add code "just in case it's needed later."
- Unused return values, parameters, fields → remove.
- Uncalled functions, unused imports → delete.

### Naming (Critical)

> **If you don't know the exact domain context or business logic, ASK the user. Do not guess.**

#### Forbidden Patterns
```typescript
// BAD — too vague
const data = getData()
const result = process(items)
const info = fetchInfo()

// BAD — excessive abbreviation
const usr = getUser()
const calcAmt = calculateAmount()
```

#### Correct Patterns
```typescript
// GOOD — specific and clear
const taskFileContent = readTaskFile(taskId)
const filteredTasksByStatus = filterTasksByStatus(tasks, 'done')
const parsedFrontmatter = parseYamlFrontmatter(rawContent)
```

#### Naming Checklist
1. Can you understand what it is just by reading the name?
2. Does it use domain terminology? (`data` → `taskFileContent`)
3. Does it describe the action specifically? (`process()` → `parseAndValidateTaskFile()`)
4. Is singular/plural clear? (list → `tasks`, single → `task`)

## Testing

### Principles
- Test naming: `describe('[Feature]')` + `it('should [expected behavior]')`
- Follow Given-When-Then flow
- Mock external APIs and third-party services only
- Time-dependent tests: use fake timers

### Test Naming
```typescript
describe('TaskFileParser', () => {
  it('should parse valid frontmatter and return task object', () => {})
  it('should throw error when frontmatter is missing', () => {})
})
```
