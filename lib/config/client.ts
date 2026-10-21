import { z } from "zod";

const normalizeEmptyString = (value: unknown) =>
  typeof value === "string" && value.trim() === "" ? undefined : value;

const isAbsoluteUrl = (value: string) => {
  try {
    const url = new URL(value);
    return url.protocol.length > 0;
  } catch {
    return false;
  }
};

// Client-safe schema (safe to import in Client Components)
export const clientSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.preprocess(
    normalizeEmptyString,
    z.string().default("My App"),
  ),
  NEXT_PUBLIC_API_URL: z.preprocess(
    normalizeEmptyString,
    z
      .string()
      .default("/api")
      .refine((value) => value.startsWith("/") || isAbsoluteUrl(value), {
        message:
          "NEXT_PUBLIC_API_URL must be a path beginning with '/' or a valid absolute URL",
      }),
  ),
});

const rawClientEnv = {
  NEXT_PUBLIC_APP_NAME: normalizeEmptyString(process.env.NEXT_PUBLIC_APP_NAME),
  NEXT_PUBLIC_API_URL: normalizeEmptyString(process.env.NEXT_PUBLIC_API_URL),
};

function validateClientConfig() {
  try {
    return clientSchema.parse(rawClientEnv);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:", error.issues);
      // process.exit doesn't exist in the browser — only exit on the server
      if (
        typeof window === "undefined" &&
        process.env.NODE_ENV === "production"
      ) {
        process.exit(1);
      }
    }
    throw error;
  }
}

export const config = validateClientConfig();
export type ClientConfig = z.infer<typeof clientSchema>;
