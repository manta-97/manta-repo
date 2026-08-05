package main

import (
	"fmt"
	"os"
)

// CLI entrypoint. Commands live in internal/cli once Phase 1 lands.
func main() {
	if len(os.Args) > 1 && (os.Args[1] == "--help" || os.Args[1] == "help" || os.Args[1] == "-h") {
		fmt.Fprintln(os.Stdout, "manta — local-first task system (Go rewrite in progress)")
		fmt.Fprintln(os.Stdout, "No commands implemented yet.")
		os.Exit(0)
	}

	fmt.Fprintln(os.Stderr, "[NOT_IMPLEMENTED] manta CLI rewrite is in progress")
	os.Exit(1)
}
