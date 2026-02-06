import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CONFIG_DIR } from "./config.js";

// Package name for npm registry lookup
const PACKAGE_NAME = "nia-vault";

// Cache file location
const UPDATE_CHECK_CACHE_PATH = join(CONFIG_DIR, "update-check.json");

// Cache TTL: 24 hours in milliseconds
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

// Interface for cache file
interface UpdateCheckCache {
  lastChecked: string; // ISO timestamp
  latestVersion: string;
}

/**
 * Get the currently installed version of nia-vault.
 * This reads from the package.json that meow resolves.
 * Must be called with the version from cli.pkg.version.
 */
let installedVersion: string | null = null;

export function setInstalledVersion(version: string): void {
  installedVersion = version;
}

export function getInstalledVersion(): string | null {
  return installedVersion;
}

/**
 * Fetch the latest version from the npm registry.
 * Returns null if the fetch fails for any reason.
 */
async function getLatestVersion(): Promise<string | null> {
  try {
    const response = await fetch(
      `https://registry.npmjs.org/${PACKAGE_NAME}/latest`,
      {
        headers: {
          Accept: "application/json",
        },
        // 5 second timeout to avoid blocking
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { version?: string };
    return data.version ?? null;
  } catch {
    // Network error, timeout, or JSON parse error - fail silently
    return null;
  }
}

/**
 * Read the update check cache file.
 * Returns null if cache doesn't exist or is invalid.
 */
async function readCache(): Promise<UpdateCheckCache | null> {
  try {
    await access(UPDATE_CHECK_CACHE_PATH);
    const content = await readFile(UPDATE_CHECK_CACHE_PATH, "utf-8");
    const cache = JSON.parse(content) as UpdateCheckCache;

    // Validate cache structure
    if (
      typeof cache.lastChecked === "string" &&
      typeof cache.latestVersion === "string"
    ) {
      return cache;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Write the update check cache file.
 * Best-effort write - silently catches all errors.
 */
async function writeCache(latestVersion: string): Promise<void> {
  try {
    await mkdir(dirname(UPDATE_CHECK_CACHE_PATH), { recursive: true });
    const cache: UpdateCheckCache = {
      lastChecked: new Date().toISOString(),
      latestVersion,
    };
    await writeFile(UPDATE_CHECK_CACHE_PATH, JSON.stringify(cache, null, 2));
  } catch {
    // Silently ignore write errors
  }
}

/**
 * Check if the cache is still valid (within TTL).
 */
export function isCacheExpired(lastChecked: string, ttlMs: number): boolean {
  const lastCheckedTime = new Date(lastChecked).getTime();
  const now = Date.now();
  return now - lastCheckedTime > ttlMs;
}

/**
 * Compare two semver version strings.
 * Returns true if the registry version is newer than the installed version.
 */
export function compareVersions(
  installedVersion: string,
  registryVersion: string,
): boolean {
  const parseVersion = (version: string): number[] => {
    // Remove any leading 'v' and split by '.'
    const clean = version.replace(/^v/, "");
    // Handle pre-release versions by only taking the main version part
    const mainVersion = clean.split("-")[0] ?? clean;
    return mainVersion.split(".").map((n) => Number.parseInt(n, 10) || 0);
  };

  const installed = parseVersion(installedVersion);
  const registry = parseVersion(registryVersion);

  // Compare major, minor, patch
  for (let i = 0; i < 3; i++) {
    const inst = installed[i] ?? 0;
    const reg = registry[i] ?? 0;

    if (reg > inst) {
      return true; // Registry version is newer
    }
    if (reg < inst) {
      return false; // Installed version is newer
    }
  }

  return false; // Versions are equal
}

/**
 * Print the update notification to stderr.
 * Uses stderr so it doesn't interfere with piped stdout output.
 */
function printUpdateNotification(
  currentVersion: string,
  latestVersion: string,
): void {
  console.error("");
  console.error(`Update available: ${currentVersion} → ${latestVersion}`);
  console.error("Run one of the following to update:");
  console.error(`  npm update -g ${PACKAGE_NAME}`);
  console.error(`  bun update -g ${PACKAGE_NAME}`);
  console.error(`  yarn global upgrade ${PACKAGE_NAME}`);
}

// Store the deferred update notification
let pendingNotification: (() => void) | null = null;

// Track if we've already registered the beforeExit handler
let beforeExitRegistered = false;

/**
 * Fire-and-forget update check.
 * This function NEVER throws - all errors are caught silently.
 * The notification is printed automatically when the process is about to exit.
 */
export function checkForUpdate(): void {
  // Register the beforeExit handler once to print any pending notification
  if (!beforeExitRegistered) {
    beforeExitRegistered = true;
    process.on("beforeExit", () => {
      if (pendingNotification) {
        pendingNotification();
        pendingNotification = null;
      }
    });
  }

  // Wrap everything in an async IIFE and catch all errors
  (async () => {
    const currentVersion = getInstalledVersion();

    // If we don't have the installed version, skip the check
    if (!currentVersion) {
      return;
    }

    // Check cache first
    const cache = await readCache();

    if (cache && !isCacheExpired(cache.lastChecked, CACHE_TTL_MS)) {
      // Use cached version
      if (compareVersions(currentVersion, cache.latestVersion)) {
        pendingNotification = () =>
          printUpdateNotification(currentVersion, cache.latestVersion);
      }
      return;
    }

    // Fetch latest version from npm registry
    const latestVersion = await getLatestVersion();

    if (!latestVersion) {
      return;
    }

    // Update cache
    await writeCache(latestVersion);

    // Check if update is available
    if (compareVersions(currentVersion, latestVersion)) {
      pendingNotification = () =>
        printUpdateNotification(currentVersion, latestVersion);
    }
  })().catch(() => {
    // Silently ignore any errors
  });
}

/**
 * Print any pending update notification.
 * Call this after the main command has finished executing.
 */
export function printPendingUpdateNotification(): void {
  if (pendingNotification) {
    pendingNotification();
    pendingNotification = null;
  }
}
