import { NextResponse } from "next/server";
import { Connection } from "@solana/web3.js";
import { prisma } from "@/lib/db";
import { makeReadonlyProgram, syncLatestProject, syncProject } from "@/lib/sync";
import { RPC_ENDPOINT } from "@/lib/constants";

const QUORUM_INSTRUCTIONS = [
  "CreateProject",
  "CastSocialVote",
  "Contribute",
  "GraduateProject",
  "FinalizeFunding",
  "Refund",
  "ClaimTokens",
];

// POST /api/webhook — Helius webhook for automatic on-chain event sync
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secretSet = !!process.env.HELIUS_WEBHOOK_SECRET;
  const authMatch = authHeader === process.env.HELIUS_WEBHOOK_SECRET;

  console.log("[webhook] incoming request", {
    secretEnvSet: secretSet,
    authHeaderPresent: !!authHeader,
    authMatch,
  });

  if (!authHeader || !authMatch) {
    console.error("[webhook] auth rejected — secretEnvSet:", secretSet, "authHeaderPresent:", !!authHeader, "match:", authMatch);
    return NextResponse.json({ error: "Unauthorized" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const transactions: any[] = Array.isArray(body) ? body : [body];

    console.log("[webhook] received", transactions.length, "transaction(s)");
    transactions.forEach((tx, i) => {
      const logs = extractLogs(tx);
      const accounts = extractAccounts(tx);
      const quorumLogs = logs.filter((l) => l.includes("Program log: Instruction:"));
      console.log(`[webhook] tx[${i}]`, {
        signature: tx.signature ?? tx.transaction?.signatures?.[0] ?? "unknown",
        hasError: !!(tx.transactionError),
        logCount: logs.length,
        accountCount: accounts.length,
        quorumLogs,
        payloadKeys: Object.keys(tx),
      });
    });

    const program = makeReadonlyProgram();
    const connection = new Connection(RPC_ENDPOINT, "confirmed");

    for (const tx of transactions) {
      // Skip failed transactions
      if (tx.transactionError !== null && tx.transactionError !== undefined) {
        continue;
      }

      const logs = extractLogs(tx);
      const accounts = extractAccounts(tx);

      // Check if this is a Quorum instruction at all
      const matchedInstruction = QUORUM_INSTRUCTIONS.find((ix) =>
        logs.some((log) => log.includes(`Instruction: ${ix}`))
      );

      // If no logs (e.g. enhanced webhook without log data), fall through to account matching
      const isQuorumTx =
        matchedInstruction !== undefined ||
        // When logs are absent, trust that Helius filtered to our program ID
        (logs.length === 0 && accounts.length > 0);

      if (!isQuorumTx) continue;

      // CreateProject — new project not yet in DB, sync the latest on-chain entry
      if (matchedInstruction === "CreateProject" || (!matchedInstruction && logs.length === 0)) {
        const isDefinitelyCreate = matchedInstruction === "CreateProject";

        if (isDefinitelyCreate) {
          await syncLatestProject(program, connection);
          continue;
        }
      }

      // For all other instructions, find the project PDA among the transaction accounts
      if (accounts.length > 0) {
        const projects = await prisma.project.findMany({
          where: { projectPda: { in: accounts } },
          select: { projectId: true },
        });

        for (const { projectId } of projects) {
          await syncProject(program, projectId);
        }

        // No matched project in DB yet → likely a CreateProject we couldn't detect from logs
        if (projects.length === 0) {
          await syncLatestProject(program, connection);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ── Payload extraction helpers ────────────────────────────────────────────────

function extractLogs(tx: any): string[] {
  // Raw Helius format: meta.logMessages
  if (Array.isArray(tx.meta?.logMessages)) return tx.meta.logMessages;
  // Some enhanced formats include top-level logs
  if (Array.isArray(tx.logs)) return tx.logs;
  return [];
}

function extractAccounts(tx: any): string[] {
  const seen = new Set<string>();

  const add = (val: unknown) => {
    if (typeof val === "string" && val.length >= 32) seen.add(val);
  };

  // Enhanced transaction: accountData[].account
  if (Array.isArray(tx.accountData)) {
    for (const ad of tx.accountData) add(ad.account);
  }

  // Enhanced transaction: instructions[].accounts (array of pubkey strings)
  if (Array.isArray(tx.instructions)) {
    for (const ix of tx.instructions) {
      if (Array.isArray(ix.accounts)) ix.accounts.forEach(add);
      if (Array.isArray(ix.innerInstructions)) {
        for (const inner of ix.innerInstructions) {
          if (Array.isArray(inner.accounts)) inner.accounts.forEach(add);
        }
      }
    }
  }

  // Raw transaction: transaction.message.accountKeys
  if (Array.isArray(tx.transaction?.message?.accountKeys)) {
    for (const key of tx.transaction.message.accountKeys) {
      add(typeof key === "string" ? key : key?.pubkey);
    }
  }

  return Array.from(seen);
}
