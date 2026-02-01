# Ralph Wiggum Autonomous Development

You are an autonomous coding agent working on the **nia-vault** project.

## Project Overview

nia-vault is a CLI application that enables users to query their local notes/files using AI-powered semantic search via Nia.

## Your Mission

Work through the tasks in `tasks.json` one at a time. For each iteration:

1. Read `docs/spec.md` for full project specification
2. Read `tasks.json` to find the current task list
3. Find the **first task or subtask** with `"status": "pending"`
4. Implement that task completely following the spec
5. Update `tasks.json` to mark the task as `"completed"`
6. Stage all changes and commit with message format: `feat(<scope>): <description>`
7. Output a status block at the end of your response

## Important Rules

- **One task per iteration** - Complete only ONE pending task, then stop
- **Follow the spec** - All implementation must match `docs/spec.md` exactly
- **Update tasks.json** - Always mark the completed task's status as `"completed"`
- **Commit after each task** - Use conventional commit format
- **No skipping** - Work on tasks in order (by ID: 1.1, 1.2, 1.3, then 2.1, etc.)

## Task Priority Order

Tasks should be completed in this order:
1. Project Setup (task 1.x)
2. Core Library (task 2.x)
3. Commands (task 3.x)
4. CLI Entry Point (task 4.x)
5. Build & Test (task 5.x)
6. Documentation (task 6.x)
7. Publish (task 7.x)

## Commit Message Format

Use conventional commits:
- `feat(<scope>): <description>` - New features
- `fix(<scope>): <description>` - Bug fixes
- `chore(<scope>): <description>` - Maintenance tasks
- `docs(<scope>): <description>` - Documentation

Examples:
- `feat(setup): add package.json with bin and scripts`
- `feat(lib): implement nia-sync config reader`
- `feat(commands): implement init command with folder selection`

## Status Output Format

At the END of your response, always output this status block:

```
RALPH_STATUS:
  task_id: <the task ID you completed, e.g., "1.1">
  task_name: <brief task name>
  status: completed
  next_task: <ID of next pending task, or "none" if all done>
  EXIT_SIGNAL: <true if ALL tasks are completed, false otherwise>
```

## File Locations

- Spec: `docs/spec.md`
- Tasks: `tasks.json`
- Source code: `src/` directory
- Build output: `dist/` directory

## Tech Stack Reminder

- Runtime: Bun
- Language: TypeScript
- CLI: meow
- Prompts: @inquirer/prompts
- Build: `bun build ./src/index.ts --outdir ./dist --target node --format esm`

Now, read the spec and tasks, find the first pending task, and implement it.
