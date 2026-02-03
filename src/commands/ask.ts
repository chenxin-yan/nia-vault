import type { AskFlags } from "../index.js";
import { withContext } from "../lib/command-context.js";
import { NiaSyncError, runNiaOnce, runNiaSearch } from "../lib/nia-sync.js";
import { error, success } from "../lib/output.js";

/**
 * Search query command
 * Queries notes using semantic search via Nia CLI
 */
export const askCommand = withContext(
  { requiresNiaSync: true, requiresVaultConfig: true },
  async (ctx, query: string, flags: AskFlags): Promise<void> => {
    // Validate query
    if (!query?.trim()) {
      console.log(
        error(
          'Please provide a search query. Usage: vault ask "your question"',
        ),
      );
      process.exit(1);
    }

    // Validate folders exist
    let selectedFolders = ctx.vaultConfig.selectedFolders;
    if (selectedFolders.length === 0) {
      console.log(
        error(
          "No folders selected for search. Run 'vault folders' to select folders.",
        ),
      );
      process.exit(1);
    }

    // Filter to specific folder if --folder flag provided
    if (flags.folder) {
      if (!selectedFolders.includes(flags.folder)) {
        console.log(
          error(
            `Folder '${flags.folder}' is not in your selected folders.\nRun 'vault folders' to see available folders.`,
          ),
        );
        process.exit(1);
      }
      selectedFolders = [flags.folder];
    }

    // Run sync if --sync flag is provided
    if (flags.sync) {
      console.log("Syncing folders...");
      const syncSuccess = await runNiaOnce();
      if (syncSuccess) {
        console.log(success("Sync complete"));
        console.log(); // Blank line before search output
      } else {
        console.log(
          error("Sync failed. Make sure 'nia' command is available."),
        );
        process.exit(1);
      }
    }

    // Perform search via nia CLI
    try {
      const result = await runNiaSearch(query.trim(), selectedFolders, {
        sources: flags.sources,
        noStream: flags.noStream,
      });

      // In non-streaming mode, print the captured output
      if (flags.noStream && result) {
        console.log(result);
      }
    } catch (err) {
      if (err instanceof NiaSyncError) {
        console.log(error(err.message));
      } else {
        console.log(
          error("Failed to run search. Make sure 'nia' command is available."),
        );
      }
      process.exit(1);
    }
  },
);
