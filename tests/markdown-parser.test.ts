import { describe, expect, test } from "bun:test";
import {
  type HeaderMetadata,
  type ListItemMetadata,
  type MarkdownToken,
  parseInlineContent,
  tokenize,
} from "../src/lib/markdown-parser";

describe("parseInlineContent", () => {
  test("returns plain text for content without formatting", () => {
    const result = parseInlineContent("Hello, world!");
    expect(result).toEqual([{ type: "text", content: "Hello, world!" }]);
  });

  test("returns empty array for empty string", () => {
    const result = parseInlineContent("");
    expect(result).toEqual([]);
  });

  test("parses inline code", () => {
    const result = parseInlineContent("Use `console.log()` to debug");
    expect(result).toEqual([
      { type: "text", content: "Use " },
      { type: "inline_code", content: "console.log()" },
      { type: "text", content: " to debug" },
    ]);
  });

  test("parses bold with asterisks", () => {
    const result = parseInlineContent("This is **bold** text");
    expect(result).toEqual([
      { type: "text", content: "This is " },
      { type: "bold", content: "bold" },
      { type: "text", content: " text" },
    ]);
  });

  test("parses bold with underscores", () => {
    const result = parseInlineContent("This is __bold__ text");
    expect(result).toEqual([
      { type: "text", content: "This is " },
      { type: "bold", content: "bold" },
      { type: "text", content: " text" },
    ]);
  });

  test("parses italic with asterisks", () => {
    const result = parseInlineContent("This is *italic* text");
    expect(result).toEqual([
      { type: "text", content: "This is " },
      { type: "italic", content: "italic" },
      { type: "text", content: " text" },
    ]);
  });

  test("parses italic with underscores", () => {
    const result = parseInlineContent("This is _italic_ text");
    expect(result).toEqual([
      { type: "text", content: "This is " },
      { type: "italic", content: "italic" },
      { type: "text", content: " text" },
    ]);
  });

  test("parses links", () => {
    const result = parseInlineContent("Visit [Google](https://google.com) now");
    expect(result).toEqual([
      { type: "text", content: "Visit " },
      {
        type: "link",
        content: "Google",
        metadata: { url: "https://google.com" },
      },
      { type: "text", content: " now" },
    ]);
  });

  test("parses multiple inline elements", () => {
    const result = parseInlineContent("**Bold** and *italic* and `code`");
    expect(result).toEqual([
      { type: "bold", content: "Bold" },
      { type: "text", content: " and " },
      { type: "italic", content: "italic" },
      { type: "text", content: " and " },
      { type: "inline_code", content: "code" },
    ]);
  });

  test("inline code takes precedence (no parsing inside)", () => {
    const result = parseInlineContent("Use `**not bold**` syntax");
    expect(result).toEqual([
      { type: "text", content: "Use " },
      { type: "inline_code", content: "**not bold**" },
      { type: "text", content: " syntax" },
    ]);
  });
});

describe("tokenize", () => {
  test("returns empty array for empty string", () => {
    const result = tokenize("");
    expect(result).toEqual([]);
  });

  test("returns empty array for null/undefined-like input", () => {
    // @ts-expect-error - testing edge case
    expect(tokenize(null)).toEqual([]);
    // @ts-expect-error - testing edge case
    expect(tokenize(undefined)).toEqual([]);
  });

  describe("headers", () => {
    test("parses h1 header", () => {
      const result = tokenize("# Hello World");
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("header");
      expect(result[0]?.content).toBe("Hello World");
      expect((result[0]?.metadata as HeaderMetadata)?.level).toBe(1);
    });

    test("parses h2 through h6 headers", () => {
      const markdown = `## H2
### H3
#### H4
##### H5
###### H6`;
      const result = tokenize(markdown);
      expect(result).toHaveLength(5);

      expect(result[0]?.type).toBe("header");
      expect((result[0]?.metadata as HeaderMetadata)?.level).toBe(2);
      expect(result[1]?.type).toBe("header");
      expect((result[1]?.metadata as HeaderMetadata)?.level).toBe(3);
      expect(result[2]?.type).toBe("header");
      expect((result[2]?.metadata as HeaderMetadata)?.level).toBe(4);
      expect(result[3]?.type).toBe("header");
      expect((result[3]?.metadata as HeaderMetadata)?.level).toBe(5);
      expect(result[4]?.type).toBe("header");
      expect((result[4]?.metadata as HeaderMetadata)?.level).toBe(6);
    });

    test("parses header with inline formatting", () => {
      const result = tokenize("# Hello **bold** world");
      expect(result).toHaveLength(1);
      expect(result[0]?.children).toEqual([
        { type: "text", content: "Hello " },
        { type: "bold", content: "bold" },
        { type: "text", content: " world" },
      ]);
    });
  });

  describe("code blocks", () => {
    test("parses code block without language", () => {
      const markdown = `\`\`\`
const x = 1;
\`\`\``;
      const result = tokenize(markdown);
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("code_block");
      expect(result[0]?.content).toBe("const x = 1;");
      expect(result[0]?.metadata).toBeUndefined();
    });

    test("parses code block with language", () => {
      const markdown = `\`\`\`javascript
const x = 1;
console.log(x);
\`\`\``;
      const result = tokenize(markdown);
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("code_block");
      expect(result[0]?.content).toBe("const x = 1;\nconsole.log(x);");
      expect(result[0]?.metadata).toEqual({ language: "javascript" });
    });

    test("handles unclosed code block", () => {
      const markdown = `\`\`\`python
print("hello")`;
      const result = tokenize(markdown);
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("code_block");
      expect(result[0]?.content).toBe('print("hello")');
    });
  });

  describe("lists", () => {
    test("parses unordered list with dash", () => {
      const markdown = `- Item 1
- Item 2
- Item 3`;
      const result = tokenize(markdown);
      expect(result).toHaveLength(3);

      for (const token of result) {
        expect(token.type).toBe("list_item");
        expect((token.metadata as ListItemMetadata)?.ordered).toBe(false);
        expect((token.metadata as ListItemMetadata)?.indent).toBe(0);
      }

      expect(result[0]?.content).toBe("Item 1");
      expect(result[1]?.content).toBe("Item 2");
      expect(result[2]?.content).toBe("Item 3");
    });

    test("parses unordered list with asterisk", () => {
      const markdown = `* Item A
* Item B`;
      const result = tokenize(markdown);
      expect(result).toHaveLength(2);
      expect(result[0]?.content).toBe("Item A");
      expect(result[1]?.content).toBe("Item B");
    });

    test("parses ordered list", () => {
      const markdown = `1. First
2. Second
3. Third`;
      const result = tokenize(markdown);
      expect(result).toHaveLength(3);

      for (let i = 0; i < 3; i++) {
        expect(result[i]?.type).toBe("list_item");
        expect((result[i]?.metadata as ListItemMetadata)?.ordered).toBe(true);
        expect((result[i]?.metadata as ListItemMetadata)?.number).toBe(i + 1);
      }
    });

    test("parses indented list items", () => {
      const markdown = `- Parent
  - Child
    - Grandchild`;
      const result = tokenize(markdown);
      expect(result).toHaveLength(3);
      expect((result[0]?.metadata as ListItemMetadata)?.indent).toBe(0);
      expect((result[1]?.metadata as ListItemMetadata)?.indent).toBe(2);
      expect((result[2]?.metadata as ListItemMetadata)?.indent).toBe(4);
    });

    test("parses list item with inline formatting", () => {
      const result = tokenize("- This is **bold** item");
      expect(result).toHaveLength(1);
      expect(result[0]?.children).toEqual([
        { type: "text", content: "This is " },
        { type: "bold", content: "bold" },
        { type: "text", content: " item" },
      ]);
    });
  });

  describe("blockquotes", () => {
    test("parses single-line blockquote", () => {
      const result = tokenize("> This is a quote");
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("blockquote");
      expect(result[0]?.content).toBe("This is a quote");
    });

    test("parses multi-line blockquote", () => {
      const markdown = `> Line 1
> Line 2
> Line 3`;
      const result = tokenize(markdown);
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("blockquote");
      expect(result[0]?.content).toBe("Line 1\nLine 2\nLine 3");
    });

    test("parses empty blockquote line", () => {
      const markdown = `> Quote
>
> More quote`;
      const result = tokenize(markdown);
      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe("Quote\n\nMore quote");
    });

    test("parses blockquote with inline formatting", () => {
      const result = tokenize("> **Important** quote");
      expect(result[0]?.children).toContainEqual({
        type: "bold",
        content: "Important",
      });
    });
  });

  describe("paragraphs", () => {
    test("parses simple paragraph", () => {
      const result = tokenize("This is a paragraph.");
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("paragraph");
      expect(result[0]?.content).toBe("This is a paragraph.");
    });

    test("combines consecutive lines into one paragraph", () => {
      const markdown = `Line 1
Line 2
Line 3`;
      const result = tokenize(markdown);
      expect(result).toHaveLength(1);
      expect(result[0]?.type).toBe("paragraph");
      expect(result[0]?.content).toBe("Line 1\nLine 2\nLine 3");
    });

    test("separates paragraphs by blank lines", () => {
      const markdown = `Paragraph 1

Paragraph 2`;
      const result = tokenize(markdown);
      expect(result).toHaveLength(2);
      expect(result[0]?.content).toBe("Paragraph 1");
      expect(result[1]?.content).toBe("Paragraph 2");
    });

    test("parses paragraph with inline formatting", () => {
      const result = tokenize("This has **bold** and *italic* text.");
      expect(result[0]?.children).toEqual([
        { type: "text", content: "This has " },
        { type: "bold", content: "bold" },
        { type: "text", content: " and " },
        { type: "italic", content: "italic" },
        { type: "text", content: " text." },
      ]);
    });
  });

  describe("mixed content", () => {
    test("parses document with multiple element types", () => {
      const markdown = `# Title

This is a paragraph with **bold** text.

- List item 1
- List item 2

\`\`\`javascript
const x = 1;
\`\`\`

> A quote

1. Ordered item`;

      const result = tokenize(markdown);

      const types = result.map((t) => t.type);
      expect(types).toContain("header");
      expect(types).toContain("paragraph");
      expect(types).toContain("list_item");
      expect(types).toContain("code_block");
      expect(types).toContain("blockquote");
    });

    test("preserves order of elements", () => {
      const markdown = `# Header
Paragraph
- List`;
      const result = tokenize(markdown);
      expect(result[0]?.type).toBe("header");
      expect(result[1]?.type).toBe("paragraph");
      expect(result[2]?.type).toBe("list_item");
    });
  });

  describe("edge cases", () => {
    test("handles text that looks like header without space", () => {
      // "#hello" is not a valid header, it's a paragraph
      const result = tokenize("#hello");
      expect(result[0]?.type).toBe("paragraph");
    });

    test("handles multiple blank lines", () => {
      const markdown = `Para 1


Para 2`;
      const result = tokenize(markdown);
      expect(result).toHaveLength(2);
    });

    test("handles trailing newlines", () => {
      const markdown = `Hello\n\n`;
      const result = tokenize(markdown);
      expect(result).toHaveLength(1);
      expect(result[0]?.content).toBe("Hello");
    });
  });
});
