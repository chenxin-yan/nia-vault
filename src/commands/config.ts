import {
  CONFIG_PATH,
  configExists,
  deleteVaultConfig,
  readVaultConfig,
} from "../lib/config.js";
import { isNiaSyncConfigured, NIA_SYNC_CONFIG_PATH } from "../lib/nia-sync.js";
import { success } from "../lib/output.js";

/**
 * Config command - view current configuration
 */
export async function configCommand(): Promise<void> {
  console.log("\nConfiguration:\n");

  // Config file location
  console.log(`  Config file:     ${CONFIG_PATH}`);

  // API key source
  const niaSyncConfigured = await isNiaSyncConfigured();
  if (niaSyncConfigured) {
    console.log(`  API key source:  ${NIA_SYNC_CONFIG_PATH} (nia-sync)`);
  } else {
    console.log("  API key source:  Not configured");
  }

  // Search folders count
  const hasConfig = await configExists();
  if (hasConfig) {
    const config = await readVaultConfig();
    console.log(
      `  Search folders:  ${config?.selectedFolders.length ?? 0} selected`,
    );
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
    console.log(
      success("Config file deleted. Run 'vault init' to reconfigure."),
    );
  } else {
    console.log("No config file to delete.\n");
  }
}
