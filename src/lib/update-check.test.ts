import { describe, expect, test } from "bun:test";
import { compareVersions, isCacheExpired } from "./update-check.js";

// ============================================================================
// compareVersions Tests
// ============================================================================

describe("compareVersions", () => {
  describe("basic version comparisons", () => {
    test("returns true when registry version is newer (patch)", () => {
      expect(compareVersions("0.0.4", "0.0.5")).toBe(true);
    });

    test("returns true when registry version is newer (minor)", () => {
      expect(compareVersions("0.0.9", "0.1.0")).toBe(true);
    });

    test("returns true when registry version is newer (major)", () => {
      expect(compareVersions("0.9.9", "1.0.0")).toBe(true);
    });

    test("returns false when versions are equal", () => {
      expect(compareVersions("1.2.3", "1.2.3")).toBe(false);
    });

    test("returns false when installed version is newer", () => {
      expect(compareVersions("1.0.0", "0.9.9")).toBe(false);
    });
  });

  describe("v-prefix handling", () => {
    test("handles v-prefix on installed version", () => {
      expect(compareVersions("v0.0.4", "0.0.5")).toBe(true);
    });

    test("handles v-prefix on registry version", () => {
      expect(compareVersions("0.0.4", "v0.0.5")).toBe(true);
    });

    test("handles v-prefix on both versions", () => {
      expect(compareVersions("v0.0.4", "v0.0.5")).toBe(true);
    });

    test("handles v-prefix with equal versions", () => {
      expect(compareVersions("v1.0.0", "v1.0.0")).toBe(false);
    });
  });

  describe("pre-release versions", () => {
    test("treats pre-release as base version", () => {
      // 1.0.0-alpha vs 1.0.0 should compare as 1.0.0 vs 1.0.0
      expect(compareVersions("1.0.0-alpha", "1.0.0")).toBe(false);
    });

    test("handles pre-release on registry version", () => {
      expect(compareVersions("0.9.9", "1.0.0-beta")).toBe(true);
    });

    test("compares main version parts only", () => {
      // Both should be treated as 1.0.0
      expect(compareVersions("1.0.0-alpha.1", "1.0.0-beta.2")).toBe(false);
    });
  });

  describe("edge cases", () => {
    test("handles missing patch version", () => {
      // Should treat as 1.0.0 vs 1.0.1
      expect(compareVersions("1.0", "1.0.1")).toBe(true);
    });

    test("handles missing minor and patch", () => {
      expect(compareVersions("1", "1.0.1")).toBe(true);
    });

    test("handles 0.0.0 version", () => {
      expect(compareVersions("0.0.0", "0.0.1")).toBe(true);
    });

    test("handles large version numbers", () => {
      expect(compareVersions("99.99.99", "100.0.0")).toBe(true);
    });

    test("handles same major, different minor", () => {
      expect(compareVersions("2.1.0", "2.2.0")).toBe(true);
      expect(compareVersions("2.2.0", "2.1.0")).toBe(false);
    });

    test("handles same major and minor, different patch", () => {
      expect(compareVersions("3.4.5", "3.4.6")).toBe(true);
      expect(compareVersions("3.4.6", "3.4.5")).toBe(false);
    });
  });
});

// ============================================================================
// isCacheExpired Tests
// ============================================================================

describe("isCacheExpired", () => {
  // Cache TTL used by the application (24 hours)
  const TTL_24H = 24 * 60 * 60 * 1000;

  test("returns true when cache is older than TTL", () => {
    // 25 hours ago
    const lastChecked = new Date(
      Date.now() - 25 * 60 * 60 * 1000,
    ).toISOString();
    expect(isCacheExpired(lastChecked, TTL_24H)).toBe(true);
  });

  test("returns false when cache is fresher than TTL", () => {
    // 1 hour ago
    const lastChecked = new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString();
    expect(isCacheExpired(lastChecked, TTL_24H)).toBe(false);
  });

  test("returns false when cache was just created", () => {
    const lastChecked = new Date().toISOString();
    expect(isCacheExpired(lastChecked, TTL_24H)).toBe(false);
  });

  test("returns true when cache is exactly at TTL boundary (edge case)", () => {
    // Exactly 24 hours + 1ms ago should be expired
    const lastChecked = new Date(Date.now() - TTL_24H - 1).toISOString();
    expect(isCacheExpired(lastChecked, TTL_24H)).toBe(true);
  });

  test("returns false when cache is just under TTL", () => {
    // 24 hours minus 1 second
    const lastChecked = new Date(Date.now() - TTL_24H + 1000).toISOString();
    expect(isCacheExpired(lastChecked, TTL_24H)).toBe(false);
  });

  test("works with different TTL values", () => {
    const TTL_1H = 60 * 60 * 1000;
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    expect(isCacheExpired(twoHoursAgo, TTL_1H)).toBe(true);
    expect(isCacheExpired(twoHoursAgo, TTL_24H)).toBe(false);
  });

  test("handles TTL of 0 (only past timestamps expired)", () => {
    const justNow = new Date().toISOString();
    // With TTL of 0, a just-created cache is NOT expired
    // (since now - lastChecked is approximately 0, not > 0)
    expect(isCacheExpired(justNow, 0)).toBe(false);

    // But a timestamp from the past is expired with TTL of 0
    const oneSecondAgo = new Date(Date.now() - 1000).toISOString();
    expect(isCacheExpired(oneSecondAgo, 0)).toBe(true);
  });

  test("handles very old timestamps", () => {
    const oneYearAgo = new Date(
      Date.now() - 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    expect(isCacheExpired(oneYearAgo, TTL_24H)).toBe(true);
  });

  test("parses ISO date string correctly", () => {
    // Explicit ISO format
    const lastChecked = "2024-01-15T12:30:00.000Z";
    // This is in the past, so should be expired with 24h TTL
    expect(isCacheExpired(lastChecked, TTL_24H)).toBe(true);
  });
});
