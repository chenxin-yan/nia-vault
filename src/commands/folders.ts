import { checkbox } from "@inquirer/prompts";
import { withContext } from "../lib/command-context.js";
import { updateVaultConfig } from "../lib/config.js";
import { type LocalFolder, listLocalFolders } from "../lib/nia-sync.js";
import { error, success } from "../lib/output.js";

/**
 * Folders command
 * Interactive toggle to manage folders in search scope
 * Shows all folders with currently-selected ones pre-checked
 */
export const foldersCommand = withContext(
  { requiresNiaSync: true, requiresVaultConfig: true },
  async (ctx): Promise<void> => {
    // Fetch all synced folders from nia-sync CLI
    let folders: LocalFolder[];
    try {
      folders = await listLocalFolders();
    } catch (err) {
      console.log(error((err as Error).message));
      process.exit(1);
    }

    if (folders.length === 0) {
      console.log(
        "No synced folders found. Run 'nia add ~/path' to add folders.\n",
      );
      return;
    }

    // Get currently selected folders
    const selectedIds = ctx.vaultConfig.selectedFolders;

    // Present checkbox with pre-selected folders
    const newSelectedIds = await checkbox<string>({
      message:
        "Toggle folders in search scope (space to toggle, enter to save):",
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
    await updateVaultConfig({ selectedFolders: newSelectedIds });

    // Show summary
    const changes: string[] = [];
    if (added.length > 0) {
      changes.push(`added ${added.length}`);
    }
    if (removed.length > 0) {
      changes.push(`removed ${removed.length}`);
    }

    console.log(
      `\n${success(`Updated search scope: ${changes.join(", ")} folder${added.length + removed.length === 1 ? "" : "s"}.`)}\n`,
    );
  },
);
