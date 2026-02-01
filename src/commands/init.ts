import { checkbox } from '@inquirer/prompts';
import { isNiaSyncConfigured, getApiKey, getNiaSyncConfigPath } from '../lib/nia-sync.js';
import { listLocalFolders, NiaApiError } from '../lib/nia.js';
import { saveSelectedFolders, getVaultConfigPath } from '../lib/config.js';

/**
 * Interactive setup wizard for nia-vault
 * Checks for nia-sync credentials and allows folder selection
 */
export async function initCommand(): Promise<void> {
  console.log('\nWelcome to nia-vault!\n');

  // Step 1: Check for nia-sync configuration
  console.log('Checking for nia-sync configuration...');

  const niaSyncConfigured = await isNiaSyncConfigured();

  if (!niaSyncConfigured) {
    console.log(`✗ No nia-sync config found at ${getNiaSyncConfigPath()}\n`);
    console.log('Please set up nia-sync first:');
    console.log('  1. pip install nia-sync');
    console.log('  2. nia login');
    console.log('  3. nia add ~/path/to/notes');
    console.log("  4. Run 'vault init' again\n");
    process.exit(1);
  }

  console.log(`✓ Found API key in ${getNiaSyncConfigPath()}\n`);

  // Step 2: Get API key and fetch folders
  const apiKey = await getApiKey();

  if (!apiKey) {
    console.log('✗ Could not read API key from nia-sync config\n');
    process.exit(1);
  }

  console.log('Fetching synced folders...');

  let folders;
  try {
    folders = await listLocalFolders(apiKey);
  } catch (error) {
    if (error instanceof NiaApiError) {
      console.log(`✗ ${error.message}\n`);
    } else {
      console.log('✗ Could not connect to Nia API. Check your internet connection.\n');
    }
    process.exit(1);
  }

  if (folders.length === 0) {
    console.log("✗ No synced folders found. Run 'nia add ~/path' to add folders.\n");
    process.exit(1);
  }

  console.log(`✓ Found ${folders.length} synced folder${folders.length === 1 ? '' : 's'}\n`);

  // Step 3: Present folder selection
  const selectedFolderIds = await checkbox<string>({
    message: 'Select folders to include in searches:',
    choices: folders.map((folder) => ({
      name: `${folder.name.padEnd(20)} ${folder.path}`,
      value: folder.id,
      checked: true,
    })),
  });

  if (selectedFolderIds.length === 0) {
    console.log('\n✗ No folders selected. Run vault init again to select folders.\n');
    process.exit(1);
  }

  // Step 4: Save configuration
  await saveSelectedFolders(selectedFolderIds);

  console.log(`\n✓ Configuration saved to ${getVaultConfigPath()}\n`);
  console.log("You're all set! Try: vault ask \"your question here\"\n");
}
