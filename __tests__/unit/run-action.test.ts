import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// Defined in a hoisted scope so vi.mock factories can see them.
const { mockLog, mockConfig } = vi.hoisted(() => ({
  mockLog: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
  mockConfig: { DEMO_READ_ONLY: false, NODE_ENV: "test", LOG_LEVEL: "silent" },
}));

vi.mock("@/lib/logger", () => ({
  log: mockLog,
  getLogger: vi.fn(() => mockLog),
}));

vi.mock("@/lib/config/server", () => ({ config: mockConfig }));

// Imports AFTER mocks (still required).
import { z } from "zod";
import { runAction } from "@/lib/actions/result";
import { AppError } from "@/lib/errors";

beforeEach(() => {
  mockConfig.DEMO_READ_ONLY = false;
  vi.clearAllMocks();
});

describe("runAction", () => {
  it("wraps raw data on success", async () => {
    const out = await runAction(async () => 42);
    expect(out).toEqual({ ok: true, data: 42 });
  });

  it("translates AppError -> ActionResult and logs once at warn", async () => {
    const out = await runAction(async () => {
      throw AppError.notFound("no swap");
    });
    expect(out).toEqual({
      ok: false,
      error: { code: "NOT_FOUND", message: "no swap" },
    });
    expect(mockLog.warn).toHaveBeenCalledTimes(1);
    expect(mockLog.error).not.toHaveBeenCalled();
  });

  it("translates ZodError -> VALIDATION_ERROR with fieldErrors", async () => {
    const schema = z.object({ name: z.string() });
    const out = await runAction(async () => schema.parse({}));
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.error.code).toBe("VALIDATION_ERROR");
      expect(out.error.fieldErrors).toBeDefined();
      expect(out.error.fieldErrors?.name).toBeDefined();
    }
  });

  it("translates unknown errors -> INTERNAL", async () => {
    const out = await runAction(async () => {
      throw new Error("boom");
    });
    expect(out).toEqual({
      ok: false,
      error: { code: "INTERNAL", message: "Something went wrong" },
    });
    expect(mockLog.error).toHaveBeenCalledTimes(1);
  });

  it("blocks in read-only mode WITHOUT calling fn", async () => {
    mockConfig.DEMO_READ_ONLY = true;
    const fn = vi.fn(async () => 42);
    const out = await runAction(fn);
    expect(fn).not.toHaveBeenCalled(); // ← the guarantee
    expect(out).toEqual({
      ok: false,
      error: { code: "READ_ONLY_DEMO", message: "This demo is read-only." },
    });
  });
});
