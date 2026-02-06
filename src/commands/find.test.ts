import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import z from "zod";
import { setupFakeNia } from "../__fixtures__/helpers.js";
import {
  deduplicateFiles,
  type FileEntry,
  filterByScore,
  mapSourcesToFiles,
  type NiaSearchSource,
} from "../lib/find-utils.js";
import { listLocalFolders, runNiaSearch } from "../lib/nia-sync.js";
import { SCORE_THRESHOLD } from "./find.js";

// Schema matching what find.ts uses for parsing
const NiaSearchSourceMetadataSchema = z.object({
  file_path: z.string(),
  local_folder_name: z.string().optional(),
  local_folder_id: z.string().optional(),
  chunk_index: z.number().optional(),
  start_byte: z.string().optional(),
  source_type: z.string().optional(),
  score: z.number(),
});

const NiaSearchSourceSchema = z.object({
  content: z.string(),
  metadata: NiaSearchSourceMetadataSchema,
});

const NiaSearchRawResponseSchema = z.object({
  content: z.string().nullable(),
  sources: z.array(NiaSearchSourceSchema).optional(),
  follow_up_questions: z.array(z.string()).optional(),
});

describe("[integration] find command flow with fake nia CLI", () => {
  let fakeNia: { cleanup: () => void; binDir: string };

  beforeEach(() => {
    fakeNia = setupFakeNia();
  });

  afterEach(() => {
    fakeNia.cleanup();
  });

  test("should call nia search with --raw flag and parse response correctly", async () => {
    // Simulate what find.ts does internally
    const query = "CDN content delivery network";
    const selectedFolders = ["folder_abc123"];

    // Run the search (this uses the fake nia CLI)
    const jsonOutput = await runNiaSearch(query, selectedFolders, {
      raw: true,
    });

    expect(jsonOutput).toBeDefined();
    expect(typeof jsonOutput).toBe("string");

    // Parse and validate like find.ts does
    const parsed = JSON.parse(jsonOutput!);
    const result = NiaSearchRawResponseSchema.parse(parsed);

    // Verify the structure matches what find.ts expects
    expect(result.content).toBeNull(); // Raw mode has null content
    expect(Array.isArray(result.sources)).toBe(true);
  });

  test("should apply score threshold to filter sources", async () => {
    const jsonOutput = await runNiaSearch("test query", ["folder_abc123"], {
      raw: true,
    });

    const parsed = JSON.parse(jsonOutput!);
    const result = NiaSearchRawResponseSchema.parse(parsed);
    const rawSources = (result.sources || []) as NiaSearchSource[];

    // Apply score filtering like find.ts does
    const relevantSources = filterByScore(rawSources, SCORE_THRESHOLD);

    // Based on fixture: scores are 0.85, 0.72, 0.65, 0.45, 0.33, 0.25
    // With SCORE_THRESHOLD = 0.4, only first 4 should pass
    expect(relevantSources.length).toBe(4);

    // All filtered sources should have score >= threshold
    for (const source of relevantSources) {
      expect(source.metadata.score).toBeGreaterThanOrEqual(SCORE_THRESHOLD);
    }
  });

  test("should correctly map sources to file entries with resolved paths", async () => {
    // Get folder path map from fake nia status
    const folders = await listLocalFolders();
    const folderPathMap = new Map(folders.map((f) => [f.id, f.path]));

    // Get search results
    const jsonOutput = await runNiaSearch("test", ["folder_abc123"], {
      raw: true,
    });
    const parsed = JSON.parse(jsonOutput!);
    const result = NiaSearchRawResponseSchema.parse(parsed);
    const rawSources = (result.sources || []) as NiaSearchSource[];

    // Filter and map like find.ts does
    const relevantSources = filterByScore(rawSources, SCORE_THRESHOLD);
    const mappedFiles = mapSourcesToFiles(relevantSources, folderPathMap);

    // Verify absolute paths are correctly constructed
    expect(mappedFiles.length).toBeGreaterThan(0);

    // First file should be from folder_abc123 (Notes folder)
    const firstFile = mappedFiles[0]!;
    expect(firstFile.absolutePath).toContain("/home/user/Documents/Notes/");
    expect(firstFile.displayPath).toBe("CSCI-UA.0480-062 Computer Networks.md");
    expect(firstFile.folderName).toBe("Notes");
    expect(firstFile.snippet).toBeDefined();
  });

  test("should deduplicate files by display path", async () => {
    // Get folder path map
    const folders = await listLocalFolders();
    const folderPathMap = new Map(folders.map((f) => [f.id, f.path]));

    // Get search results
    const jsonOutput = await runNiaSearch("test", ["folder_abc123"], {
      raw: true,
    });
    const parsed = JSON.parse(jsonOutput!);
    const result = NiaSearchRawResponseSchema.parse(parsed);
    const rawSources = (result.sources || []) as NiaSearchSource[];

    // Filter and map
    const relevantSources = filterByScore(rawSources, SCORE_THRESHOLD);
    const mappedFiles = mapSourcesToFiles(relevantSources, folderPathMap);

    // Deduplicate
    const MAX_RESULTS = 5;
    const fileEntries = deduplicateFiles(mappedFiles, MAX_RESULTS);

    // CSCI-UA.0480-062 Computer Networks.md appears twice in fixture (chunks 3 and 7)
    // Both have score > 0.4, so both pass filter
    // But they should be deduplicated to appear only once
    const computerNetworksEntries = fileEntries.filter(
      (f) => f.displayPath === "CSCI-UA.0480-062 Computer Networks.md",
    );
    expect(computerNetworksEntries.length).toBe(1);

    // Total unique files after dedup should be <= MAX_RESULTS
    expect(fileEntries.length).toBeLessThanOrEqual(MAX_RESULTS);
  });

  test("should limit results to MAX_RESULTS", async () => {
    const folders = await listLocalFolders();
    const folderPathMap = new Map(folders.map((f) => [f.id, f.path]));

    const jsonOutput = await runNiaSearch("test", ["folder_abc123"], {
      raw: true,
    });
    const parsed = JSON.parse(jsonOutput!);
    const result = NiaSearchRawResponseSchema.parse(parsed);
    const rawSources = (result.sources || []) as NiaSearchSource[];

    const relevantSources = filterByScore(rawSources, SCORE_THRESHOLD);
    const mappedFiles = mapSourcesToFiles(relevantSources, folderPathMap);

    // Test with a small MAX_RESULTS
    const smallLimit = 2;
    const limitedFiles = deduplicateFiles(mappedFiles, smallLimit);

    expect(limitedFiles.length).toBeLessThanOrEqual(smallLimit);
  });

  test("should preserve relevancy order after processing", async () => {
    const folders = await listLocalFolders();
    const folderPathMap = new Map(folders.map((f) => [f.id, f.path]));

    const jsonOutput = await runNiaSearch("test", ["folder_abc123"], {
      raw: true,
    });
    const parsed = JSON.parse(jsonOutput!);
    const result = NiaSearchRawResponseSchema.parse(parsed);
    const rawSources = (result.sources || []) as NiaSearchSource[];

    // The fixture has sources ordered by score descending: 0.85, 0.72, 0.65, 0.45, 0.33, 0.25
    // After filtering (>= 0.4): 0.85, 0.72, 0.65, 0.45
    const relevantSources = filterByScore(rawSources, SCORE_THRESHOLD);

    // Verify order preserved after filter
    for (let i = 1; i < relevantSources.length; i++) {
      expect(relevantSources[i - 1]!.metadata.score).toBeGreaterThanOrEqual(
        relevantSources[i]!.metadata.score,
      );
    }

    // Map and dedupe
    const mappedFiles = mapSourcesToFiles(relevantSources, folderPathMap);
    const fileEntries = deduplicateFiles(mappedFiles, 10);

    // First entry should be the highest relevance (Computer Networks with score 0.85)
    expect(fileEntries[0]!.displayPath).toBe(
      "CSCI-UA.0480-062 Computer Networks.md",
    );
  });

  test("should create correct choices for file picker", async () => {
    const folders = await listLocalFolders();
    const folderPathMap = new Map(folders.map((f) => [f.id, f.path]));

    const jsonOutput = await runNiaSearch("test", ["folder_abc123"], {
      raw: true,
    });
    const parsed = JSON.parse(jsonOutput!);
    const result = NiaSearchRawResponseSchema.parse(parsed);
    const rawSources = (result.sources || []) as NiaSearchSource[];

    const relevantSources = filterByScore(rawSources, SCORE_THRESHOLD);
    const mappedFiles = mapSourcesToFiles(relevantSources, folderPathMap);
    const fileEntries = deduplicateFiles(mappedFiles, 5);

    // Create choices like find.ts does (before showing interactive prompt)
    const choices = fileEntries.map((file: FileEntry) => ({
      name: file.displayPath,
      value: file.absolutePath,
      description: file.snippet?.substring(0, 80),
    }));

    // Verify choice structure
    expect(choices.length).toBeGreaterThan(0);

    const firstChoice = choices[0]!;
    expect(firstChoice.name).toBeDefined();
    expect(firstChoice.value).toBeDefined();
    expect(firstChoice.value).toContain("/home/user/Documents/"); // Absolute path
  });

  test("should handle empty results gracefully", async () => {
    // Using a threshold that filters out everything
    const highThreshold = 0.99;

    const jsonOutput = await runNiaSearch("test", ["folder_abc123"], {
      raw: true,
    });
    const parsed = JSON.parse(jsonOutput!);
    const result = NiaSearchRawResponseSchema.parse(parsed);
    const rawSources = (result.sources || []) as NiaSearchSource[];

    // All sources have score < 0.99
    const relevantSources = filterByScore(rawSources, highThreshold);
    expect(relevantSources.length).toBe(0);

    // Empty sources should produce empty file list
    const folders = await listLocalFolders();
    const folderPathMap = new Map(folders.map((f) => [f.id, f.path]));
    const mappedFiles = mapSourcesToFiles(relevantSources, folderPathMap);
    expect(mappedFiles.length).toBe(0);

    const fileEntries = deduplicateFiles(mappedFiles, 5);
    expect(fileEntries.length).toBe(0);
  });

  test("should handle sources with missing folder IDs", async () => {
    // Create a folder map that doesn't include all folder IDs
    const partialFolderMap = new Map<string, string>();
    partialFolderMap.set("folder_abc123", "/home/user/Documents/Notes");
    // Intentionally omit folder_def456

    const jsonOutput = await runNiaSearch("test", ["folder_abc123"], {
      raw: true,
    });
    const parsed = JSON.parse(jsonOutput!);
    const result = NiaSearchRawResponseSchema.parse(parsed);
    const rawSources = (result.sources || []) as NiaSearchSource[];

    // Filter and map - sources with folder_def456 should be excluded
    const relevantSources = filterByScore(rawSources, SCORE_THRESHOLD);
    const mappedFiles = mapSourcesToFiles(relevantSources, partialFolderMap);

    // Only files from folder_abc123 should be included
    for (const file of mappedFiles) {
      expect(file.absolutePath).toContain("/home/user/Documents/Notes/");
    }

    // Q3 Goals.md (from folder_def456) should not be included
    const q3Goals = mappedFiles.find((f) => f.displayPath === "Q3 Goals.md");
    expect(q3Goals).toBeUndefined();
  });
});
