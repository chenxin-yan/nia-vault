import { getApiKey, isNiaSyncConfigured, runNiaOnce } from '../lib/nia-sync.js';
import { searchLocalFolders, NiaApiError } from '../lib/nia.js';
import { getSelectedFolders, configExists } from '../lib/config.js';
import { formatSearchResults } from '../lib/output.js';
import type { AskFlags } from '../types.js';

/**
 * Search query command
 * Queries notes using semantic search via Nia API
 */
export async function askCommand(query: string, flags: AskFlags): Promise<void> {
  // Validate query
  if (!query || query.trim().length === 0) {
    console.log("✗ Please provide a search query. Usage: vault ask \"your question\"\n");
    process.exit(1);
  }

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
    console.log('✗ Could not read API key from nia-sync config.\n');
    process.exit(1);
  }

  // Get selected folders
  let selectedFolders = await getSelectedFolders();

  if (selectedFolders.length === 0) {
    console.log("✗ No folders selected for search. Run 'vault folders add' to select folders.\n");
    process.exit(1);
  }

  // Filter to specific folder if --folder flag is provided
  if (flags.folder) {
    if (!selectedFolders.includes(flags.folder)) {
      console.log(`✗ Folder '${flags.folder}' is not in your selected folders.\n`);
      console.log("Run 'vault folders' to see available folders.\n");
      process.exit(1);
    }
    selectedFolders = [flags.folder];
  }

  // Run sync if --sync flag is provided
  if (flags.sync) {
    console.log('Syncing folders...');
    const syncSuccess = await runNiaOnce();
    if (syncSuccess) {
      console.log('✓ Sync complete\n');
    } else {
      console.log("✗ Sync failed. Make sure 'nia' command is available.\n");
      process.exit(1);
    }
  }

  // Perform search
  const folderCount = selectedFolders.length;
  console.log(`Searching ${folderCount} folder${folderCount === 1 ? '' : 's'}...\n`);

  const limit = flags.limit ?? 5;

  try {
    const result = await searchLocalFolders(apiKey, query.trim(), selectedFolders, limit);
    console.log(formatSearchResults(result));
  } catch (error) {
    if (error instanceof NiaApiError) {
      console.log(`✗ ${error.message}\n`);
    } else {
      console.log('✗ Could not connect to Nia API. Check your internet connection.\n');
    }
    process.exit(1);
  }
}
