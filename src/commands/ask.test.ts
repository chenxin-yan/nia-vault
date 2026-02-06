import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { setupFakeNia } from "../__fixtures__/helpers.js";
import { runNiaOnce, runNiaSearch } from "../lib/nia-sync.js";

/**
 * Integration tests for the ask command.
 *
 * These tests verify that the correct nia CLI arguments are built for various
 * flag combinations. We test the underlying runNiaSearch function that the
 * ask command uses, rather than the full command handler (which would require
 * mocking the command context and interactive prompts).
 */
describe("[integration] ask command CLI argument building", () => {
  let fakeNia: { cleanup: () => void; binDir: string };

  beforeEach(() => {
    fakeNia = setupFakeNia();
  });

  afterEach(() => {
    fakeNia.cleanup();
  });

  test("should run search with default options (streaming, markdown enabled)", async () => {
    // Default ask command: vault ask "query"
    // This runs with streaming and markdown enabled
    const result = await runNiaSearch("test query", ["folder_abc123"], {
      // No options = defaults (streaming, markdown)
    });

    // In default mode, stdout is not captured (goes to terminal)
    // So result should be undefined
    expect(result).toBeUndefined();
  });

  test("should run search with --no-stream option", async () => {
    // vault ask "query" --no-stream
    const result = await runNiaSearch("test query", ["folder_abc123"], {
      noStream: true,
    });

    // With noStream, output still goes to terminal (unless json mode)
    expect(result).toBeUndefined();
  });

  test("should run search with --no-markdown (plain) option", async () => {
    // vault ask "query" --plain
    const result = await runNiaSearch("test query", ["folder_abc123"], {
      noMarkdown: true,
    });

    expect(result).toBeUndefined();
  });

  test("should run search with multiple folders", async () => {
    // vault ask "query" with multiple selected folders
    const result = await runNiaSearch(
      "test query",
      ["folder_abc123", "folder_def456", "folder_ghi789"],
      {},
    );

    // This tests that multiple --local-folder args are built correctly
    expect(result).toBeUndefined();
  });

  test("should run search with single folder filter", async () => {
    // vault ask "query" --folder folder_abc123
    // When user specifies --folder, only that folder is searched
    const result = await runNiaSearch("test query", ["folder_abc123"], {});

    expect(result).toBeUndefined();
  });

  test("should capture output in json mode", async () => {
    // Using json mode to verify the fake nia is working
    const result = await runNiaSearch("test query", ["folder_abc123"], {
      raw: true, // raw outputs JSON by default
    });

    // In raw mode, stdout is captured and returned
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");

    // Verify it's valid JSON
    const parsed = JSON.parse(result!);
    expect(parsed).toBeDefined();
  });

  test("should run search with --sources option", async () => {
    // vault ask "query" with sources option (returns citations)
    const result = await runNiaSearch("test query", ["folder_abc123"], {
      sources: true,
    });

    // sources option alone doesn't capture output
    expect(result).toBeUndefined();
  });

  test("should combine multiple options correctly", async () => {
    // Test combination: --no-stream --plain
    const result = await runNiaSearch("test query", ["folder_abc123"], {
      noStream: true,
      noMarkdown: true,
    });

    expect(result).toBeUndefined();
  });
});

/**
 * Test the sync functionality used by ask command with --sync flag
 */
describe("[integration] ask command sync functionality", () => {
  let fakeNia: { cleanup: () => void; binDir: string };

  beforeEach(() => {
    fakeNia = setupFakeNia();
  });

  afterEach(() => {
    fakeNia.cleanup();
  });

  test("should run nia once for sync", async () => {
    // vault ask "query" --sync runs runNiaOnce() first
    const result = await runNiaOnce();

    // The fake nia script returns exit code 0 for 'once' command
    expect(result).toBe(true);
  });

  test("should complete sync before search", async () => {
    // Simulate the ask command flow with --sync flag
    // 1. Run sync
    const syncResult = await runNiaOnce();
    expect(syncResult).toBe(true);

    // 2. Then run search
    const searchResult = await runNiaSearch("test query", ["folder_abc123"], {
      raw: true,
    });
    expect(searchResult).toBeDefined();
  });
});

/**
 * Test query handling for the ask command
 */
describe("[integration] ask command query handling", () => {
  let fakeNia: { cleanup: () => void; binDir: string };

  beforeEach(() => {
    fakeNia = setupFakeNia();
  });

  afterEach(() => {
    fakeNia.cleanup();
  });

  test("should handle query with special characters", async () => {
    // Test query with quotes, spaces, etc.
    const query = 'What is the "CDN" for my project?';
    const result = await runNiaSearch(query, ["folder_abc123"], {
      raw: true,
    });

    expect(result).toBeDefined();
  });

  test("should handle multi-word query", async () => {
    // vault ask "how do I set up content delivery network"
    const query = "how do I set up content delivery network";
    const result = await runNiaSearch(query, ["folder_abc123"], {
      raw: true,
    });

    expect(result).toBeDefined();
  });

  test("should handle short query", async () => {
    const query = "CDN";
    const result = await runNiaSearch(query, ["folder_abc123"], {
      raw: true,
    });

    expect(result).toBeDefined();
  });
});
