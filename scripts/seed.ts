/**
 * QUORUM PROTOCOL — Seed de Datos de Prueba
 * 
 * Crea un proyecto de demo en devnet para probar el frontend.
 * cd quorum && npx ts-node scripts/seed.ts
 */

import * as anchor from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

async function main() {
  console.log("🌱 Creando datos de prueba en devnet...\n");

  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  const idlPath = path.join(__dirname, "../program/target/idl/quorum.json");
  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, provider);

  const [platformPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("platform")],
    PROGRAM_ID
  );

  // Obtener el siguiente project ID
  const platform = await program.account["platform"].fetch(platformPda);
  const projectId = (platform as any).totalProjects as anchor.BN;

  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(projectId.toString()));

  const [projectPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("project"), buf],
    PROGRAM_ID
  );

  const tokenMint = Keypair.generate();

  console.log(`📋 Creando proyecto de demo...`);
  console.log(`   Project ID: ${projectId.toString()}`);
  console.log(`   Token Mint: ${tokenMint.publicKey.toString()}`);

  const raiseGoal = new anchor.BN(1_000_000_000); // ~$150 USD a SOL $150

  const tx = await program.methods
    .createProject({
      name: "Quorum Demo Project",
      ticker: "QDEMO",
      description:
        "Proyecto de demostración del protocolo Quorum. Muestra cómo funciona la validación comunitaria en dos fases antes de fondear un token con intención real de largo plazo.",
      websiteUrl: "https://github.com/quorum-protocol",
      raiseGoal,
    })
    .accounts({
      platform: platformPda,
      project: projectPda,
      tokenMint: tokenMint.publicKey,
      dev: walletKeypair.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: new PublicKey("SysvarRent111111111111111111111111111111111"),
    })
    .signers([tokenMint])
    .rpc();

  console.log(`\n✅ Proyecto creado!`);
  console.log(`   TX: ${tx}`);
  console.log(
    `   Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`
  );
  console.log(`   Project PDA: ${projectPda.toString()}`);

  // Simular algunos votos sociales
  console.log("\n🗳️  Simulando votos sociales...");

  for (let i = 0; i < 3; i++) {
    const voter = Keypair.generate();

    // Airdrop al voter
    const sig = await connection.requestAirdrop(voter.publicKey, 0.1 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig);

    const [votePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), buf, voter.publicKey.toBuffer()],
      PROGRAM_ID
    );

    const voterProvider = new anchor.AnchorProvider(
      connection,
      new anchor.Wallet(voter),
      { commitment: "confirmed" }
    );
    const voterProgram = new anchor.Program(idl, voterProvider);

    await voterProgram.methods
      .castSocialVote()
      .accounts({
        project: projectPda,
        socialVote: votePda,
        voter: voter.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    process.stdout.write(".");
  }

  console.log("\n✅ Votos registrados!");
  console.log("\n🎉 Seed completado. Ahora ejecuta el sync:");
  console.log(
    `   curl -X POST http://localhost:3000/api/sync -H "Content-Type: application/json" -d '{"type":"create_project"}'`
  );
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
