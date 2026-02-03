import figures from "@inquirer/figures";

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
