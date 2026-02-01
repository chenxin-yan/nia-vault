import type { LocalFolder, SearchResult } from "../types.js";

// Separator line for search results
const SEPARATOR = "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━";

/**
 * Format search results for display
 */
export function formatSearchResults(result: SearchResult): string {
  if (result.results.length === 0) {
    return "No results found. Try a different query or check if your folders are synced.";
  }

  const lines: string[] = [];

  for (const item of result.results) {
    lines.push(SEPARATOR);
    lines.push(`📄 ${item.path}`);
    lines.push(SEPARATOR);
    lines.push(item.content);
    lines.push("");
  }

  lines.push(`Found ${result.total} result${result.total === 1 ? "" : "s"}`);

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
      lines.push(`  ✓ ${folder.name.padEnd(18)} ${folder.path}`);
    }
  }

  if (available.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push("Available folders (synced but not included):");
    for (const folder of available) {
      lines.push(`  ○ ${folder.name.padEnd(18)} ${folder.path}`);
    }
  }

  if (lines.length > 0) {
    lines.push("");
    lines.push(
      "Tip: Use 'vault folders add' or 'vault folders remove' to manage",
    );
  } else {
    lines.push("No synced folders found. Run 'nia add ~/path' to add folders.");
  }

  return lines.join("\n");
}

/**
 * Format success message
 */
export function success(message: string): string {
  return `✓ ${message}`;
}

/**
 * Format error message
 */
export function error(message: string): string {
  return `✗ ${message}`;
}

/**
 * Format info message
 */
export function info(message: string): string {
  return message;
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
