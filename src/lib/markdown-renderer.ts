/**
 * Chalk-based markdown renderer for terminal output.
 * Converts parsed markdown tokens to styled terminal strings.
 */

import chalk from "chalk";
import {
  type CodeBlockMetadata,
  type HeaderMetadata,
  type InlineToken,
  type ListItemMetadata,
  type MarkdownToken,
  tokenize,
} from "./markdown-parser.js";

/**
 * Render an inline token to a styled string.
 */
function renderInlineToken(token: InlineToken): string {
  switch (token.type) {
    case "text":
      return token.content;

    case "bold":
      return chalk.bold(token.content);

    case "italic":
      return chalk.italic(token.content);

    case "inline_code":
      return chalk.cyan(token.content);

    case "link": {
      // Show link text followed by URL in blue underline
      const url = token.metadata?.url ?? "";
      return `${token.content} (${chalk.blue.underline(url)})`;
    }

    default:
      return token.content;
  }
}

/**
 * Render an array of inline tokens to a styled string.
 */
function renderInlineTokens(tokens: InlineToken[]): string {
  return tokens.map(renderInlineToken).join("");
}

/**
 * Render a single markdown token to a chalk-styled string.
 */
export function renderToken(token: MarkdownToken): string {
  switch (token.type) {
    case "header": {
      const metadata = token.metadata as HeaderMetadata | undefined;
      const level = metadata?.level ?? 1;
      const content = token.children
        ? renderInlineTokens(token.children)
        : token.content;

      // Style headers based on level
      switch (level) {
        case 1:
          return chalk.bold.underline(content);
        case 2:
          return chalk.bold(content);
        case 3:
          return chalk.bold.dim(content);
        case 4:
        case 5:
        case 6:
          return chalk.dim(content);
        default:
          return content;
      }
    }

    case "bold":
      return chalk.bold(token.content);

    case "italic":
      return chalk.italic(token.content);

    case "code_block": {
      const metadata = token.metadata as CodeBlockMetadata | undefined;
      const language = metadata?.language;
      const lines: string[] = [];

      // Add language label if present
      if (language) {
        lines.push(chalk.dim(`[${language}]`));
      }

      // Style code block with dim background effect using indent and dim styling
      const codeLines = token.content.split("\n");
      for (const line of codeLines) {
        lines.push(chalk.dim("  ") + chalk.gray(line));
      }

      return lines.join("\n");
    }

    case "inline_code":
      return chalk.cyan(token.content);

    case "list_item": {
      const metadata = token.metadata as ListItemMetadata | undefined;
      const indent = metadata?.indent ?? 0;
      const ordered = metadata?.ordered ?? false;
      const number = metadata?.number ?? 1;
      const content = token.children
        ? renderInlineTokens(token.children)
        : token.content;

      // Create indentation
      const indentStr = "  ".repeat(indent / 2);

      // Use bullet or number as prefix
      const prefix = ordered ? `${number}.` : "-";

      return `${indentStr}${prefix} ${content}`;
    }

    case "link": {
      // For standalone link tokens (not inline)
      const url = (token.metadata as { url?: string } | undefined)?.url ?? "";
      return `${token.content} (${chalk.blue.underline(url)})`;
    }

    case "blockquote": {
      const content = token.children
        ? renderInlineTokens(token.children)
        : token.content;

      // Style blockquotes with dim color and | prefix
      const lines = content.split("\n");
      return lines.map((line) => chalk.dim(`| ${line}`)).join("\n");
    }

    case "paragraph": {
      const content = token.children
        ? renderInlineTokens(token.children)
        : token.content;
      return content;
    }

    case "text":
      return token.content;

    default:
      return token.content;
  }
}

/**
 * Render markdown text to a chalk-styled string for terminal output.
 * Parses the markdown, converts tokens, and returns the formatted result.
 *
 * @param text - Markdown text to render
 * @returns Formatted string for terminal display
 */
export function renderMarkdown(text: string): string {
  if (!text) {
    return "";
  }

  const tokens = tokenize(text);

  if (tokens.length === 0) {
    return text;
  }

  const renderedParts: string[] = [];

  for (const token of tokens) {
    renderedParts.push(renderToken(token));
  }

  // Join with newlines, adding extra spacing after headers and before code blocks
  const result: string[] = [];
  for (let i = 0; i < renderedParts.length; i++) {
    const part = renderedParts[i];
    const token = tokens[i];

    if (part === undefined || token === undefined) continue;

    result.push(part);

    // Add extra newline after headers and code blocks for readability
    if (token.type === "header" || token.type === "code_block") {
      result.push("");
    }
    // Add newline between paragraphs
    else if (token.type === "paragraph" && i < renderedParts.length - 1) {
      result.push("");
    }
  }

  return result.join("\n").trimEnd();
}
