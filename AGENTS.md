# manta-repo — Agent Guide

## Stack
- Go module (single `go.mod`)
- CLI: `cmd/manta` + `internal/cli`
- Core file contract: `internal/core`
- Root SQLite engine: `internal/engine`
- Desktop: Wails v2 under `desktop/`

Do not reintroduce TypeScript packages, npm workspaces, or Electron.

## Commands
```bash
go build -o bin/manta ./cmd/manta
go test ./...
go vet ./...
go run ./cmd/manta --help
```

Desktop:
```bash
cd desktop && wails dev
cd desktop && wails build
```

## Architecture rules
- Depend inward: `cli → engine → core`, `desktop → core`
- `internal/core` owns the local file contract
- Prefer stdlib in `core`; put SQLite and heavy deps in `engine`
- Status is folder location (`todo` / `in-progress` / `done`), never a frontmatter `status` field
- GUI must call Go bindings / core APIs — never shell out to CLI or parse CLI stdout

## Behavior
- Follow YAGNI
- Use specific domain names (`taskFileContent`, not `data`)
- Ask when domain intent is unclear
- Keep changes inside the requested scope
