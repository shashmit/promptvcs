import { db } from "../db";
import { metrics, promptVersions } from "../db/schema";

async function seedMetrics() {
  // Get all existing prompt versions
  const versions = await db.query.promptVersions.findMany({ limit: 20 });

  if (versions.length === 0) {
    console.log("No prompt versions found. Create some prompts first.");
    process.exit(0);
  }

  console.log(`Seeding metrics for ${versions.length} versions...`);

  const records = [];
  const now = Date.now();

  for (const version of versions) {
    // Generate 30 days of fake metrics
    for (let day = 29; day >= 0; day--) {
      const dailyCount = Math.floor(Math.random() * 20) + 5;
      for (let i = 0; i < dailyCount; i++) {
        const timestamp = new Date(now - day * 86400000 - Math.random() * 86400000);
        records.push({
          promptVersionId: version.id,
          latencyMs: Math.floor(Math.random() * 800) + 100,
          tokenCount: Math.floor(Math.random() * 500) + 50,
          promptTokens: Math.floor(Math.random() * 200) + 30,
          completionTokens: Math.floor(Math.random() * 300) + 20,
          rating: Math.random() > 0.3 ? (Math.floor(Math.random() * 3) + 3) : null,
          createdAt: timestamp,
        });
      }
    }
  }

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    await db.insert(metrics).values(records.slice(i, i + batchSize));
  }

  console.log(`Seeded ${records.length} metric records across ${versions.length} versions`);
  process.exit(0);
}

seedMetrics().catch(console.error);
