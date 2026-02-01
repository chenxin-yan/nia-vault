import { spawn } from "child_process";
import { readFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import z from "zod";

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
