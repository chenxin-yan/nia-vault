import figures from "@inquirer/figures";
import type { LocalFolder } from "./nia-sync";

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
