import "server-only";
import { z } from "zod";
import { clientSchema } from "./client";

// Define the server schema for environment variables
const serverSchema = z.object({
  // Server-only
  DATABASE_URL: z
    .string()
    .url()
    .refine(
      (v) => /^(postgres|postgresql|mysql|mongodb)(\+srv)?:\/\//.test(v),
      { message: "Unsupported database scheme" },
    ),

  // Runtime config
  NODE_ENV: z.enum(["development", "production", "test"]),
  APP_URL: z
    .string()
    .url()
    .refine((v) => v.startsWith("http://") || v.startsWith("https://"), {
      message: "APP_URL must use http or https",
    }),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]),
});

function validateServerConfig() {
  try {
    const serverConfig = serverSchema.parse(process.env);
    const clientConfig = clientSchema.parse(process.env);

    // server + client
    return { ...serverConfig, ...clientConfig };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Environment validation failed:", error.issues);
      if (process.env.NODE_ENV === "production") process.exit(1);
    }
    throw error;
  }
}

export const config = validateServerConfig();
export type ServerConfig = z.infer<typeof serverSchema>;
export type { ClientConfig } from "./client";
