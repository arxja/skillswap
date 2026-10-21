import { z } from "zod";

// Client-safe schema (safe to import in Client Components)
export const clientSchema = z.object({
  NEXT_PUBLIC_APP_NAME: z.string().default("My App"),
  NEXT_PUBLIC_API_URL: z.string().url().default("/api"),
});

const rawClientEnv = {
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
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
