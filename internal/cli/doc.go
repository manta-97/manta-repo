// Package cli is the cobra adapter over core/engine.
//
// Exit policy (Unix-style): 0 success/no-op, 1 failure, 2 usage error.
// stdout carries result data; stderr carries human-readable errors and warnings.
// No machine [CODE] prefix protocol on stderr.
package cli
