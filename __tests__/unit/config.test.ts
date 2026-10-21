import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// `server-only` throws outside a React Server Component context.
// Neutralize it so we can import server.ts in the test runner.
vi.mock("server-only", () => ({}));

// `server.ts` calls dotenv.config({ path: envFile }) at module load.
// Without this mock, dotenv would read real .env files from the cwd
// and pollute process.env between tests. We want full control.
vi.mock("dotenv", () => ({
  default: { config: vi.fn() },
}));

// Capture the runner's original env
const ORIGINAL_ENV = process.env;

// Keys our config modules read directly. We clear them in beforeEach so
// a stray value in the host shell can't leak into an assertion.
const MANAGED_KEYS = [
  "DATABASE_URL",
  "APP_URL",
  "LOG_LEVEL",
  "NEXT_PUBLIC_APP_NAME",
  "NEXT_PUBLIC_API_URL",
] as const;

function resetEnv() {
  process.env = { ...ORIGINAL_ENV };
  for (const key of MANAGED_KEYS) delete process.env[key];
}

// Fills every required server-side var with a valid value.
// ⚠️ NODE_ENV must be in the schema's enum — "test" is NOT in
// ["development", "staging", "production"], so we use "development"
// here. See the note at the bottom about adding "test" to the enum.
function setValidServerEnv(overrides: Record<string, string> = {}) {
  Object.assign(process.env, {
    DATABASE_URL: "postgresql://localhost/test",
    NODE_ENV: "development",
    APP_URL: "http://localhost:3000",
    LOG_LEVEL: "info",
    ...overrides,
  });
}

// Both modules run validation at module-eval time, so we must re-import
// after every env change. vi.resetModules() clears Vitest's module cache;
// dynamic import then re-executes the module body with the current env.
async function importClient() {
  vi.resetModules();
  return import("../../lib/config/client");
}

async function importServer() {
  vi.resetModules();
  return import("../../lib/config/server");
}

beforeEach(() => {
  resetEnv();
  vi.resetModules();
});

afterEach(() => {
  process.env = ORIGINAL_ENV;
  vi.restoreAllMocks(); // undo process.exit spies
});

// ─────────────────────────────────────────────────────────────────────
// client
// ─────────────────────────────────────────────────────────────────────
describe("client config", () => {
  it("applies defaults when NEXT_PUBLIC_* are not set", async () => {
    const { config } = await importClient();
    expect(config.NEXT_PUBLIC_APP_NAME).toBe("My App");
    expect(config.NEXT_PUBLIC_API_URL).toBe("/api");
  });

  it("reads values from process.env.NEXT_PUBLIC_*", async () => {
    process.env.NEXT_PUBLIC_APP_NAME = "Test App";
    process.env.NEXT_PUBLIC_API_URL = "https://api.example.com";

    const { config } = await importClient();
    expect(config.NEXT_PUBLIC_APP_NAME).toBe("Test App");
    expect(config.NEXT_PUBLIC_API_URL).toBe("https://api.example.com");
  });

  it("throws on invalid NEXT_PUBLIC_API_URL", async () => {
    process.env.NEXT_PUBLIC_API_URL = "not-a-url";
    await expect(importClient()).rejects.toThrow();
  });

  it("does NOT require any server-only vars", async () => {
    // This is the whole point of the split: a Client Component test
    // shouldn't need DATABASE_URL / APP_URL / LOG_LEVEL to be set.
    // (resetEnv already cleared them; no validServerEnv call here.)
    const { config } = await importClient();
    expect(config).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────
// server
// ─────────────────────────────────────────────────────────────────────
describe("server config", () => {
  it("loads and merges server + client config", async () => {
    setValidServerEnv();
    process.env.NEXT_PUBLIC_APP_NAME = "Merged App";

    const { config } = await importServer();

    // server fields
    expect(config.DATABASE_URL).toBe("postgresql://localhost/test");
    expect(config.NODE_ENV).toBe("development");
    expect(config.APP_URL).toBe("http://localhost:3000");
    expect(config.LOG_LEVEL).toBe("info");

    // merged client fields are present too
    expect(config.NEXT_PUBLIC_APP_NAME).toBe("Merged App");
    expect(config.NEXT_PUBLIC_API_URL).toBe("/api"); // default
  });

  it("throws on missing DATABASE_URL", async () => {
    setValidServerEnv();
    delete process.env.DATABASE_URL;
    await expect(importServer()).rejects.toThrow();
  });

  it("throws on invalid DATABASE_URL", async () => {
    setValidServerEnv({ DATABASE_URL: "not-a-url" });
    await expect(importServer()).rejects.toThrow();
  });

  it("throws on missing APP_URL", async () => {
    setValidServerEnv();
    delete process.env.APP_URL;
    await expect(importServer()).rejects.toThrow();
  });

  it("throws on invalid APP_URL", async () => {
    setValidServerEnv({ APP_URL: "ftp://nope" });
    await expect(importServer()).rejects.toThrow();
  });

  it("throws on invalid LOG_LEVEL", async () => {
    setValidServerEnv({ LOG_LEVEL: "verbose" });
    await expect(importServer()).rejects.toThrow();
  });

  it("throws on NODE_ENV not in the enum", async () => {
    setValidServerEnv({ NODE_ENV: "bogus" });
    await expect(importServer()).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────
// production exit behavior
// ─────────────────────────────────────────────────────────────────────
describe("server config in production", () => {
  it("calls process.exit(1) on validation failure", async () => {
    // process.exit never returns in Node. Mocking it must throw so the
    // test process survives and we can assert the call.
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((
      code?: number,
    ) => {
      throw new Error(`process.exit(${code ?? 0}) called`);
    }) as never);

    setValidServerEnv({ NODE_ENV: "production" });
    delete process.env.DATABASE_URL;

    await expect(importServer()).rejects.toThrow(/process\.exit\(1\)/);
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("does NOT exit in development", async () => {
    const exitSpy = vi.spyOn(process, "exit");

    setValidServerEnv({ NODE_ENV: "development" });
    delete process.env.DATABASE_URL;

    // Still throws the ZodError — but process.exit is never reached.
    await expect(importServer()).rejects.toThrow();
    expect(exitSpy).not.toHaveBeenCalled();
  });
});
