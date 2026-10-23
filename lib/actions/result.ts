import "server-only";
import { ZodError } from "zod";
import { AppError, logError } from "@/lib/errors";
import { config } from "@/lib/config/server";

export type ActionResult<T> =
  | { ok: true; data: T }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

export async function runAction<T>(
  fn: () => Promise<T>,
): Promise<ActionResult<T>> {
  // Read-only demo guard: block before the mutation runs.
  // This is a MUTATION boundary — reads go through services/ directly.
  if (config.DEMO_READ_ONLY) {
    return {
      ok: false,
      error: { code: "READ_ONLY_DEMO", message: "This demo is read-only." },
    };
  }

  try {
    // fn returns raw data; runAction is the only thing that wraps.
    return { ok: true, data: await fn() };
  } catch (err) {
    // Validation: Zod owns the shape, runAction owns the translation.
    if (err instanceof ZodError) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input",
          fieldErrors: err.flatten().fieldErrors,
        },
      };
    }

    // AppError: logError owns level + context + stack. One call.
    if (err instanceof AppError) {
      logError(err);
      return {
        ok: false,
        error: { code: err.errorCode, message: err.message },
      };
    }

    // Unknown errors: same owner, same path.
    logError(err);
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Something went wrong" },
    };
  }
}

await runAction(async () => 42); // { ok: true, data: 42 }
await runAction(async () => {
  throw AppError.notFound();
}); // { ok: false, error: { code: "NOT_FOUND" } }