import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { setupFakeNia } from "../__fixtures__/helpers.js";
import { type LocalFolder, listLocalFolders } from "../lib/nia-sync.js";

/**
 * Integration tests for the init command.
 *
 * These tests verify the folder detection flow that the init command uses.
 * We test the underlying listLocalFolders function rather than the full
 * command handler (which would require mocking interactive prompts).
 *
 * The init command flow:
 * 1. Check for nia-sync config (handled by withContext)
 * 2. Fetch folders via listLocalFolders()
 * 3. Present interactive checkbox prompt (not tested - requires prompt mocking)
 * 4. Save selected folder IDs to vault config
 */
describe("[integration] init command folder detection", () => {
  let fakeNia: { cleanup: () => void; binDir: string };

  beforeEach(() => {
    fakeNia = setupFakeNia();
  });

  afterEach(() => {
    fakeNia.cleanup();
  });

  test("should detect folders from nia status --json", async () => {
    const folders = await listLocalFolders();

    // Based on fixture, we should get 3 folders
    expect(folders.length).toBe(3);
  });

  test("should return correct folder structure", async () => {
    const folders = await listLocalFolders();

    // Each folder should have the expected properties
    for (const folder of folders) {
      expect(folder.id).toBeDefined();
      expect(typeof folder.id).toBe("string");

      expect(folder.name).toBeDefined();
      expect(typeof folder.name).toBe("string");

      expect(folder.path).toBeDefined();
      expect(typeof folder.path).toBe("string");

      expect(folder.status).toBeDefined();
      expect(typeof folder.status).toBe("string");
    }
  });

  test("should return folders with correct IDs for selection", async () => {
    const folders = await listLocalFolders();

    // Verify the folder IDs from fixture are present
    const folderIds = folders.map((f) => f.id);
    expect(folderIds).toContain("folder_abc123");
    expect(folderIds).toContain("folder_def456");
    expect(folderIds).toContain("folder_ghi789");
  });

  test("should return folders with correct paths", async () => {
    const folders = await listLocalFolders();

    // Map for easy lookup
    const folderMap = new Map(folders.map((f) => [f.id, f]));

    // Verify paths from fixture
    expect(folderMap.get("folder_abc123")?.path).toBe(
      "/home/user/Documents/Notes",
    );
    expect(folderMap.get("folder_def456")?.path).toBe(
      "/home/user/Documents/Work",
    );
    expect(folderMap.get("folder_ghi789")?.path).toBe(
      "/home/user/Documents/Research",
    );
  });

  test("should return folders with correct names for display", async () => {
    const folders = await listLocalFolders();

    // Map for easy lookup
    const folderMap = new Map(folders.map((f) => [f.id, f]));

    // Verify names from fixture
    expect(folderMap.get("folder_abc123")?.name).toBe("Notes");
    expect(folderMap.get("folder_def456")?.name).toBe("Work");
    expect(folderMap.get("folder_ghi789")?.name).toBe("Research");
  });

  test("should filter out non-folder sources (repositories)", async () => {
    const folders = await listLocalFolders();

    // The fixture includes a repository (repo_xyz999) which should be filtered out
    const folderIds = folders.map((f) => f.id);
    expect(folderIds).not.toContain("repo_xyz999");
  });

  test("should return sync status for each folder", async () => {
    const folders = await listLocalFolders();

    const folderMap = new Map(folders.map((f) => [f.id, f]));

    // Check statuses from fixture
    expect(folderMap.get("folder_abc123")?.status).toBe("synced");
    expect(folderMap.get("folder_def456")?.status).toBe("syncing");
    expect(folderMap.get("folder_ghi789")?.status).toBe("synced");
  });
});

/**
 * Test the folder display format for init command prompts
 */
describe("[integration] init command folder display formatting", () => {
  let fakeNia: { cleanup: () => void; binDir: string };

  beforeEach(() => {
    fakeNia = setupFakeNia();
  });

  afterEach(() => {
    fakeNia.cleanup();
  });

  test("should format folders correctly for checkbox prompt", async () => {
    const folders = await listLocalFolders();

    // Create choices like init.ts does for the checkbox prompt
    const choices = folders.map((folder: LocalFolder) => ({
      name: `${folder.name.padEnd(20)} ${folder.path}`,
      value: folder.id,
      checked: true, // init defaults to all folders selected
    }));

    expect(choices.length).toBe(3);

    // Verify first choice format
    const firstChoice = choices[0]!;
    expect(firstChoice.name).toContain("Notes");
    expect(firstChoice.name).toContain("/home/user/Documents/Notes");
    expect(firstChoice.value).toBe("folder_abc123");
    expect(firstChoice.checked).toBe(true);
  });

  test("should have unique folder IDs for selection values", async () => {
    const folders = await listLocalFolders();

    const ids = folders.map((f) => f.id);
    const uniqueIds = new Set(ids);

    // All IDs should be unique
    expect(uniqueIds.size).toBe(ids.length);
  });

  test("should order folders consistently", async () => {
    // Call multiple times and verify same order
    const folders1 = await listLocalFolders();
    const folders2 = await listLocalFolders();

    expect(folders1.length).toBe(folders2.length);

    for (let i = 0; i < folders1.length; i++) {
      expect(folders1[i]!.id).toBe(folders2[i]!.id);
    }
  });
});

/**
 * Test init command edge cases
 */
describe("[integration] init command edge cases", () => {
  let fakeNia: { cleanup: () => void; binDir: string };

  beforeEach(() => {
    fakeNia = setupFakeNia();
  });

  afterEach(() => {
    fakeNia.cleanup();
  });

  test("should handle folder with syncing status", async () => {
    const folders = await listLocalFolders();

    // folder_def456 has status "syncing" in fixture
    const syncingFolder = folders.find((f) => f.id === "folder_def456");
    expect(syncingFolder).toBeDefined();
    expect(syncingFolder?.status).toBe("syncing");

    // The folder should still be selectable even if syncing
    // (init doesn't filter by status)
  });

  test("should return folders even when some are syncing", async () => {
    const folders = await listLocalFolders();

    // Should include both synced and syncing folders
    const statuses = new Set(folders.map((f) => f.status));
    expect(statuses.has("synced")).toBe(true);
    expect(statuses.has("syncing")).toBe(true);
  });

  test("should create valid config data from selected folders", async () => {
    const folders = await listLocalFolders();

    // Simulate user selecting first two folders
    const selectedFolderIds = [folders[0]!.id, folders[1]!.id];

    // This is what would be saved to config
    const configData = {
      selectedFolders: selectedFolderIds,
    };

    expect(configData.selectedFolders.length).toBe(2);
    expect(configData.selectedFolders).toContain("folder_abc123");
    expect(configData.selectedFolders).toContain("folder_def456");
  });

  test("should handle selecting all folders", async () => {
    const folders = await listLocalFolders();

    // Default: all folders selected
    const allFolderIds = folders.map((f) => f.id);

    const configData = {
      selectedFolders: allFolderIds,
    };

    expect(configData.selectedFolders.length).toBe(3);
  });
});
