import type { AskFlags } from "../index.js";
import { withContext } from "../lib/command-context.js";
import {
  NiaApiError,
  searchLocalFolders,
  searchLocalFoldersStream,
} from "../lib/nia.js";
import { runNiaOnce } from "../lib/nia-sync.js";
import {
  error,
  formatSearchResults,
  streamSearchResults,
  success,
} from "../lib/output.js";

/**
 * Search query command
 * Queries notes using semantic search via Nia API
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
      } else {
        console.log(
          error("Sync failed. Make sure 'nia' command is available."),
        );
        process.exit(1);
      }
    }

    // Perform search
    try {
      if (flags.noStream) {
        // Non-streaming mode (original behavior)
        const result = await searchLocalFolders(
          ctx.niaSyncConfig.api_key,
          query.trim(),
          selectedFolders,
          flags.sources,
        );
        console.log(formatSearchResults(result, flags.sources));
      } else {
        // Streaming mode (default)
        const stream = searchLocalFoldersStream(
          ctx.niaSyncConfig.api_key,
          query.trim(),
          selectedFolders,
          flags.sources,
        );
        await streamSearchResults(stream, flags.sources);
      }
    } catch (err) {
      if (err instanceof NiaApiError) {
        console.log(error(err.message));
      } else {
        console.log(
          error(
            "Could not connect to Nia API. Check your internet connection.",
          ),
        );
      }
      process.exit(1);
    }
  },
);
