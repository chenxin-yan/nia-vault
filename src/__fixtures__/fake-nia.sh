#!/usr/bin/env bash
# Fake nia CLI for testing
# This script mimics the nia CLI's responses for testing purposes

# Resolve symlinks to find the real script location
SCRIPT_PATH="${BASH_SOURCE[0]}"
while [ -L "$SCRIPT_PATH" ]; do
  SCRIPT_DIR="$(cd -P "$(dirname "$SCRIPT_PATH")" && pwd)"
  SCRIPT_PATH="$(readlink "$SCRIPT_PATH")"
  [[ $SCRIPT_PATH != /* ]] && SCRIPT_PATH="$SCRIPT_DIR/$SCRIPT_PATH"
done
SCRIPT_DIR="$(cd -P "$(dirname "$SCRIPT_PATH")" && pwd)"

# Parse command
CMD="$1"
shift

case "$CMD" in
  status)
    # Check for --json flag
    for arg in "$@"; do
      if [ "$arg" = "--json" ]; then
        cat "$SCRIPT_DIR/nia-status.json"
        exit 0
      fi
    done
    echo "Status: synced"
    exit 0
    ;;
  
  search)
    # Check for --raw flag to return raw response
    HAS_RAW=false
    for arg in "$@"; do
      if [ "$arg" = "--raw" ]; then
        HAS_RAW=true
        break
      fi
    done
    
    if [ "$HAS_RAW" = true ]; then
      cat "$SCRIPT_DIR/nia-search-raw.json"
      exit 0
    fi
    
    # Default: just echo the query for non-raw mode
    echo "Searching for: $1"
    exit 0
    ;;
  
  once)
    # Simulate sync
    echo "Sync complete"
    exit 0
    ;;
  
  *)
    echo "Unknown command: $CMD" >&2
    exit 1
    ;;
esac
