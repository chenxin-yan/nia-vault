import { isNiaSyncConfigured, runNiaOnce } from '../lib/nia-sync.js';
import { getSelectedFolders, configExists } from '../lib/config.js';

/**
 * Sync command
 * Manually trigger a sync of all folders (runs `nia once`)
 */
export async function syncCommand(): Promise<void> {
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

  // Get selected folders count for the success message
  const selectedFolders = await getSelectedFolders();
  if (selectedFolders.length === 0) {
    console.log("✗ No folders selected for sync. Run 'vault folders add' to select folders.\n");
    process.exit(1);
  }

  // Run sync
  console.log('Syncing folders with Nia...');
  const syncSuccess = await runNiaOnce();

  if (syncSuccess) {
    const folderCount = selectedFolders.length;
    console.log(`✓ Sync complete (${folderCount} folder${folderCount === 1 ? '' : 's'} updated)\n`);
  } else {
    console.log("✗ Sync failed. Make sure 'nia' command is available.\n");
    process.exit(1);
  }
}
