# manta-repo — Code Repository

## Stack

- **Language**: Go 1.22+
- **CLI**: `cmd/manta` + `internal/cli` (cobra)
- **Desktop**: Wails v2 (`desktop/`) — Go backend + web frontend
- **SQLite**: `internal/engine` (pure Go driver preferred: `modernc.org/sqlite`)

TS/Electron monorepo는 폐기됐다. 구현은 전부 이 Go 모듈에서 다시 쌓는다.

## Commands

```bash
# Module tidy / deps
go mod tidy

# Build CLI
go build -o bin/manta ./cmd/manta

# Run CLI
go run ./cmd/manta --help

# Tests
go test ./...

# Lint (when configured)
go vet ./...

# Desktop (Wails)
cd desktop && wails dev
cd desktop && wails build
```

## Architecture

```
manta-repo/
├── cmd/
│   └── manta/          # CLI entrypoint
├── internal/
│   ├── core/           # 파일 계약 소유자: anchor, task repository, 상태 모델
│   ├── engine/         # root SQLite 운영 엔진 (~/.manta/manta.sqlite)
│   └── cli/            # cobra adapter (exit code / stderr 정책)
└── desktop/            # Wails Local Workspace (Go bindings + frontend)
```

의존 방향: `cli → engine → core`, `desktop → core` (필요 시 engine).
`core`는 상위 계층을 모른다.

### Key Decisions
- **Go module 단일 루트**: npm workspaces 대신 하나의 `go.mod`
- **`internal/core`는 가능한 한 stdlib 위주**: 파일 계약·파싱·상태 모델만 둔다
- **SQLite 같은 무거운 의존성은 `internal/engine`**: core의 경계를 깨지 않는다
- **상태는 폴더다**: `tasks/{todo,in-progress,done}/task-N.md`. frontmatter는 id/title/created 3필드
- **CLI 종료·출력 (정석)**: exit 0 성공·no-op / 1 실행 실패 / 2 사용법 오류.
  stdout=결과 데이터, stderr=에러·경고·안내. 사람용 `Error: ...` 문장. `[CODE]` 접두 프로토콜 없음
- **글로벌 데이터**: `~/.manta/` (projects.json, manta.sqlite). `MANTA_HOME` env로 오버라이드 (테스트 격리)
- **help**: `--help` / `help` / `--version`. 구현된 명령만 노출. Use/Short/Example 충실
- **context는 all-or-nothing**: CLI `manta context`와 GUI Copy AI Context는 같은 core 함수를 쓰고, 조회가 하나라도 실패하면 결과 데이터를 출력하지 않는다
- **import/export**: `manta-tasks` JSON 번들 v1. import는 검증 후 일괄 쓰기(부분 import 없음), 새 id 재채번
- **GUI는 Wails binding으로 core를 직접 호출**: CLI shell 호출·stdout 파싱 금지. frontend는 표시 계층일 뿐 source of truth가 아니다

## Git Conventions

### Branch Naming
`task-N-short-description` (예: `task-1-module-scaffold`, `task-7-manta-init`)

### Commit Message
가능하면 브랜치의 task 번호를 prefix로 둔다:
- `task-7-manta-init` 브랜치 → `TASK-7: ...`
- `main` 등 숫자 없는 브랜치 → prefix 없음

## Code Design Principles

### YAGNI
- 쓰지 않는 코드는 쓰지 말고, 발견하면 지운다
- “나중에 필요할 수도”로 추상화하지 않는다

### Naming (Critical)

> **If you don't know the exact domain context or business logic, ASK the user. Do not guess.**

#### Forbidden Patterns
```go
// BAD — too vague
data := getData()
result := process(items)
info := fetchInfo()

// BAD — excessive abbreviation
usr := getUser()
calcAmt := calculateAmount()
```

#### Correct Patterns
```go
// GOOD — specific and clear
taskFileContent := readTaskFile(taskID)
filteredTasksByStatus := filterTasksByStatus(tasks, StatusDone)
parsedFrontmatter := parseYAMLFrontmatter(rawContent)
```

#### Naming Checklist
1. 이름만 읽고 무엇인지 알 수 있는가?
2. 도메인 용어를 쓰는가? (`data` → `taskFileContent`)
3. 동작이 구체적인가? (`process` → `parseAndValidateTaskFile`)
4. 단수/복수가 분명한가?

## Testing

### Principles
- 테이블 기반 테스트와 명확한 케이스 이름을 선호한다
- 외부 서비스만 mock한다. 파일/SQLite는 임시 디렉터리로 통합 테스트
- 시간 의존 테스트는 고정 시각을 주입한다

### Test Naming
```go
func TestTaskFileParser_ParsesValidFrontmatter(t *testing.T) {}
func TestTaskFileParser_ErrorsWhenFrontmatterMissing(t *testing.T) {}
```
