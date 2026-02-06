import { spawn } from "node:child_process";
import { join } from "node:path";
import { select } from "@inquirer/prompts";
import z from "zod";
import { withContext } from "../lib/command-context.js";
import {
  listLocalFolders,
  NiaSyncError,
  runNiaSearch,
} from "../lib/nia-sync.js";
import { error } from "../lib/output.js";

// Schema for parsing nia search --raw response
// --raw returns vector search results without LLM processing
// Response format: { content: null, sources: [...] }
// Each source has content (text chunk) and metadata containing score, file_path, etc.
const NiaSearchSourceMetadata = z.object({
  file_path: z.string(),
  local_folder_name: z.string().optional(),
  local_folder_id: z.string().optional(),
  chunk_index: z.number().optional(),
  start_byte: z.string().optional(),
  source_type: z.string().optional(),
  score: z.number(),
});

const NiaSearchSource = z.object({
  content: z.string(),
  metadata: NiaSearchSourceMetadata,
});

// Score threshold for filtering search results
// Based on testing: relevant results typically score > 0.4, loosely related ~0.33-0.35
// Using 0.4 as threshold to filter noise while keeping relevant results
const SCORE_THRESHOLD = 0.4;

const NiaSearchRawResponse = z.object({
  // content is null in --raw mode (no LLM processing)
  content: z.string().nullable(),
  sources: z.array(NiaSearchSource).optional(),
  follow_up_questions: z.array(z.string()).optional(),
});

/**
 * Get the user's preferred editor from environment variables
 * Falls back to common editors if none set
 */
function getEditor(): string {
  return process.env.VISUAL || process.env.EDITOR || "vi";
}

/**
 * Open a file in the user's preferred editor
 * Spawns editor as an interactive subprocess
 */
async function openInEditor(filePath: string): Promise<void> {
  const editor = getEditor();

  return new Promise((resolve, reject) => {
    const proc = spawn(editor, [filePath], {
      stdio: "inherit", // Inherit stdin/stdout/stderr for interactive editing
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Editor exited with code ${code}`));
      }
    });

    proc.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        reject(
          new Error(
            `Editor '${editor}' not found. Set EDITOR or VISUAL environment variable.`,
          ),
        );
      } else {
        reject(new Error(`Failed to open editor: ${err.message}`));
      }
    });
  });
}

/**
 * Find command
 * Search for files matching a query and open selected file in editor
 */
export const findCommand = withContext(
  { requiresNiaSync: true, requiresVaultConfig: true },
  async (ctx, query: string): Promise<void> => {
    // Validate query
    if (!query?.trim()) {
      console.log(
        error(
          'Please provide a search query. Usage: vault find "your question"',
        ),
      );
      process.exit(1);
    }

    // Get selected folders from config
    const selectedFolders = ctx.vaultConfig.selectedFolders;
    if (selectedFolders.length === 0) {
      console.log(
        error(
          "No folders selected for search. Run 'vault folders' to select folders.",
        ),
      );
      process.exit(1);
    }

    // Get folder paths to resolve relative file paths to absolute paths
    let folderPathMap: Map<string, string>;
    try {
      const folders = await listLocalFolders();
      folderPathMap = new Map(folders.map((f) => [f.id, f.path]));
    } catch (err) {
      if (err instanceof NiaSyncError) {
        console.log(error(err.message));
      } else {
        console.log(error("Failed to get folder information."));
      }
      process.exit(1);
    }

    // Search using nia with --raw flag for direct vector search (skips LLM processing)
    let jsonOutput: string;
    try {
      const result = await runNiaSearch(query.trim(), selectedFolders, {
        raw: true,
      });

      // Ensure we have output (json mode should always return a string)
      if (!result) {
        console.log(error("No response received from search."));
        process.exit(1);
      }
      jsonOutput = result;
    } catch (err) {
      if (err instanceof NiaSyncError) {
        console.log(error(err.message));
      } else {
        console.log(
          error("Failed to run search. Make sure 'nia' command is available."),
        );
      }
      process.exit(1);
    }

    // Parse JSON response
    let sources: Array<{
      filePath: string; // Absolute path for opening
      displayPath: string; // Relative path for display
      folderName?: string;
      snippet?: string;
    }>;
    try {
      const parsed = JSON.parse(jsonOutput);
      const result = NiaSearchRawResponse.parse(parsed);

      // Filter sources by relevancy score before processing
      // Sources with score below threshold are considered noise and excluded
      const relevantSources = (result.sources || []).filter(
        (source) => source.metadata.score >= SCORE_THRESHOLD,
      );

      // Transform sources to extract file paths from metadata
      // Resolve relative paths to absolute paths using folder base paths
      sources = relevantSources
        .map((source) => {
          const folderId = source.metadata.local_folder_id;
          const relativePath = source.metadata.file_path;
          const basePath = folderId ? folderPathMap.get(folderId) : undefined;

          // Build absolute path if we have the base path, otherwise use relative
          const absolutePath = basePath
            ? join(basePath, relativePath)
            : relativePath;

          return {
            filePath: absolutePath,
            displayPath: relativePath, // Keep relative path for display
            folderName: source.metadata.local_folder_name,
            snippet: source.content,
          };
        })
        .filter((source) => source.filePath !== source.displayPath); // Only include sources we can resolve
    } catch (err) {
      if (err instanceof SyntaxError) {
        console.log(error("Failed to parse search response. Invalid JSON."));
      } else if (err instanceof z.ZodError) {
        console.log(error("Unexpected search response format."));
      } else {
        console.log(
          error(`Failed to parse search response: ${(err as Error).message}`),
        );
      }
      process.exit(1);
    }

    // Check if any sources were found (after score filtering)
    if (sources.length === 0) {
      console.log("No matching files found.\n");
      return;
    }

    // Deduplicate sources by display path (same file may appear multiple times with different chunks)
    // Limit to top 5 most relevant results (sources are ordered by relevance from the API)
    const MAX_RESULTS = 5;
    const uniqueSources = Array.from(
      new Map(sources.map((s) => [s.displayPath, s])).values(),
    ).slice(0, MAX_RESULTS);

    // Create choices for the select prompt
    // Show relative path for readability, but use absolute path as value
    const choices = uniqueSources.map((source) => ({
      name: source.displayPath,
      value: source.filePath,
      description: source.snippet?.substring(0, 80),
    }));

    // Show interactive file picker
    const selectedPath = await select<string>({
      message: "Select a file to open:",
      choices,
    });

    // Open selected file in editor
    try {
      await openInEditor(selectedPath);
    } catch (err) {
      console.log(error((err as Error).message));
      process.exit(1);
    }
  },
);
