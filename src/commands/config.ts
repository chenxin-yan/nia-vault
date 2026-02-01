import {
  configExists,
  deleteVaultConfig,
  getSelectedFolders,
  getVaultConfigPath,
} from "../lib/config.js";
import { getNiaSyncConfigPath, isNiaSyncConfigured } from "../lib/nia-sync.js";

/**
 * Config command - view current configuration
 */
export async function configCommand(): Promise<void> {
  console.log("\nConfiguration:\n");

  // Config file location
  const configPath = getVaultConfigPath();
  console.log(`  Config file:     ${configPath}`);

  // API key source
  const niaSyncConfigured = await isNiaSyncConfigured();
  if (niaSyncConfigured) {
    console.log(`  API key source:  ${getNiaSyncConfigPath()} (nia-sync)`);
  } else {
    console.log("  API key source:  Not configured");
  }

  // Search folders count
  const hasConfig = await configExists();
  if (hasConfig) {
    const selectedFolders = await getSelectedFolders();
    console.log(`  Search folders:  ${selectedFolders.length} selected`);
  } else {
    console.log("  Search folders:  Not configured");
  }

  console.log("");
}

/**
 * Config reset command - delete configuration file
 */
export async function configResetCommand(): Promise<void> {
  const deleted = await deleteVaultConfig();

  if (deleted) {
    console.log("✓ Config file deleted. Run 'vault init' to reconfigure.\n");
  } else {
    console.log("No config file to delete.\n");
  }
}
