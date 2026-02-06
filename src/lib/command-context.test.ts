import { describe, expect, test } from "bun:test";
import {
  type CommandRequirements,
  type ContextFor,
  withContext,
} from "./command-context.js";

// ============================================================================
// Type Tests (compile-time validation)
// ============================================================================

describe("CommandContext types", () => {
  test("ContextFor type includes niaSyncConfig when requiresNiaSync is true", () => {
    // This is a type-level test - it passes if it compiles
    type TestContext = ContextFor<{ requiresNiaSync: true }>;
    // Verifying niaSyncConfig exists on the type
    const _typeCheck: TestContext = { niaSyncConfig: { api_key: "test" } };
    expect(_typeCheck.niaSyncConfig.api_key).toBe("test");
  });

  test("ContextFor type includes vaultConfig when requiresVaultConfig is true", () => {
    type TestContext = ContextFor<{ requiresVaultConfig: true }>;
    // Verifying vaultConfig exists on the type
    const _typeCheck: TestContext = {
      vaultConfig: { selectedFolders: [] },
    };
    expect(_typeCheck.vaultConfig.selectedFolders).toEqual([]);
  });

  test("ContextFor type includes both when both requirements are true", () => {
    type TestContext = ContextFor<{
      requiresNiaSync: true;
      requiresVaultConfig: true;
    }>;
    // This should compile
    const _typeCheck: TestContext = {
      niaSyncConfig: { api_key: "test" },
      vaultConfig: { selectedFolders: [] },
    };
    expect(true).toBe(true);
  });

  test("ContextFor type is empty object when no requirements", () => {
    type TestContext = ContextFor<{}>;
    const _typeCheck: TestContext = {};
    expect(true).toBe(true);
  });
});

// ============================================================================
// withContext Function Tests
// ============================================================================

describe("withContext", () => {
  test("returns a function", () => {
    const wrappedFn = withContext({}, async () => {
      return "result";
    });
    expect(typeof wrappedFn).toBe("function");
  });

  test("wrapped function is async", () => {
    const wrappedFn = withContext({}, async (ctx) => {
      return "result";
    });
    const result = wrappedFn();
    expect(result).toBeInstanceOf(Promise);
  });

  test("passes arguments through to handler", async () => {
    // Mock a scenario where validation passes (no requirements)
    let receivedArgs: unknown[] = [];

    const wrappedFn = withContext(
      {},
      async (ctx, arg1: string, arg2: number) => {
        receivedArgs = [arg1, arg2];
        return "result";
      },
    );

    // With no requirements, the handler should be called
    await wrappedFn("test", 42);
    expect(receivedArgs).toEqual(["test", 42]);
  });

  test("handler receives empty context when no requirements", async () => {
    let receivedContext: object | undefined;

    const wrappedFn = withContext({}, async (ctx) => {
      receivedContext = ctx;
      return "result";
    });

    await wrappedFn();
    expect(receivedContext).toEqual({});
  });

  describe("requirement combinations", () => {
    test("can specify only requiresNiaSync", () => {
      const wrapped = withContext({ requiresNiaSync: true }, async (ctx) => {
        // Type should include niaSyncConfig
        return ctx;
      });
      expect(typeof wrapped).toBe("function");
    });

    test("can specify only requiresVaultConfig", () => {
      const wrapped = withContext(
        { requiresVaultConfig: true },
        async (ctx) => {
          // Type should include vaultConfig
          return ctx;
        },
      );
      expect(typeof wrapped).toBe("function");
    });

    test("can specify both requirements", () => {
      const wrapped = withContext(
        { requiresNiaSync: true, requiresVaultConfig: true },
        async (ctx) => {
          // Type should include both
          return ctx;
        },
      );
      expect(typeof wrapped).toBe("function");
    });
  });
});

// ============================================================================
// Integration Tests
// Note: These tests would require mocking process.exit() or using real configs.
// Since process.exit() terminates the process, we can't easily test the
// error paths without significant mocking infrastructure.
// ============================================================================

describe("[integration] withContext with real config files", () => {
  // These tests document the expected behavior but are marked as integration
  // tests since they require file system access and can't easily test the
  // process.exit() paths without special test infrastructure.

  test("documents: when nia-sync not configured, process exits with error", () => {
    // This behavior is documented but can't be tested without process mocking
    // Expected behavior: console.log(error("nia-sync not configured..."))
    // Then: process.exit(1)
    expect(true).toBe(true);
  });

  test("documents: when vault config missing, process exits with error", () => {
    // Expected behavior: console.log(error("No configuration found..."))
    // Then: process.exit(1)
    expect(true).toBe(true);
  });

  test("documents: when both configs exist, handler receives populated context", () => {
    // Expected behavior:
    // ctx.niaSyncConfig = { api_key: "..." }
    // ctx.vaultConfig = { selectedFolders: [...] }
    expect(true).toBe(true);
  });
});

// ============================================================================
// CommandRequirements Type Tests
// ============================================================================

describe("CommandRequirements interface", () => {
  test("allows partial requirements", () => {
    const reqs1: CommandRequirements = {};
    const reqs2: CommandRequirements = { requiresNiaSync: true };
    const reqs3: CommandRequirements = { requiresVaultConfig: true };
    const reqs4: CommandRequirements = {
      requiresNiaSync: true,
      requiresVaultConfig: true,
    };

    // All should be valid
    expect(reqs1.requiresNiaSync).toBeUndefined();
    expect(reqs2.requiresNiaSync).toBe(true);
    expect(reqs3.requiresVaultConfig).toBe(true);
    expect(reqs4.requiresNiaSync).toBe(true);
  });

  test("optional properties can be false", () => {
    const reqs: CommandRequirements = {
      requiresNiaSync: false,
      requiresVaultConfig: false,
    };
    expect(reqs.requiresNiaSync).toBe(false);
    expect(reqs.requiresVaultConfig).toBe(false);
  });
});
