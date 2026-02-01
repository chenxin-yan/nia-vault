import { checkbox } from '@inquirer/prompts';
import { getApiKey, isNiaSyncConfigured } from '../lib/nia-sync.js';
import { listLocalFolders, NiaApiError } from '../lib/nia.js';
import {
  getSelectedFolders,
  addSelectedFolders,
  removeSelectedFolders,
  configExists,
} from '../lib/config.js';
import { formatFolderList } from '../lib/output.js';

/**
 * Folders list command (default)
 * Shows selected and available folders
 */
export async function foldersListCommand(): Promise<void> {
  // Check for nia-sync configuration
  const niaSyncConfigured = await isNiaSyncConfigured();
  if (!niaSyncConfigured) {
    console.log(`✗ nia-sync not configured. Run 'nia login' first.\n`);
    process.exit(1);
  }

  // Get API key
  const apiKey = await getApiKey();
  if (!apiKey) {
    console.log('✗ Could not read API key from nia-sync config.\n');
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
      console.log('✗ Could not connect to Nia API. Check your internet connection.\n');
    }
    process.exit(1);
  }

  if (folders.length === 0) {
    console.log("No synced folders found. Run 'nia add ~/path' to add folders.\n");
    return;
  }

  // Get selected folders from vault config
  const selectedIds = await getSelectedFolders();

  // Display formatted folder list
  console.log(formatFolderList(folders, selectedIds));
  console.log('');
}

/**
 * Folders add command
 * Interactive checkbox to add folders to search scope
 */
export async function foldersAddCommand(): Promise<void> {
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

  // Fetch all synced folders from Nia
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
    console.log("No synced folders found. Run 'nia add ~/path' to add folders.\n");
    return;
  }

  // Get currently selected folders
  const selectedIds = await getSelectedFolders();

  // Filter to only show folders not currently selected
  const availableFolders = folders.filter((f) => !selectedIds.includes(f.id));

  if (availableFolders.length === 0) {
    console.log('All synced folders are already included in searches.\n');
    return;
  }

  // Present checkbox for folder selection
  const foldersToAdd = await checkbox<string>({
    message: 'Select folders to add to searches:',
    choices: availableFolders.map((folder) => ({
      name: `${folder.name.padEnd(20)} ${folder.path}`,
      value: folder.id,
    })),
  });

  if (foldersToAdd.length === 0) {
    console.log('\nNo folders selected.\n');
    return;
  }

  // Add selected folders to config
  await addSelectedFolders(foldersToAdd);

  console.log(`\n✓ Added ${foldersToAdd.length} folder${foldersToAdd.length === 1 ? '' : 's'} to search scope.\n`);
}

/**
 * Folders remove command
 * Interactive checkbox to remove folders from search scope
 */
export async function foldersRemoveCommand(): Promise<void> {
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

  // Fetch all synced folders from Nia
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

  // Get currently selected folders
  const selectedIds = await getSelectedFolders();

  // Filter to only show folders currently selected
  const selectedFolders = folders.filter((f) => selectedIds.includes(f.id));

  if (selectedFolders.length === 0) {
    console.log("No folders are currently selected for search. Run 'vault folders add' to add folders.\n");
    return;
  }

  // Present checkbox for folder selection
  const foldersToRemove = await checkbox<string>({
    message: 'Select folders to remove from searches:',
    choices: selectedFolders.map((folder) => ({
      name: `${folder.name.padEnd(20)} ${folder.path}`,
      value: folder.id,
    })),
  });

  if (foldersToRemove.length === 0) {
    console.log('\nNo folders selected.\n');
    return;
  }

  // Remove selected folders from config
  await removeSelectedFolders(foldersToRemove);

  console.log(`\n✓ Removed ${foldersToRemove.length} folder${foldersToRemove.length === 1 ? '' : 's'} from search scope.\n`);
}
