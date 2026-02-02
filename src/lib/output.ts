import figures from "@inquirer/figures";
import { renderMarkdown } from "./markdown.js";
import {
  NiaApiError,
  type NiaStreamEvent,
  parseStreamSources,
  type SearchResult,
  type SearchResultItem,
} from "./nia.js";
import type { LocalFolder } from "./nia-sync";

/**
 * Format search results for display
 */
export function formatSearchResults(
  result: SearchResult,
  showSources: boolean = false,
): string {
  if (!result.answer && result.sources.length === 0) {
    return "No results found. Try a different query or check if your folders are synced.";
  }

  const lines: string[] = [];

  // Show AI-generated answer if available (rendered as markdown)
  if (result.answer) {
    lines.push(renderMarkdown(result.answer));
  }

  // Show sources only if flag is enabled and sources exist
  if (showSources && result.sources.length > 0) {
    lines.push("");
    lines.push("Sources:");
    for (const item of result.sources) {
      if (item.filePath) {
        lines.push(`- 📄 ${item.filePath}`);
      }
    }
    lines.push("");
    lines.push(`Found ${result.total} result${result.total === 1 ? "" : "s"}`);
  }

  return lines.join("\n");
}

/**
 * Format folder list for display
 */
export function formatFolderList(
  folders: LocalFolder[],
  selectedIds: string[],
): string {
  const selected = folders.filter((f) => selectedIds.includes(f.id));
  const available = folders.filter((f) => !selectedIds.includes(f.id));

  const lines: string[] = [];

  if (selected.length > 0) {
    lines.push("Search folders (included in queries):");
    for (const folder of selected) {
      lines.push(`  ${figures.tick} ${folder.name.padEnd(18)} ${folder.path}`);
    }
  }

  if (available.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Available folders (synced but not included):");
    for (const folder of available) {
      lines.push(
        `  ${figures.radioOff} ${folder.name.padEnd(18)} ${folder.path}`,
      );
    }
  }

  if (lines.length <= 0) {
    lines.push("No synced folders found. Run 'nia add ~/path' to add folders.");
  }

  return lines.join("\n");
}

/**
 * Format success message
 */
export function success(message: string): string {
  return `${figures.tick} ${message}`;
}

/**
 * Format error message
 */
export function error(message: string): string {
  return `${figures.cross} ${message}`;
}

/**
 * Format config display
 */
export function formatConfig(
  configPath: string,
  niaSyncPath: string,
  folderCount: number,
): string {
  const lines = [
    "Configuration:",
    `  Config file:     ${configPath}`,
    `  API key source:  ${niaSyncPath} (nia-sync)`,
    `  Search folders:  ${folderCount} selected`,
  ];
  return lines.join("\n");
}

/**
 * Count the number of lines in a string
 */
function countLines(text: string): number {
  if (!text) return 0;
  const matches = text.match(/\n/g);
  return matches ? matches.length : 0;
}

/**
 * Clear the specified number of lines from the terminal
 * Uses ANSI escape codes to move cursor up and clear
 */
function clearLines(lineCount: number): void {
  if (lineCount <= 0) return;
  // Move cursor up by lineCount lines and clear from cursor to end of screen
  process.stdout.write(`\x1b[${lineCount}A\x1b[0J`);
}

/**
 * Stream search results to terminal with real-time output
 *
 * Strategy:
 * 1. Stream raw text chunks to stdout as they arrive
 * 2. Accumulate full response text
 * 3. After stream ends, clear the streamed output (if TTY)
 * 4. Re-render with full markdown formatting
 *
 * @param stream - Async generator yielding NiaStreamEvents
 * @param showSources - Whether to display source citations after the answer
 */
export async function streamSearchResults(
  stream: AsyncGenerator<NiaStreamEvent, void, unknown>,
  showSources: boolean = false,
): Promise<void> {
  let fullText = "";
  let sources: SearchResultItem[] = [];
  let lineCount = 0;
  const isTTY = process.stdout.isTTY;

  for await (const event of stream) {
    switch (event.type) {
      case "content":
        // Write chunk to stdout immediately for real-time feedback
        process.stdout.write(event.data);
        fullText += event.data;
        // Track newlines for clearing later
        lineCount += countLines(event.data);
        break;

      case "sources":
        // Parse and store sources for display after streaming completes
        sources = parseStreamSources(event.data);
        break;

      case "source_paths":
        // Parse file paths only (when include_sources=false)
        try {
          const paths = JSON.parse(event.data);
          if (Array.isArray(paths)) {
            sources = paths.map((path: string) => ({
              content: "",
              filePath: path,
            }));
          }
        } catch {
          // Ignore parse errors for source_paths
        }
        break;

      case "error":
        throw new NiaApiError(event.data);
    }
  }

  // Handle empty response
  if (!fullText && sources.length === 0) {
    console.log(
      "\nNo results found. Try a different query or check if your folders are synced.",
    );
    return;
  }

  // In TTY mode: clear streamed output and re-render with markdown
  if (fullText && isTTY) {
    // Account for the final line (even without trailing newline)
    const totalLines = lineCount + 1;
    clearLines(totalLines);

    // Re-render with full markdown formatting
    console.log(renderMarkdown(fullText));
  } else if (fullText && !isTTY) {
    // Non-TTY: just add a newline after the streamed content
    console.log();
  }

  // Show sources if requested and available
  if (showSources && sources.length > 0) {
    console.log("");
    console.log("Sources:");
    for (const item of sources) {
      if (item.filePath) {
        console.log(`- \u{1F4C4} ${item.filePath}`);
      }
    }
    console.log("");
    console.log(
      `Found ${sources.length} result${sources.length === 1 ? "" : "s"}`,
    );
  }
}
