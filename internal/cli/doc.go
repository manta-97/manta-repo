// Package cli is the cobra (or equivalent) adapter over core/engine.
//
// Exit policy: 0 success/no-op, 1 runtime failure, 2 usage error.
// Runtime errors print a single stderr line: [CODE] message
package cli
