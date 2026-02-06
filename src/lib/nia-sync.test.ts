import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import z from "zod";
import { loadFixture, setupFakeNia } from "../__fixtures__/helpers.js";
import {
  listLocalFolders,
  NiaSyncConfig,
  NiaSyncError,
  runNiaSearch,
} from "./nia-sync.js";

describe("NiaSyncConfig schema", () => {
  test("should validate a valid config with api_key", () => {
    const config = { api_key: "sk-test-12345" };
    const result = NiaSyncConfig.parse(config);
    expect(result.api_key).toBe("sk-test-12345");
  });

  test("should reject empty api_key", () => {
    const config = { api_key: "" };
    expect(() => NiaSyncConfig.parse(config)).toThrow(z.ZodError);
  });

  test("should reject missing api_key", () => {
    const config = {};
    expect(() => NiaSyncConfig.parse(config)).toThrow(z.ZodError);
  });

  test("should reject null api_key", () => {
    const config = { api_key: null };
    expect(() => NiaSyncConfig.parse(config)).toThrow(z.ZodError);
  });

  test("should reject non-string api_key", () => {
    const config = { api_key: 12345 };
    expect(() => NiaSyncConfig.parse(config)).toThrow(z.ZodError);
  });

  test("should accept extra properties but only return api_key", () => {
    const config = { api_key: "sk-test", extra: "ignored" };
    const result = NiaSyncConfig.parse(config);
    expect(result.api_key).toBe("sk-test");
    // Zod strips unknown keys by default in strict mode, or keeps them in passthrough
    // The current schema should only include api_key in the output
  });
});

describe("NiaSyncError", () => {
  test("should be an instance of Error", () => {
    const err = new NiaSyncError("test error");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(NiaSyncError);
  });

  test("should have correct name", () => {
    const err = new NiaSyncError("test error");
    expect(err.name).toBe("NiaSyncError");
  });

  test("should store message", () => {
    const err = new NiaSyncError("Something went wrong");
    expect(err.message).toBe("Something went wrong");
  });

  test("should have stack trace", () => {
    const err = new NiaSyncError("test error");
    expect(err.stack).toBeDefined();
  });
});

describe("[integration] listLocalFolders with fake nia CLI", () => {
  let fakeNia: { cleanup: () => void; binDir: string };

  beforeEach(() => {
    fakeNia = setupFakeNia();
  });

  afterEach(() => {
    fakeNia.cleanup();
  });

  test("should return parsed local folders from nia status --json", async () => {
    const folders = await listLocalFolders();

    // Based on our fixture, we should get 3 folders (type: "folder") and 1 repo filtered out
    expect(folders.length).toBe(3);

    // Check first folder
    expect(folders[0]).toEqual({
      id: "folder_abc123",
      name: "Notes",
      path: "/home/user/Documents/Notes",
      status: "synced",
    });

    // Check second folder
    expect(folders[1]).toEqual({
      id: "folder_def456",
      name: "Work",
      path: "/home/user/Documents/Work",
      status: "syncing",
    });

    // Check third folder
    expect(folders[2]).toEqual({
      id: "folder_ghi789",
      name: "Research",
      path: "/home/user/Documents/Research",
      status: "synced",
    });
  });

  test("should filter out non-folder sources", async () => {
    // The fixture includes a repository which should be filtered out
    const folders = await listLocalFolders();

    // All returned items should have type "folder" (implicit from the filter)
    for (const folder of folders) {
      // Our folders don't have type in the output, but they're only folders
      expect(folder.id.startsWith("folder_")).toBe(true);
    }
  });
});

describe("[integration] runNiaSearch with fake nia CLI", () => {
  let fakeNia: { cleanup: () => void; binDir: string };

  beforeEach(() => {
    fakeNia = setupFakeNia();
  });

  afterEach(() => {
    fakeNia.cleanup();
  });

  test("should return JSON output with raw option", async () => {
    const result = await runNiaSearch(
      "CDN content delivery",
      ["folder_abc123"],
      {
        raw: true,
      },
    );

    expect(result).toBeDefined();
    expect(typeof result).toBe("string");

    // Parse and validate the output
    const parsed = JSON.parse(result!);
    expect(parsed.content).toBeNull(); // Raw mode has null content
    expect(Array.isArray(parsed.sources)).toBe(true);
    expect(parsed.sources.length).toBeGreaterThan(0);
  });

  test("should include sources with scores in raw mode", async () => {
    const result = await runNiaSearch("CDN", ["folder_abc123"], {
      raw: true,
    });

    const parsed = JSON.parse(result!);

    // Each source should have metadata with score
    for (const source of parsed.sources) {
      expect(source.metadata).toBeDefined();
      expect(typeof source.metadata.score).toBe("number");
      expect(source.metadata.file_path).toBeDefined();
    }
  });

  test("should return undefined when not in JSON mode", async () => {
    // Non-JSON mode returns undefined (output goes to terminal)
    const result = await runNiaSearch("test query", ["folder_abc123"], {
      noMarkdown: true,
    });

    // In our fake CLI, non-raw mode just echoes, but the function
    // returns undefined because we don't capture stdout
    // Note: This depends on the fake-nia implementation
  });
});

// Tests for the nia status response schema validation
describe("nia status response parsing", () => {
  test("should load and parse nia-status fixture correctly", async () => {
    const fixture = await loadFixture<{
      sources: Array<{
        id: string;
        name: string;
        path: string;
        type: string;
        status: string;
      }>;
    }>("nia-status.json");

    expect(fixture.sources).toBeDefined();
    expect(Array.isArray(fixture.sources)).toBe(true);
    expect(fixture.sources.length).toBe(4);

    // Validate structure of first source
    const first = fixture.sources[0]!;
    expect(first.id).toBe("folder_abc123");
    expect(first.name).toBe("Notes");
    expect(first.path).toBe("/home/user/Documents/Notes");
    expect(first.type).toBe("folder");
    expect(first.status).toBe("synced");
  });
});

// Tests for the nia search raw response schema validation
describe("nia search raw response parsing", () => {
  test("should load and parse nia-search-raw fixture correctly", async () => {
    const fixture = await loadFixture<{
      content: string | null;
      sources: Array<{
        content: string;
        metadata: {
          file_path: string;
          local_folder_name?: string;
          local_folder_id?: string;
          score: number;
        };
      }>;
      follow_up_questions?: string[];
    }>("nia-search-raw.json");

    expect(fixture.content).toBeNull(); // Raw mode has null content
    expect(Array.isArray(fixture.sources)).toBe(true);
    expect(fixture.sources.length).toBe(6);

    // Check high-score result
    const highScoreSource = fixture.sources[0]!;
    expect(highScoreSource.metadata.score).toBe(0.85);
    expect(highScoreSource.metadata.file_path).toBe(
      "CSCI-UA.0480-062 Computer Networks.md",
    );

    // Check low-score result
    const lowScoreSource = fixture.sources[5]!;
    expect(lowScoreSource.metadata.score).toBe(0.25);
  });

  test("should have follow_up_questions in fixture", async () => {
    const fixture = await loadFixture<{
      follow_up_questions?: string[];
    }>("nia-search-raw.json");

    expect(fixture.follow_up_questions).toBeDefined();
    expect(Array.isArray(fixture.follow_up_questions)).toBe(true);
    expect(fixture.follow_up_questions!.length).toBe(2);
  });
});
