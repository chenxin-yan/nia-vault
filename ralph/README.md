# Ralph Starter

A methodology and automation toolkit for orchestrating long-running AI coding agents through iterative task execution.

## Overview

Ralph is a shell-based approach to running AI coding agents in a continuous loop, enabling them to work through complex, multi-task projects autonomously. Instead of managing a single long session that may hit context limits or rate limits, Ralph breaks work into small, granular tasks and maintains persistent context across agent sessions.

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      ralph.sh Loop                          │
│                                                             │
│  ┌─────────┐    ┌─────────┐    ┌─────────┐    ┌─────────┐   │
│  │  Read   │───▶│  Agent  │───▶│ Update  │───▶│  Commit │   │
│  │ prd.json│    │  Works  │    │progress │    │ Changes │   │
│  │         │    │ on Task │    │   .md   │    │         │   │
│  └─────────┘    └─────────┘    └─────────┘    └─────────┘   │
│       │                                             │       │
│       └────────────── Next Iteration ◀──────────────┘       │
└─────────────────────────────────────────────────────────────┘
```

### Core Components

| File          | Description                                                    |
| ------------- | -------------------------------------------------------------- |
| `prd.json`    | Project task list with small, granular, actionable items       |
| `progress.md` | Running log that acts as "memory" between agent sessions       |
| `PROMPT.md`   | System prompt template that instructs the agent each iteration |
| `SPEC.md`     | Project specification document describing what you're building |
| `start.sh`    | The orchestration script that runs the agent loop              |

### Workflow

1. Agent reads `prd.json` and identifies the highest-priority task with no dependencies (agent infers priority and dependencies from context)
2. Agent works on that single task, verifying implementation (tests, type checks, etc.)
3. Agent updates `progress.md` with notes for future iterations
4. Agent updates `prd.json` (marks task complete, update notes for other tasks)
5. Agent commits changes
6. Agent outputs completion signal
7. Script detects completion, starts next iteration
8. Loop continues until all tasks are complete (or max iterations reached)

## Quick Start

### Prerequisites

- An AI coding CLI tool (e.g., [opencode](https://github.com/opencode-ai/opencode), [claude](https://docs.anthropic.com/en/docs/claude-code), [aider](https://aider.chat/))
- Git
- [jq](https://jqlang.github.io/jq/) - JSON processor (install with `brew install jq` or `apt install jq`)

### Setup

1. Clone this starter into your project as a `ralph/` subdirectory:

   ```bash
   cd my-project
   git clone https://github.com/chenxin-yan/ralph-starter.git ralph
   rm -rf ralph/.git  # Remove Ralph's git history
   ```

   Your project structure will look like:

   ```
   my-project/
   ├── src/              # Your project files
   ├── package.json
   └── ralph/            # Ralph configuration
       ├── start.sh
       ├── config
       ├── PROMPT.md
       ├── SPEC.md
       ├── prd.json
       └── progress.md
   ```

2. Configure your agent CLI in `ralph/config` (optional - defaults to `opencode run`):

   ```bash
   # Edit ralph/config and change RALPH_AGENT_CMD
   RALPH_AGENT_CMD="claude -p"  # Example: use Claude CLI instead
   ```

3. Write your project spec in `ralph/SPEC.md`:

   ```markdown
   # My Project

   ## Overview

   A brief description of what you're building.

   ## Features

   - Feature 1
   - Feature 2

   ## Technical Requirements

   - Use TypeScript
   - Use PostgreSQL for database
   ```

4. Create your task list in `ralph/prd.json`:

   ```json
   {
     "tasks": [
       {
         "description": "Initialize the project with TypeScript and basic folder structure",
         "subtasks": [
           "Run npm init",
           "Install TypeScript and configure tsconfig.json",
           "Create src/ directory structure",
           "Verify with tsc --noEmit"
         ],
         "notes": "Use strict TypeScript settings",
         "passed": false
       }
     ]
   }
   ```

5. Run Ralph from your project root:

   ```bash
   ./ralph/start.sh
   ```

   The agent will run in your project root directory (where you invoke the script), while Ralph's config files are read from `./ralph/`.

### Options

```bash
./ralph/start.sh                    # Run until all tasks complete
./ralph/start.sh --max-loops 10     # Limit to 10 iterations
./ralph/start.sh --dry-run          # Show configuration without running
./ralph/start.sh --help             # Show help message
```

## File Formats

### prd.json

The task list that drives the agent's work. Tasks should be small and granular - each completable in a single agent session.

| Field         | Type     | Description                                 |
| ------------- | -------- | ------------------------------------------- |
| `description` | string   | End goal - what should be achieved          |
| `subtasks`    | string[] | Ordered steps to complete the task          |
| `notes`       | string   | Context, constraints, or tips for the agent |
| `passed`      | boolean  | Whether the task is complete                |

**Note**: There is no explicit priority or dependency field. The agent analyzes the task list and determines which task to work on based on context, logical ordering, and what makes sense given the current state of the project.

### SPEC.md

The project specification document. This describes what you're building at a high level. The agent reads this to understand the overall goal and make informed decisions.

### PROMPT.md

The system prompt template sent to the agent each iteration. This contains the instructions that enforce the Ralph workflow.

### progress.md

The progress file is **append-only** - the agent adds new entries after each task but never modifies previous entries. This creates an immutable log that serves as a handoff document between agent sessions. Each entry is separated by `---`.

## Configuration

Ralph is configured via the `config` file, which is automatically sourced by `start.sh`. You can also set environment variables, which take precedence over config file values.

### config file

```bash
# Agent CLI command (prompt is passed as the last argument)
RALPH_AGENT_CMD="opencode run"

# Model selection (provider/model format, OpenCode only)
RALPH_MODEL="anthropic/claude-opus-4-5"

# File paths (relative to config file, or absolute)
RALPH_PRD_FILE="prd.json"
RALPH_PROGRESS_FILE="progress.md"
RALPH_PROMPT_FILE="PROMPT.md"
RALPH_SPEC_FILE="SPEC.md"

# Completion signal
RALPH_COMPLETE_SIGNAL="RALPH_TASK_COMPLETE"

# Rate limiting
RALPH_RATE_LIMIT_PATTERN="rate.limit|429|quota.exceeded|too.many.requests"
RALPH_RATE_LIMIT_COOLDOWN="60"

# Logging (set to empty string to disable)
RALPH_LOG_FILE="ralph.log"
```

### Configuration Reference

| Variable                    | Description                         | Default                                              |
| --------------------------- | ----------------------------------- | ---------------------------------------------------- |
| `RALPH_AGENT_CMD`           | Command to invoke the agent CLI     | `opencode run`                                       |
| `RALPH_MODEL`               | Model in provider/model format      | `anthropic/claude-opus-4-5`                          |
| `RALPH_PRD_FILE`            | Path to task file                   | `prd.json`                                           |
| `RALPH_PROGRESS_FILE`       | Path to progress log                | `progress.md`                                        |
| `RALPH_PROMPT_FILE`         | Path to prompt template             | `PROMPT.md`                                          |
| `RALPH_SPEC_FILE`           | Path to project spec                | `SPEC.md`                                            |
| `RALPH_COMPLETE_SIGNAL`     | String agent outputs when done      | `RALPH_TASK_COMPLETE`                                |
| `RALPH_RATE_LIMIT_PATTERN`  | Regex pattern to detect rate limits | `rate.limit\|429\|quota.exceeded\|too.many.requests` |
| `RALPH_RATE_LIMIT_COOLDOWN` | Cooldown period in seconds          | `60`                                                 |
| `RALPH_LOG_FILE`            | Log file path (empty to disable)    | `ralph.log`                                          |

**Note**: File paths can be relative (resolved from `start.sh` directory) or absolute. This allows you to place all Ralph files in a subdirectory (e.g., `./ralph/`) while the agent runs from your project root.

## Rate Limit Handling

The script monitors agent output for rate limit indicators and will:

- Pause execution when rate limits are detected (matches `RALPH_RATE_LIMIT_PATTERN`)
- Wait for the appropriate cooldown period
- Resume automatically

## Logging

Ralph logs all script output and agent responses to `ralph.log` by default. The log includes:

- Session start timestamps
- Iteration markers with task counts
- Full agent output
- Completion/error status for each iteration
- Rate limit events

To disable logging, set `RALPH_LOG_FILE=""` in your config or environment.

## Supported Agent CLIs

Ralph is designed to be CLI-agnostic. The prompt is passed as the **last argument** to the configured command.

| CLI      | Configuration                                      | Notes                                          |
| -------- | -------------------------------------------------- | ---------------------------------------------- |
| opencode | `RALPH_AGENT_CMD="opencode run"`                   | Runs with message as argument                  |
| claude   | `RALPH_AGENT_CMD="claude -p"`                      | `-p` print mode (non-interactive)              |
| aider    | `RALPH_AGENT_CMD="aider --yes --message"`          | `--yes` auto-confirm, `--message` takes prompt |
| Custom   | Any CLI that accepts a prompt as the last argument |

## Tips for Writing Good Tasks

1. **Keep tasks small**: Each task should be completable and actionable in a single agent session
2. **Subtasks must be specific**: Break down the work into concrete steps (e.g., "Create POST /auth/login endpoint", "Add JWT token generation", "Write integration tests for login flow")
3. **Include verification steps**: Add subtasks for testing and verification
4. **Provide context**: Use the `notes` field to guide the agent with constraints or tips
5. **Order logically**: While the agent infers dependencies, ordering tasks logically helps

## License

MIT License - See [LICENSE](LICENSE) file
