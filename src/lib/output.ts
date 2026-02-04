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
