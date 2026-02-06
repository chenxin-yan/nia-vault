import { describe, expect, test } from "bun:test";
import {
  deduplicateFiles,
  type FileEntry,
  filterByScore,
  mapSourcesToFiles,
  type NiaSearchSource,
} from "./find-utils.js";

// ============================================================================
// Test Data Factories
// ============================================================================

function createSource(
  overrides: Partial<NiaSearchSource> = {},
): NiaSearchSource {
  return {
    content: "Test content snippet",
    metadata: {
      file_path: "test-file.md",
      local_folder_id: "folder_123",
      local_folder_name: "Notes",
      score: 0.5,
      ...overrides.metadata,
    },
    ...overrides,
  };
}

function createFileEntry(overrides: Partial<FileEntry> = {}): FileEntry {
  return {
    absolutePath: "/home/user/notes/test-file.md",
    displayPath: "test-file.md",
    folderName: "Notes",
    snippet: "Test content snippet",
    ...overrides,
  };
}

// ============================================================================
// filterByScore Tests
// ============================================================================

describe("filterByScore", () => {
  test("keeps sources at or above threshold", () => {
    const sources = [
      createSource({
        metadata: { file_path: "high.md", score: 0.8, local_folder_id: "f1" },
      }),
      createSource({
        metadata: { file_path: "exact.md", score: 0.4, local_folder_id: "f2" },
      }),
      createSource({
        metadata: { file_path: "low.md", score: 0.3, local_folder_id: "f3" },
      }),
    ];

    const result = filterByScore(sources, 0.4);

    expect(result).toHaveLength(2);
    expect(result.map((s) => s.metadata.file_path)).toEqual([
      "high.md",
      "exact.md",
    ]);
  });

  test("removes all sources below threshold", () => {
    const sources = [
      createSource({
        metadata: { file_path: "low1.md", score: 0.2, local_folder_id: "f1" },
      }),
      createSource({
        metadata: { file_path: "low2.md", score: 0.35, local_folder_id: "f2" },
      }),
    ];

    const result = filterByScore(sources, 0.4);

    expect(result).toHaveLength(0);
  });

  test("returns empty array when input is empty", () => {
    const result = filterByScore([], 0.4);
    expect(result).toEqual([]);
  });

  test("score exactly at threshold is included", () => {
    const sources = [
      createSource({
        metadata: { file_path: "exact.md", score: 0.4, local_folder_id: "f1" },
      }),
    ];

    const result = filterByScore(sources, 0.4);

    expect(result).toHaveLength(1);
    expect(result[0]?.metadata.file_path).toBe("exact.md");
  });

  test("works with threshold of 0", () => {
    const sources = [
      createSource({
        metadata: { file_path: "any.md", score: 0.1, local_folder_id: "f1" },
      }),
    ];

    const result = filterByScore(sources, 0);

    expect(result).toHaveLength(1);
  });

  test("works with threshold of 1.0", () => {
    const sources = [
      createSource({
        metadata: { file_path: "high.md", score: 0.99, local_folder_id: "f1" },
      }),
      createSource({
        metadata: {
          file_path: "perfect.md",
          score: 1.0,
          local_folder_id: "f2",
        },
      }),
    ];

    const result = filterByScore(sources, 1.0);

    expect(result).toHaveLength(1);
    expect(result[0]?.metadata.file_path).toBe("perfect.md");
  });

  test("preserves source order", () => {
    const sources = [
      createSource({
        metadata: { file_path: "first.md", score: 0.9, local_folder_id: "f1" },
      }),
      createSource({
        metadata: { file_path: "second.md", score: 0.8, local_folder_id: "f2" },
      }),
      createSource({
        metadata: { file_path: "third.md", score: 0.7, local_folder_id: "f3" },
      }),
    ];

    const result = filterByScore(sources, 0.5);

    expect(result.map((s) => s.metadata.file_path)).toEqual([
      "first.md",
      "second.md",
      "third.md",
    ]);
  });
});

// ============================================================================
// mapSourcesToFiles Tests
// ============================================================================

describe("mapSourcesToFiles", () => {
  test("resolves folder ID to absolute path via join", () => {
    const sources = [
      createSource({
        content: "CDN content",
        metadata: {
          file_path: "networks/cdn-notes.md",
          local_folder_id: "folder_123",
          local_folder_name: "Notes",
          score: 0.85,
        },
      }),
    ];
    const folderPathMap = new Map([["folder_123", "/home/user/notes"]]);

    const result = mapSourcesToFiles(sources, folderPathMap);

    expect(result).toHaveLength(1);
    expect(result[0]?.absolutePath).toBe(
      "/home/user/notes/networks/cdn-notes.md",
    );
    expect(result[0]?.displayPath).toBe("networks/cdn-notes.md");
    expect(result[0]?.folderName).toBe("Notes");
    expect(result[0]?.snippet).toBe("CDN content");
  });

  test("excludes sources with missing folder ID", () => {
    const sources = [
      createSource({
        metadata: {
          file_path: "orphan.md",
          local_folder_id: "unknown_folder",
          score: 0.9,
        },
      }),
    ];
    const folderPathMap = new Map([["folder_123", "/home/user/notes"]]);

    const result = mapSourcesToFiles(sources, folderPathMap);

    expect(result).toHaveLength(0);
  });

  test("excludes sources with undefined folder ID", () => {
    const sources = [
      createSource({
        metadata: {
          file_path: "no-folder.md",
          local_folder_id: undefined,
          score: 0.9,
        },
      }),
    ];
    const folderPathMap = new Map([["folder_123", "/home/user/notes"]]);

    const result = mapSourcesToFiles(sources, folderPathMap);

    expect(result).toHaveLength(0);
  });

  test("returns empty array for empty sources", () => {
    const folderPathMap = new Map([["folder_123", "/home/user/notes"]]);

    const result = mapSourcesToFiles([], folderPathMap);

    expect(result).toEqual([]);
  });

  test("handles multiple folders correctly", () => {
    const sources = [
      createSource({
        content: "Notes content",
        metadata: {
          file_path: "file1.md",
          local_folder_id: "folder_notes",
          local_folder_name: "Notes",
          score: 0.8,
        },
      }),
      createSource({
        content: "Work content",
        metadata: {
          file_path: "file2.md",
          local_folder_id: "folder_work",
          local_folder_name: "Work",
          score: 0.7,
        },
      }),
    ];
    const folderPathMap = new Map([
      ["folder_notes", "/home/user/notes"],
      ["folder_work", "/home/user/work"],
    ]);

    const result = mapSourcesToFiles(sources, folderPathMap);

    expect(result).toHaveLength(2);
    expect(result[0]?.absolutePath).toBe("/home/user/notes/file1.md");
    expect(result[1]?.absolutePath).toBe("/home/user/work/file2.md");
  });

  test("preserves optional folderName when present", () => {
    const sources = [
      createSource({
        metadata: {
          file_path: "test.md",
          local_folder_id: "f1",
          local_folder_name: "My Notes",
          score: 0.5,
        },
      }),
    ];
    const folderPathMap = new Map([["f1", "/path"]]);

    const result = mapSourcesToFiles(sources, folderPathMap);

    expect(result[0]?.folderName).toBe("My Notes");
  });

  test("handles undefined folderName", () => {
    const sources = [
      createSource({
        metadata: {
          file_path: "test.md",
          local_folder_id: "f1",
          local_folder_name: undefined,
          score: 0.5,
        },
      }),
    ];
    const folderPathMap = new Map([["f1", "/path"]]);

    const result = mapSourcesToFiles(sources, folderPathMap);

    expect(result[0]?.folderName).toBeUndefined();
  });

  test("handles empty folder path map", () => {
    const sources = [
      createSource({
        metadata: {
          file_path: "test.md",
          local_folder_id: "f1",
          score: 0.5,
        },
      }),
    ];
    const folderPathMap = new Map<string, string>();

    const result = mapSourcesToFiles(sources, folderPathMap);

    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// deduplicateFiles Tests
// ============================================================================

describe("deduplicateFiles", () => {
  test("deduplicates by display path, keeping first occurrence", () => {
    const files = [
      createFileEntry({
        absolutePath: "/path/file1.md",
        displayPath: "file1.md",
        snippet: "First occurrence",
      }),
      createFileEntry({
        absolutePath: "/path/file2.md",
        displayPath: "file2.md",
        snippet: "Different file",
      }),
      createFileEntry({
        absolutePath: "/path/file1.md",
        displayPath: "file1.md",
        snippet: "Second occurrence (should be removed)",
      }),
    ];

    const result = deduplicateFiles(files, 10);

    expect(result).toHaveLength(2);
    expect(result[0]?.snippet).toBe("First occurrence");
    expect(result[1]?.snippet).toBe("Different file");
  });

  test("applies maxResults limit correctly", () => {
    const files = [
      createFileEntry({ displayPath: "file1.md" }),
      createFileEntry({ displayPath: "file2.md" }),
      createFileEntry({ displayPath: "file3.md" }),
      createFileEntry({ displayPath: "file4.md" }),
      createFileEntry({ displayPath: "file5.md" }),
    ];

    const result = deduplicateFiles(files, 3);

    expect(result).toHaveLength(3);
    expect(result.map((f) => f.displayPath)).toEqual([
      "file1.md",
      "file2.md",
      "file3.md",
    ]);
  });

  test("returns all files when under maxResults", () => {
    const files = [
      createFileEntry({ displayPath: "file1.md" }),
      createFileEntry({ displayPath: "file2.md" }),
    ];

    const result = deduplicateFiles(files, 10);

    expect(result).toHaveLength(2);
  });

  test("returns empty array for empty input", () => {
    const result = deduplicateFiles([], 5);
    expect(result).toEqual([]);
  });

  test("handles maxResults of 0", () => {
    const files = [createFileEntry({ displayPath: "file1.md" })];

    const result = deduplicateFiles(files, 0);

    expect(result).toHaveLength(0);
  });

  test("returns single file when all have same displayPath", () => {
    const files = [
      createFileEntry({ displayPath: "same.md", snippet: "Chunk 1" }),
      createFileEntry({ displayPath: "same.md", snippet: "Chunk 2" }),
      createFileEntry({ displayPath: "same.md", snippet: "Chunk 3" }),
    ];

    const result = deduplicateFiles(files, 10);

    expect(result).toHaveLength(1);
    expect(result[0]?.snippet).toBe("Chunk 1");
  });

  test("preserves file order after deduplication", () => {
    const files = [
      createFileEntry({ displayPath: "first.md" }),
      createFileEntry({ displayPath: "second.md" }),
      createFileEntry({ displayPath: "first.md" }), // duplicate
      createFileEntry({ displayPath: "third.md" }),
    ];

    const result = deduplicateFiles(files, 10);

    expect(result.map((f) => f.displayPath)).toEqual([
      "first.md",
      "second.md",
      "third.md",
    ]);
  });

  test("maxResults applies after deduplication", () => {
    const files = [
      createFileEntry({ displayPath: "file1.md" }),
      createFileEntry({ displayPath: "file1.md" }), // duplicate
      createFileEntry({ displayPath: "file2.md" }),
      createFileEntry({ displayPath: "file2.md" }), // duplicate
      createFileEntry({ displayPath: "file3.md" }),
    ];

    const result = deduplicateFiles(files, 2);

    expect(result).toHaveLength(2);
    expect(result.map((f) => f.displayPath)).toEqual(["file1.md", "file2.md"]);
  });

  test("handles files with different absolutePath but same displayPath", () => {
    const files = [
      createFileEntry({
        absolutePath: "/folder1/shared.md",
        displayPath: "shared.md",
        folderName: "Folder 1",
      }),
      createFileEntry({
        absolutePath: "/folder2/shared.md",
        displayPath: "shared.md",
        folderName: "Folder 2",
      }),
    ];

    const result = deduplicateFiles(files, 10);

    // First occurrence wins
    expect(result).toHaveLength(1);
    expect(result[0]?.absolutePath).toBe("/folder1/shared.md");
    expect(result[0]?.folderName).toBe("Folder 1");
  });
});
