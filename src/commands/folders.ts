import { checkbox } from "@inquirer/prompts";
import {
  configExists,
  getSelectedFolders,
  saveSelectedFolders,
} from "../lib/config.js";
import { listLocalFolders, NiaApiError } from "../lib/nia.js";
import { getApiKey, isNiaSyncConfigured } from "../lib/nia-sync.js";
import { formatFolderList } from "../lib/output.js";

/**
 * Folders command
 * Interactive toggle to manage folders in search scope
 * Shows all folders with currently-selected ones pre-checked
 */
export async function foldersCommand(): Promise<void> {
  // Check for nia-sync configuration
  const niaSyncConfigured = await isNiaSyncConfigured();
  if (!niaSyncConfigured) {
    console.log(`✗ nia-sync not configured. Run 'nia login' first.\n`);
    process.exit(1);
  }

  // Check for vault configuration
  const hasConfig = await configExists();
  if (!hasConfig) {
    console.log("✗ No configuration found. Run 'vault init' to get started.\n");
    process.exit(1);
  }

  // Get API key
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.log("✗ Could not read API key from nia-sync config.\n");
    process.exit(1);
  }

  // Fetch all synced folders from Nia
  let folders;
  try {
    folders = await listLocalFolders(apiKey);
  } catch (error) {
    if (error instanceof NiaApiError) {
      console.log(`✗ ${error.message}\n`);
    } else {
      console.log(
        "✗ Could not connect to Nia API. Check your internet connection.\n",
      );
    }
    process.exit(1);
  }

  if (folders.length === 0) {
    console.log(
      "No synced folders found. Run 'nia add ~/path' to add folders.\n",
    );
    return;
  }

  // Get currently selected folders
  const selectedIds = await getSelectedFolders();

  // Display current status
  console.log(formatFolderList(folders, selectedIds));
  console.log("");

  // Present checkbox with pre-selected folders
  const newSelectedIds = await checkbox<string>({
    message: "Toggle folders in search scope (space to toggle, enter to save):",
    choices: folders.map((folder) => ({
      name: `${folder.name.padEnd(20)} ${folder.path}`,
      value: folder.id,
      checked: selectedIds.includes(folder.id),
    })),
  });

  // Calculate changes
  const added = newSelectedIds.filter((id) => !selectedIds.includes(id));
  const removed = selectedIds.filter((id) => !newSelectedIds.includes(id));

  // Check if anything changed
  if (added.length === 0 && removed.length === 0) {
    console.log("\nNo changes made.\n");
    return;
  }

  // Save updated selection
  await saveSelectedFolders(newSelectedIds);

  // Show summary
  const changes: string[] = [];
  if (added.length > 0) {
    changes.push(`added ${added.length}`);
  }
  if (removed.length > 0) {
    changes.push(`removed ${removed.length}`);
  }

  console.log(
    `\n✓ Updated search scope: ${changes.join(", ")} folder${added.length + removed.length === 1 ? "" : "s"}.\n`,
  );
}
