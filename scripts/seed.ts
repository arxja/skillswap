// CLI wrapper. Manages its own connection lifecycle.
import { connectDB, disconnectDB } from "@/lib/database/mongoose";
import { seedData, type SeedProfile } from "./seed/index";

const arg = process.argv.find((a) => a.startsWith("--profile="));
const raw = arg?.split("=")[1] ?? "dev";

if (raw !== "dev" && raw !== "demo") {
  console.error(`Invalid profile "${raw}". Use --profile=dev or --profile=demo.`);
  process.exit(1);
}

const profile: SeedProfile = raw;

(async () => {
  try {
    await connectDB();
    await seedData(profile);
    await disconnectDB();
    console.log(`✓ Seeded profile: ${profile}`);
    process.exit(0);
  } catch (err) {
    console.error("Seed failed:", err);
    process.exit(1);
  }
})();