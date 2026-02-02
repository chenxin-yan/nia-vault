import { checkbox } from "@inquirer/prompts";
import { withContext } from "../lib/command-context.js";
import { CONFIG_PATH, updateVaultConfig } from "../lib/config.js";
import {
  type LocalFolder,
  listLocalFolders,
  NIA_SYNC_CONFIG_PATH,
} from "../lib/nia-sync.js";
import { error, success } from "../lib/output.js";

/**
 * Interactive setup wizard for nia-vault
 * Checks for nia-sync credentials and allows folder selection
 */
export const initCommand = withContext(
  { requiresNiaSync: true },
  async (): Promise<void> => {
    console.log("\nWelcome to nia-vault!\n");
    console.log(
      `${success(`Found nia-sync config at ${NIA_SYNC_CONFIG_PATH}`)}\n`,
    );

    // Fetch folders from nia-sync CLI
    console.log("Fetching synced folders...");

    let folders: LocalFolder[];
    try {
      folders = await listLocalFolders();
    } catch (err) {
      console.log(error((err as Error).message));
      process.exit(1);
    }

    if (folders.length === 0) {
      console.log(
        error("No synced folders found. Run 'nia add ~/path' to add folders."),
      );
      process.exit(1);
    }

    console.log(
      success(
        `Found ${folders.length} synced folder${folders.length === 1 ? "" : "s"}`,
      ),
    );

    // Present folder selection
    const selectedFolderIds = await checkbox<string>({
      message: "Select folders to include in searches:",
      choices: folders.map((folder) => ({
        name: `${folder.name.padEnd(20)} ${folder.path}`,
        value: folder.id,
        checked: true,
      })),
    });

    if (selectedFolderIds.length === 0) {
      console.log(
        error("No folders selected. Run 'vault init' again to select folders."),
      );
      process.exit(1);
    }

    // Save configuration
    await updateVaultConfig({ selectedFolders: selectedFolderIds });

    console.log(`\n${success(`Configuration saved to ${CONFIG_PATH}`)}\n`);
    console.log('You\'re all set! Try: vault ask "your question here"\n');
  },
);
