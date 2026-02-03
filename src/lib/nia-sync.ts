import { type ChildProcess, spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import z from "zod";

// ============================================================================
// Options for nia search CLI command
// ============================================================================

export interface NiaSearchOptions {
  /** Include source citations in output */
  sources?: boolean;
  /** Disable markdown rendering in CLI output */
  noMarkdown?: boolean;
  /** Disable streaming (wait for full response) */
  noStream?: boolean;
  /** Output in JSON format */
  json?: boolean;
}

// nia-sync configuration (read from ~/.nia-sync/config.json)
export const NiaSyncConfig = z.object({
  api_key: z.string().min(1),
});
export type NiaSyncConfig = z.infer<typeof NiaSyncConfig>;

export const NIA_SYNC_CONFIG_PATH = join(homedir(), ".nia-sync", "config.json");

/**
 * Error class for nia-sync CLI errors
 */
export class NiaSyncError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NiaSyncError";
  }
}

// Schema for a single source from nia status --json
const NiaSource = z.object({
  id: z.string(),
  name: z.string(),
  path: z.string(),
  type: z.string(),
  status: z.string(),
});

// Schema for nia status --json response
const NiaStatusResponse = z.object({
  sources: z.array(NiaSource),
});

// Local folder from nia-sync (filtered from sources where type === "folder")
export type LocalFolder = {
  id: string;
  name: string;
  path: string;
  status: string;
};

/**
 * Read nia-sync configuration from ~/.nia-sync/config.json
 * Throws if config doesn't exist or is invalid
 */
export async function readNiaSyncConfig() {
  const content = await readFile(NIA_SYNC_CONFIG_PATH, "utf-8");
  const json = JSON.parse(content);
  return NiaSyncConfig.parse(json);
}

/**
 * Check if nia-sync is configured
 * Returns true if config file exists and contains valid API key
 */
export async function isNiaSyncConfigured(): Promise<boolean> {
  try {
    await readNiaSyncConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Run `nia once` command to trigger a one-time sync
 * Returns true if successful, false otherwise
 */
export async function runNiaOnce(): Promise<boolean> {
  return new Promise((resolve) => {
    const proc = spawn("nia", ["once"], {
      stdio: "inherit",
    });

    proc.on("close", (code) => {
      resolve(code === 0);
    });

    proc.on("error", () => {
      resolve(false);
    });
  });
}

/**
 * Run `nia status --json` to get list of synced folders
 * Returns the raw JSON output from the CLI
 */
async function runNiaStatusJson(): Promise<string> {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const proc = spawn("nia", ["status", "--json"], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    proc.stdout.on("data", (data: Buffer) => {
      stdout += data.toString();
    });

    proc.stderr.on("data", (data: Buffer) => {
      stderr += data.toString();
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new NiaSyncError(stderr || `nia status exited with code ${code}`),
        );
      }
    });

    proc.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new NiaSyncError(
            "nia-sync CLI not found. Install it with: pip install nia-sync",
          ),
        );
      } else {
        reject(new NiaSyncError(`Failed to run nia status: ${err.message}`));
      }
    });
  });
}

/**
 * List all synced local folders from nia-sync CLI
 *
 * Runs `nia status --json` to get the current list of synced folders.
 * Requires nia-sync to be installed and configured.
 *
 * CLI commands for managing local folders:
 * - `nia status` - Show all configured sources with sync status
 * - `nia add <path>` - Add new source for sync
 * - `nia remove <source>` - Remove source from sync
 *
 * @see https://docs.trynia.ai/local-sync
 */
export async function listLocalFolders(): Promise<LocalFolder[]> {
  try {
    const output = await runNiaStatusJson();
    const json = JSON.parse(output);
    const data = NiaStatusResponse.parse(json);

    return data.sources
      .filter((source) => source.type === "folder")
      .map(({ id, name, path, status }) => ({ id, name, path, status }));
  } catch (error) {
    if (error instanceof NiaSyncError) {
      throw error;
    }
    if (error instanceof SyntaxError) {
      throw new NiaSyncError(
        "Failed to parse nia status output. Make sure nia-sync is up to date.",
      );
    }
    if (error instanceof z.ZodError) {
      throw new NiaSyncError(
        `Invalid nia status response format: ${error.issues.map((issue) => issue.message).join(", ")}`,
      );
    }
    throw new NiaSyncError(
      `Failed to list local folders: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}

// ============================================================================
// Nia Search CLI Command
// ============================================================================

/**
 * Run `nia search` command to query notes using semantic search
 *
 * Spawns the nia CLI with the search command and appropriate arguments.
 * Supports both streaming (default) and non-streaming modes.
 *
 * In streaming mode: pipes stdout directly to process.stdout for real-time output
 * In non-streaming mode: captures stdout and returns the full output as a string
 *
 * @param query - Natural language search query
 * @param folderIds - Array of local folder IDs to search
 * @param options - Search options (sources, noMarkdown, noStream, json)
 * @returns In streaming mode: resolves when complete, returns empty string
 *          In non-streaming mode: resolves with the captured output
 *
 * @throws NiaSyncError if nia CLI is not found or exits with non-zero code
 */
export async function runNiaSearch(
  query: string,
  folderIds: string[],
  options: NiaSearchOptions = {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Build CLI args: nia search <query> [--local-folder <id>]... [flags]
    const args: string[] = ["search", query];

    // Add folder arguments
    for (const folderId of folderIds) {
      args.push("--local-folder", folderId);
    }

    // Add optional flags
    if (options.sources) {
      args.push("--sources");
    }
    if (options.noMarkdown) {
      args.push("--no-markdown");
    }
    if (options.noStream) {
      args.push("--no-stream");
    }
    if (options.json) {
      args.push("--json");
      // JSON mode is incompatible with streaming and markdown rendering in nia CLI
      // Ensure we disable both to avoid CLI validation errors
      if (!options.noStream) {
        args.push("--no-stream");
      }
      if (!options.noMarkdown) {
        args.push("--no-markdown");
      }
    }

    // Determine streaming vs non-streaming mode
    const isStreaming = !options.noStream && !options.json;

    let stdout = "";
    let stderr = "";

    const proc: ChildProcess = spawn("nia", args, {
      stdio: isStreaming
        ? ["ignore", "inherit", "pipe"] // Stream stdout directly to terminal
        : ["ignore", "pipe", "pipe"], // Capture stdout
    });

    // Capture stdout in non-streaming mode
    if (!isStreaming && proc.stdout) {
      proc.stdout.on("data", (data: Buffer) => {
        stdout += data.toString();
      });
    }

    // Always capture stderr for error messages
    if (proc.stderr) {
      proc.stderr.on("data", (data: Buffer) => {
        stderr += data.toString();
      });
    }

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(
          new NiaSyncError(stderr || `nia search exited with code ${code}`),
        );
      }
    });

    proc.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new NiaSyncError(
            "nia-sync CLI not found. Install it with: pip install nia-sync",
          ),
        );
      } else {
        reject(new NiaSyncError(`Failed to run nia search: ${err.message}`));
      }
    });
  });
}
