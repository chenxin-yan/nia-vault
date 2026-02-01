#!/usr/bin/env bash

#############################################################################
# Ralph Wiggum Autonomous Development Loop for nia-vault
#
# This script runs Claude Code in a continuous loop, working through tasks
# in tasks.json until all are completed.
#
# Usage:
#   ./ralph.sh                    # Run with defaults
#   ./ralph.sh --max-loops 10     # Limit to 10 iterations
#   ./ralph.sh --dry-run          # Show what would happen without running
#
# Requirements:
#   - claude CLI (npm install -g @anthropic-ai/claude-code)
#   - jq (for JSON parsing)
#
#############################################################################

set -euo pipefail

# ========================= Configuration =========================

# Maximum loops (0 = unlimited until all tasks done)
MAX_LOOPS=${MAX_LOOPS:-0}

# Timeout per Claude invocation (in minutes)
CLAUDE_TIMEOUT=${CLAUDE_TIMEOUT:-15}

# Rate limit retry wait time (in seconds)
RATE_LIMIT_WAIT=${RATE_LIMIT_WAIT:-60}

# Maximum consecutive errors before giving up
MAX_CONSECUTIVE_ERRORS=${MAX_CONSECUTIVE_ERRORS:-3}

# Log file location
LOG_FILE="ralph.log"

# Files
PROMPT_FILE="PROMPT.md"
TASKS_FILE="tasks.json"
SPEC_FILE="docs/spec.md"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ========================= Helper Functions =========================

log() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${CYAN}[$timestamp]${NC} $1"
    echo "[$timestamp] $1" >> "$LOG_FILE"
}

log_error() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${RED}[$timestamp] ERROR:${NC} $1" >&2
    echo "[$timestamp] ERROR: $1" >> "$LOG_FILE"
}

log_success() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${GREEN}[$timestamp] SUCCESS:${NC} $1"
    echo "[$timestamp] SUCCESS: $1" >> "$LOG_FILE"
}

log_warning() {
    local timestamp
    timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${YELLOW}[$timestamp] WARNING:${NC} $1"
    echo "[$timestamp] WARNING: $1" >> "$LOG_FILE"
}

# Check if all required tools are installed
check_dependencies() {
    local missing=()
    
    if ! command -v claude &> /dev/null; then
        missing+=("claude (npm install -g @anthropic-ai/claude-code)")
    fi
    
    if ! command -v jq &> /dev/null; then
        missing+=("jq (brew install jq or apt install jq)")
    fi
    
    if [ ${#missing[@]} -gt 0 ]; then
        log_error "Missing required dependencies:"
        for dep in "${missing[@]}"; do
            echo "  - $dep"
        done
        exit 1
    fi
}

# Check if required files exist
check_files() {
    if [ ! -f "$PROMPT_FILE" ]; then
        log_error "Prompt file not found: $PROMPT_FILE"
        exit 1
    fi
    
    if [ ! -f "$TASKS_FILE" ]; then
        log_error "Tasks file not found: $TASKS_FILE"
        exit 1
    fi
    
    if [ ! -f "$SPEC_FILE" ]; then
        log_error "Spec file not found: $SPEC_FILE"
        exit 1
    fi
}

# Count pending tasks (including subtasks)
count_pending_tasks() {
    jq '[.tasks[].subtasks[]? | select(.status == "pending")] | length' "$TASKS_FILE" 2>/dev/null || echo "0"
}

# Count completed tasks (including subtasks)
count_completed_tasks() {
    jq '[.tasks[].subtasks[]? | select(.status == "completed")] | length' "$TASKS_FILE" 2>/dev/null || echo "0"
}

# Count total tasks (including subtasks)
count_total_tasks() {
    jq '[.tasks[].subtasks[]?] | length' "$TASKS_FILE" 2>/dev/null || echo "0"
}

# Get next pending task ID
get_next_pending_task() {
    jq -r '
        [.tasks[] | .subtasks[]? | select(.status == "pending")] 
        | first 
        | .id // "none"
    ' "$TASKS_FILE" 2>/dev/null || echo "none"
}

# Check if all tasks are completed
all_tasks_completed() {
    local pending
    pending=$(count_pending_tasks)
    [ "$pending" -eq 0 ]
}

# Display progress bar
show_progress() {
    local completed=$1
    local total=$2
    local width=40
    
    if [ "$total" -eq 0 ]; then
        return
    fi
    
    local percent=$((completed * 100 / total))
    local filled=$((completed * width / total))
    local empty=$((width - filled))
    
    printf "${BLUE}Progress: [${GREEN}"
    printf '%*s' "$filled" '' | tr ' ' '='
    printf "${NC}"
    printf '%*s' "$empty" '' | tr ' ' '-'
    printf "${BLUE}] %d/%d (%d%%)${NC}\n" "$completed" "$total" "$percent"
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --max-loops)
                MAX_LOOPS="$2"
                shift 2
                ;;
            --timeout)
                CLAUDE_TIMEOUT="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --help|-h)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_help
                exit 1
                ;;
        esac
    done
}

show_help() {
    cat << EOF
Ralph Wiggum Autonomous Development Loop

Usage: ./ralph.sh [OPTIONS]

Options:
    --max-loops N     Maximum number of iterations (0 = unlimited)
    --timeout N       Timeout per Claude invocation in minutes (default: 15)
    --dry-run         Show what would happen without running Claude
    -h, --help        Show this help message

Environment Variables:
    MAX_LOOPS                 Same as --max-loops
    CLAUDE_TIMEOUT            Same as --timeout
    RATE_LIMIT_WAIT           Seconds to wait on rate limit (default: 60)
    MAX_CONSECUTIVE_ERRORS    Max errors before exiting (default: 3)

Examples:
    ./ralph.sh                      # Run until all tasks complete
    ./ralph.sh --max-loops 5        # Run at most 5 iterations
    ./ralph.sh --dry-run            # Preview without executing
    MAX_LOOPS=10 ./ralph.sh         # Using environment variable

EOF
}

# ========================= Main Loop =========================

run_claude() {
    local output
    local exit_code
    
    log "Invoking Claude Code..."
    
    # Build the prompt with context
    local full_prompt
    full_prompt=$(cat "$PROMPT_FILE")
    
    # Run Claude with timeout and capture output
    # Using --print for non-interactive mode
    # Using --dangerously-skip-permissions for autonomous operation
    set +e
    output=$(timeout "${CLAUDE_TIMEOUT}m" claude \
        --print \
        --dangerously-skip-permissions \
        "$full_prompt" 2>&1)
    exit_code=$?
    set -e
    
    # Log output to file
    echo "=== Claude Output ($(date)) ===" >> "$LOG_FILE"
    echo "$output" >> "$LOG_FILE"
    echo "=== End Output ===" >> "$LOG_FILE"
    
    # Check for rate limiting
    if echo "$output" | grep -qi "rate limit\|too many requests\|429"; then
        log_warning "Rate limit detected. Waiting ${RATE_LIMIT_WAIT} seconds..."
        sleep "$RATE_LIMIT_WAIT"
        return 2  # Signal rate limit
    fi
    
    # Check for timeout
    if [ $exit_code -eq 124 ]; then
        log_warning "Claude timed out after ${CLAUDE_TIMEOUT} minutes"
        return 3  # Signal timeout
    fi
    
    # Check for other errors
    if [ $exit_code -ne 0 ]; then
        log_error "Claude exited with code $exit_code"
        return 1
    fi
    
    # Check for EXIT_SIGNAL in output
    if echo "$output" | grep -q "EXIT_SIGNAL: true"; then
        log_success "Claude signaled all tasks complete!"
        return 0
    fi
    
    # Check for task completion
    if echo "$output" | grep -q "RALPH_STATUS:"; then
        local task_id
        task_id=$(echo "$output" | grep -A5 "RALPH_STATUS:" | grep "task_id:" | sed 's/.*task_id: *//' | tr -d ' ')
        if [ -n "$task_id" ] && [ "$task_id" != "none" ]; then
            log_success "Completed task: $task_id"
        fi
    fi
    
    return 0
}

main() {
    # Parse arguments
    DRY_RUN=${DRY_RUN:-false}
    parse_args "$@"
    
    # Header
    echo ""
    echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║${NC}     ${CYAN}Ralph Wiggum Autonomous Development Loop${NC}              ${BLUE}║${NC}"
    echo -e "${BLUE}║${NC}     ${YELLOW}nia-vault project${NC}                                     ${BLUE}║${NC}"
    echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Checks
    log "Checking dependencies..."
    check_dependencies
    
    log "Checking required files..."
    check_files
    
    # Initial status
    local total_tasks completed_tasks pending_tasks
    total_tasks=$(count_total_tasks)
    completed_tasks=$(count_completed_tasks)
    pending_tasks=$(count_pending_tasks)
    
    log "Found $total_tasks total tasks ($completed_tasks completed, $pending_tasks pending)"
    show_progress "$completed_tasks" "$total_tasks"
    
    if all_tasks_completed; then
        log_success "All tasks are already completed!"
        exit 0
    fi
    
    if [ "$DRY_RUN" = true ]; then
        log "DRY RUN - Would start processing tasks"
        log "Next task: $(get_next_pending_task)"
        exit 0
    fi
    
    # Main loop
    local loop_count=0
    local consecutive_errors=0
    
    log "Starting autonomous development loop..."
    echo ""
    
    while true; do
        loop_count=$((loop_count + 1))
        
        # Check max loops
        if [ "$MAX_LOOPS" -gt 0 ] && [ "$loop_count" -gt "$MAX_LOOPS" ]; then
            log_warning "Reached maximum loop count ($MAX_LOOPS)"
            break
        fi
        
        # Check if all tasks done
        if all_tasks_completed; then
            log_success "All tasks completed!"
            break
        fi
        
        # Show current status
        completed_tasks=$(count_completed_tasks)
        pending_tasks=$(count_pending_tasks)
        local next_task
        next_task=$(get_next_pending_task)
        
        echo ""
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        log "Loop $loop_count | Next task: $next_task"
        show_progress "$completed_tasks" "$total_tasks"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo ""
        
        # Run Claude
        run_claude
        local result=$?
        
        case $result in
            0)
                # Success
                consecutive_errors=0
                ;;
            1)
                # Error
                consecutive_errors=$((consecutive_errors + 1))
                log_error "Error in loop $loop_count (consecutive: $consecutive_errors)"
                if [ "$consecutive_errors" -ge "$MAX_CONSECUTIVE_ERRORS" ]; then
                    log_error "Too many consecutive errors. Exiting."
                    exit 1
                fi
                sleep 5
                ;;
            2)
                # Rate limit - already waited, continue
                consecutive_errors=0
                ;;
            3)
                # Timeout - continue to next iteration
                consecutive_errors=$((consecutive_errors + 1))
                ;;
        esac
        
        # Small delay between loops to be nice to the API
        sleep 2
    done
    
    # Final status
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    completed_tasks=$(count_completed_tasks)
    log "Final status: $completed_tasks/$total_tasks tasks completed in $loop_count loops"
    show_progress "$completed_tasks" "$total_tasks"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    
    log "Log saved to: $LOG_FILE"
}

# Run main with all arguments
main "$@"
