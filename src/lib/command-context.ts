import { configExists, readVaultConfig, type VaultConfig } from "./config.js";
import {
  isNiaSyncConfigured,
  type NiaSyncConfig,
  readNiaSyncConfig,
} from "./nia-sync.js";
import { error } from "./output.js";

// ============================================================================
// Requirements & Context Types
// ============================================================================

export interface CommandRequirements {
  requiresNiaSync?: boolean;
  requiresVaultConfig?: boolean;
}

interface NiaSyncContext {
  niaSyncConfig: NiaSyncConfig;
}

interface VaultConfigContext {
  vaultConfig: VaultConfig;
}

export type ContextFor<R extends CommandRequirements> =
  (R["requiresNiaSync"] extends true ? NiaSyncContext : object) &
    (R["requiresVaultConfig"] extends true ? VaultConfigContext : object);

// ============================================================================
// Error Messages
// ============================================================================

const ERROR_MESSAGES = {
  niaSyncNotConfigured: "nia-sync not configured. Run 'nia login' first.",
  vaultConfigNotFound:
    "No configuration found. Run 'vault init' to get started.",
} as const;

// ============================================================================
// Context Wrapper
// ============================================================================

/**
 * Wrap a command handler with declarative requirements
 * Validates configuration and provides typed context
 */
export function withContext<
  R extends CommandRequirements,
  Args extends unknown[],
  Return,
>(
  requirements: R,
  handler: (ctx: ContextFor<R>, ...args: Args) => Promise<Return>,
): (...args: Args) => Promise<Return> {
  return async (...args: Args): Promise<Return> => {
    const ctx = await validateAndLoadContext(requirements);
    return handler(ctx as ContextFor<R>, ...args);
  };
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function validateAndLoadContext(
  requirements: CommandRequirements,
): Promise<
  | (NiaSyncContext & VaultConfigContext)
  | NiaSyncContext
  | VaultConfigContext
  | object
> {
  const ctx: Partial<NiaSyncContext & VaultConfigContext> = {};

  if (requirements.requiresNiaSync) {
    const isConfigured = await isNiaSyncConfigured();
    if (!isConfigured) {
      console.log(error(ERROR_MESSAGES.niaSyncNotConfigured));
      process.exit(1);
    }
    ctx.niaSyncConfig = await readNiaSyncConfig();
  }

  if (requirements.requiresVaultConfig) {
    const hasConfig = await configExists();
    if (!hasConfig) {
      console.log(error(ERROR_MESSAGES.vaultConfigNotFound));
      process.exit(1);
    }
    ctx.vaultConfig = await readVaultConfig();
  }

  return ctx;
}
