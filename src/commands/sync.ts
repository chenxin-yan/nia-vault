import { withContext } from "../lib/command-context.js";
import { runNiaOnce } from "../lib/nia-sync.js";
import { error, success } from "../lib/output.js";

/**
 * Sync command
 * Manually trigger a sync of all nia-sync sources (runs `nia once`)
 */
export const syncCommand = withContext(
  { requiresNiaSync: true },
  async (): Promise<void> => {
    console.log("Syncing folders with Nia...");
    const syncSuccess = await runNiaOnce();

    if (syncSuccess) {
      console.log(success("Sync complete"));
    } else {
      console.log(error("Sync failed. Make sure 'nia' command is available."));
      process.exit(1);
    }
  },
);
