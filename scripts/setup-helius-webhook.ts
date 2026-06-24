/**
 * Registers a Helius webhook to watch the Quorum program on devnet.
 *
 * Usage:
 *   VERCEL_URL=your-app.vercel.app ts-node setup-helius-webhook.ts
 *
 * Required env vars (loaded from ../app/.env.local):
 *   HELIUS_API_KEY        — Helius API key
 *   HELIUS_WEBHOOK_SECRET — sent as Authorization header on each webhook call
 *   VERCEL_URL            — deployment host, e.g. quorum-mvp.vercel.app
 */

import * as fs from "fs";
import * as path from "path";

// Load .env.local from the Next.js app
const envPath = path.resolve(__dirname, "../app/.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_WEBHOOK_SECRET = process.env.HELIUS_WEBHOOK_SECRET;
const VERCEL_URL = process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL;

const PROGRAM_ID = "J9o5cuQAkeCWAfGsnE2qxRNAM1hbXCo7MTLxqyjecm1y";
const HELIUS_DEVNET_API = "https://api-devnet.helius.xyz/v0/webhooks";

async function listWebhooks(): Promise<any[]> {
  const res = await fetch(`${HELIUS_DEVNET_API}?api-key=${HELIUS_API_KEY}`);
  if (!res.ok) throw new Error(`List webhooks failed: ${await res.text()}`);
  return res.json();
}

async function deleteWebhook(webhookId: string): Promise<void> {
  const res = await fetch(
    `${HELIUS_DEVNET_API}/${webhookId}?api-key=${HELIUS_API_KEY}`,
    { method: "DELETE" }
  );
  if (!res.ok) throw new Error(`Delete webhook failed: ${await res.text()}`);
}

async function createWebhook(webhookUrl: string): Promise<any> {
  const res = await fetch(`${HELIUS_DEVNET_API}?api-key=${HELIUS_API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      webhookURL: webhookUrl,
      transactionTypes: ["ANY"],
      accountAddresses: [PROGRAM_ID],
      webhookType: "enhanced",
      authHeader: HELIUS_WEBHOOK_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Create webhook failed: ${await res.text()}`);
  return res.json();
}

async function main() {
  if (!HELIUS_API_KEY) {
    console.error("❌ HELIUS_API_KEY is not set");
    process.exit(1);
  }
  if (!HELIUS_WEBHOOK_SECRET) {
    console.error("❌ HELIUS_WEBHOOK_SECRET is not set");
    process.exit(1);
  }
  if (!VERCEL_URL) {
    console.error(
      "❌ VERCEL_URL is not set. Pass it as an env var:\n" +
        "   VERCEL_URL=your-app.vercel.app ts-node setup-helius-webhook.ts"
    );
    process.exit(1);
  }

  const webhookUrl = `https://${VERCEL_URL}/api/webhook`;
  console.log(`\n🔧 Quorum — Helius Webhook Setup (devnet)`);
  console.log(`   Program : ${PROGRAM_ID}`);
  console.log(`   Endpoint: ${webhookUrl}\n`);

  // Remove any existing webhooks pointing to /api/webhook to avoid duplicates
  console.log("📋 Checking existing webhooks...");
  const existing = await listWebhooks();
  const duplicates = existing.filter((w: any) =>
    w.webhookURL?.includes("/api/webhook")
  );
  for (const w of duplicates) {
    console.log(`   ⚠️  Removing existing webhook ${w.webhookId} → ${w.webhookURL}`);
    await deleteWebhook(w.webhookId);
  }

  console.log("📡 Registering new webhook...");
  const created = await createWebhook(webhookUrl);
  console.log("\n✅ Webhook registered successfully!");
  console.log(`   ID     : ${created.webhookId}`);
  console.log(`   URL    : ${created.webhookURL}`);
  console.log(`   Type   : ${created.webhookType}`);
  console.log(`   Txn    : ${created.transactionTypes?.join(", ")}`);
  console.log(`\nSave this webhook ID if you need to update it later:\n   ${created.webhookId}\n`);
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
