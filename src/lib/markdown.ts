import { Marked } from "marked";
// @ts-expect-error - marked-terminal lacks up-to-date type definitions
import { markedTerminal } from "marked-terminal";

// Lazy singleton - created on first use
let markedInstance: Marked | null = null;

/**
 * Get or create the configured Marked instance for terminal rendering.
 * Uses lazy initialization to capture TTY state at render time.
 */
function getMarkedInstance(): Marked {
  if (markedInstance) {
    return markedInstance;
  }

  markedInstance = new Marked();

  // Always apply marked-terminal for proper terminal output
  // It handles both TTY and non-TTY cases better than raw HTML output
  markedInstance.use(
    markedTerminal({
      // Text reflow settings
      width: process.stdout.columns || 80,
      reflowText: true,

      // Enable emoji rendering
      emoji: true,

      // Show section prefixes for headers (e.g., "# " prefix)
      showSectionPrefix: false,

      // Unescape HTML entities for better readability
      unescape: true,

      // Tab size for code blocks
      tab: 2,
    }),
  );

  return markedInstance;
}

/**
 * Render markdown text for terminal output.
 * Automatically handles NO_COLOR, non-TTY, and TERM=dumb environments.
 *
 * @param text - Markdown text to render
 * @returns Formatted string for terminal display
 */
export function renderMarkdown(text: string): string {
  if (!text) {
    return "";
  }

  const marked = getMarkedInstance();
  const result = marked.parse(text);

  // marked.parse can return string or Promise<string>
  // In synchronous mode (default), it returns string
  if (typeof result === "string") {
    // Remove trailing newlines that marked adds
    return result.trimEnd();
  }

  // Fallback for unexpected async result
  return text;
}
