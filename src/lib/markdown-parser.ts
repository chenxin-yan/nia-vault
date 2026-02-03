/**
 * Custom markdown parser that tokenizes markdown text into structured tokens.
 * Designed for terminal rendering with chalk.
 */

// Token types for different markdown elements
export type TokenType =
  | "header"
  | "bold"
  | "italic"
  | "code_block"
  | "inline_code"
  | "list_item"
  | "link"
  | "blockquote"
  | "paragraph"
  | "text";

// Metadata for specific token types
export interface HeaderMetadata {
  level: 1 | 2 | 3 | 4 | 5 | 6;
}

export interface CodeBlockMetadata {
  language?: string;
}

export interface LinkMetadata {
  url: string;
}

export interface ListItemMetadata {
  indent: number;
  ordered: boolean;
  number?: number;
}

export interface InlineToken {
  type: "text" | "bold" | "italic" | "inline_code" | "link";
  content: string;
  metadata?: LinkMetadata;
}

export interface MarkdownToken {
  type: TokenType;
  content: string;
  // Inline tokens for text with formatting (paragraph, header, list_item, blockquote)
  children?: InlineToken[];
  metadata?:
    | HeaderMetadata
    | CodeBlockMetadata
    | LinkMetadata
    | ListItemMetadata;
}

// Match result for inline elements
interface InlineMatch {
  index: number;
  length: number;
  type: InlineToken["type"];
  content: string;
  metadata?: LinkMetadata;
}

/**
 * Check if a match overlaps with any existing matches
 */
function hasOverlap(match: RegExpExecArray, existing: InlineMatch[]): boolean {
  return existing.some(
    (m) =>
      (match.index >= m.index && match.index < m.index + m.length) ||
      (match.index + match[0].length > m.index &&
        match.index + match[0].length <= m.index + m.length),
  );
}

/**
 * Find all inline formatting matches in a string
 */
function findAllMatches(str: string): InlineMatch[] {
  const matches: InlineMatch[] = [];
  let match: RegExpExecArray | null = null;

  // Find inline code first (highest precedence - prevents other parsing inside)
  const codeRegex = /`([^`]+)`/g;
  match = codeRegex.exec(str);
  while (match !== null) {
    matches.push({
      index: match.index,
      length: match[0].length,
      type: "inline_code",
      content: match[1] ?? "",
    });
    match = codeRegex.exec(str);
  }

  // Find links
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  match = linkRegex.exec(str);
  while (match !== null) {
    if (!hasOverlap(match, matches)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: "link",
        content: match[1] ?? "",
        metadata: { url: match[2] ?? "" },
      });
    }
    match = linkRegex.exec(str);
  }

  // Find bold (** and __)
  const boldAsteriskRegex = /\*\*([^*]+)\*\*/g;
  match = boldAsteriskRegex.exec(str);
  while (match !== null) {
    if (!hasOverlap(match, matches)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: "bold",
        content: match[1] ?? "",
      });
    }
    match = boldAsteriskRegex.exec(str);
  }

  const boldUnderscoreRegex = /__([^_]+)__/g;
  match = boldUnderscoreRegex.exec(str);
  while (match !== null) {
    if (!hasOverlap(match, matches)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: "bold",
        content: match[1] ?? "",
      });
    }
    match = boldUnderscoreRegex.exec(str);
  }

  // Find italic (* and _) - must not be part of bold
  const italicAsteriskRegex = /(?<!\*)\*(?!\*)([^*]+)(?<!\*)\*(?!\*)/g;
  match = italicAsteriskRegex.exec(str);
  while (match !== null) {
    if (!hasOverlap(match, matches)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: "italic",
        content: match[1] ?? "",
      });
    }
    match = italicAsteriskRegex.exec(str);
  }

  const italicUnderscoreRegex = /(?<!_)_(?!_)([^_]+)(?<!_)_(?!_)/g;
  match = italicUnderscoreRegex.exec(str);
  while (match !== null) {
    if (!hasOverlap(match, matches)) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type: "italic",
        content: match[1] ?? "",
      });
    }
    match = italicUnderscoreRegex.exec(str);
  }

  // Sort by index
  return matches.sort((a, b) => a.index - b.index);
}

/**
 * Parse inline formatting (bold, italic, code, links) within text.
 * Returns an array of inline tokens.
 */
export function parseInlineContent(text: string): InlineToken[] {
  if (!text) {
    return [];
  }

  const tokens: InlineToken[] = [];
  const matches = findAllMatches(text);

  if (matches.length === 0) {
    // No formatting, return plain text
    return [{ type: "text", content: text }];
  }

  let currentIndex = 0;
  for (const match of matches) {
    // Add text before this match
    if (match.index > currentIndex) {
      tokens.push({
        type: "text",
        content: text.slice(currentIndex, match.index),
      });
    }

    // Add the matched token
    const token: InlineToken = {
      type: match.type,
      content: match.content,
    };
    if (match.metadata) {
      token.metadata = match.metadata;
    }
    tokens.push(token);

    currentIndex = match.index + match.length;
  }

  // Add remaining text after last match
  if (currentIndex < text.length) {
    tokens.push({
      type: "text",
      content: text.slice(currentIndex),
    });
  }

  return tokens;
}

// Regex patterns for markdown elements
const PATTERNS = {
  header: /^(#{1,6})\s+(.+)$/,
  codeBlockStart: /^```(\w*)$/,
  codeBlockEnd: /^```$/,
  unorderedList: /^(\s*)[-*]\s+(.+)$/,
  orderedList: /^(\s*)(\d+)\.\s+(.+)$/,
  blockquote: /^>\s*(.*)$/,
};

/**
 * Tokenize markdown text into an array of structured tokens.
 *
 * @param text - The markdown text to parse
 * @returns Array of MarkdownToken objects
 */
export function tokenize(text: string): MarkdownToken[] {
  if (!text) {
    return [];
  }

  const tokens: MarkdownToken[] = [];
  const lines = text.split("\n");

  let i = 0;
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];
  let codeBlockLanguage: string | undefined;

  while (i < lines.length) {
    const line = lines[i];
    if (line === undefined) {
      i++;
      continue;
    }

    // Handle code blocks
    if (!inCodeBlock) {
      const codeStartMatch = line.match(PATTERNS.codeBlockStart);
      if (codeStartMatch) {
        inCodeBlock = true;
        codeBlockLanguage = codeStartMatch[1] || undefined;
        codeBlockContent = [];
        i++;
        continue;
      }
    } else {
      if (PATTERNS.codeBlockEnd.test(line)) {
        // End of code block
        const codeToken: MarkdownToken = {
          type: "code_block",
          content: codeBlockContent.join("\n"),
        };
        if (codeBlockLanguage) {
          codeToken.metadata = { language: codeBlockLanguage };
        }
        tokens.push(codeToken);
        inCodeBlock = false;
        codeBlockContent = [];
        codeBlockLanguage = undefined;
        i++;
        continue;
      }
      // Inside code block, accumulate content
      codeBlockContent.push(line);
      i++;
      continue;
    }

    // Handle headers
    const headerMatch = line.match(PATTERNS.header);
    if (headerMatch) {
      const level = (headerMatch[1]?.length ?? 1) as 1 | 2 | 3 | 4 | 5 | 6;
      const content = headerMatch[2] ?? "";
      tokens.push({
        type: "header",
        content,
        children: parseInlineContent(content),
        metadata: { level },
      });
      i++;
      continue;
    }

    // Handle blockquotes
    const blockquoteMatch = line.match(PATTERNS.blockquote);
    if (blockquoteMatch) {
      // Collect consecutive blockquote lines
      const quoteLines: string[] = [];
      while (i < lines.length) {
        const currentLine = lines[i];
        if (currentLine === undefined) break;
        const bqMatch = currentLine.match(PATTERNS.blockquote);
        if (bqMatch) {
          quoteLines.push(bqMatch[1] ?? "");
          i++;
        } else {
          break;
        }
      }
      const content = quoteLines.join("\n");
      tokens.push({
        type: "blockquote",
        content,
        children: parseInlineContent(content),
      });
      continue;
    }

    // Handle unordered list items
    const unorderedMatch = line.match(PATTERNS.unorderedList);
    if (unorderedMatch) {
      const indent = (unorderedMatch[1] ?? "").length;
      const content = unorderedMatch[2] ?? "";
      tokens.push({
        type: "list_item",
        content,
        children: parseInlineContent(content),
        metadata: { indent, ordered: false },
      });
      i++;
      continue;
    }

    // Handle ordered list items
    const orderedMatch = line.match(PATTERNS.orderedList);
    if (orderedMatch) {
      const indent = (orderedMatch[1] ?? "").length;
      const number = Number.parseInt(orderedMatch[2] ?? "1", 10);
      const content = orderedMatch[3] ?? "";
      tokens.push({
        type: "list_item",
        content,
        children: parseInlineContent(content),
        metadata: { indent, ordered: true, number },
      });
      i++;
      continue;
    }

    // Handle empty lines (paragraph separators)
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Handle regular paragraphs - collect consecutive non-empty lines
    const paragraphLines: string[] = [];
    while (i < lines.length) {
      const currentLine = lines[i];
      if (currentLine === undefined) break;

      // Stop at empty lines or block-level elements
      if (
        currentLine.trim() === "" ||
        PATTERNS.header.test(currentLine) ||
        PATTERNS.codeBlockStart.test(currentLine) ||
        PATTERNS.blockquote.test(currentLine) ||
        PATTERNS.unorderedList.test(currentLine) ||
        PATTERNS.orderedList.test(currentLine)
      ) {
        break;
      }

      paragraphLines.push(currentLine);
      i++;
    }

    if (paragraphLines.length > 0) {
      const content = paragraphLines.join("\n");
      tokens.push({
        type: "paragraph",
        content,
        children: parseInlineContent(content),
      });
    }
  }

  // Handle unclosed code block (edge case)
  if (inCodeBlock && codeBlockContent.length > 0) {
    const codeToken: MarkdownToken = {
      type: "code_block",
      content: codeBlockContent.join("\n"),
    };
    if (codeBlockLanguage) {
      codeToken.metadata = { language: codeBlockLanguage };
    }
    tokens.push(codeToken);
  }

  return tokens;
}
