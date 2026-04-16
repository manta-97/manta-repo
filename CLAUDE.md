# manta-repo — Code Repository

## Commands

```bash
# Build all packages (order matters: core first)
npm run build

# Run tests
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
```

## Architecture

```
packages/
├── core/    # @manta/core — task CRUD, file I/O, state management (no runtime deps)
└── cli/     # @manta/cli — CLI interface (commander, chalk, ora)
```

### Key Decisions
- **TypeScript + CommonJS**: `module: node16`, source uses `import`, compiled output is CJS
- **Monorepo**: npm workspaces, `@manta/core` is shared by CLI and future Electron app
- **@manta/core has zero runtime dependencies**: Node built-ins only

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
