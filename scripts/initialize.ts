/**
 * QUORUM PROTOCOL — Inicialización de Plataforma
 * 
 * Ejecutar UNA VEZ después del deploy:
 * cd quorum && npx ts-node scripts/initialize.ts
 */

import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey, SystemProgram, clusterApiUrl } from "@solana/web3.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

const PROGRAM_ID = new PublicKey("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");
const PLATFORM_SEED = Buffer.from("platform");

async function main() {
  console.log("🏗️  Inicializando Quorum Platform...\n");

  // Cargar wallet local
  const walletPath = path.join(os.homedir(), ".config", "solana", "id.json");
  if (!fs.existsSync(walletPath)) {
    throw new Error(`Wallet no encontrada en ${walletPath}. Ejecuta: solana-keygen new`);
  }

  const walletKeypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  console.log(`📍 Authority: ${walletKeypair.publicKey.toString()}`);

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // Cargar IDL compilado
  const idlPath = path.join(__dirname, "../program/target/idl/quorum.json");
  if (!fs.existsSync(idlPath)) {
    throw new Error(
      "IDL no encontrado. Ejecuta primero: cd program && anchor build"
    );
  }

  const idl = JSON.parse(fs.readFileSync(idlPath, "utf-8"));
  const program = new anchor.Program(idl, provider);

  // Derivar PDA de la plataforma
  const [platformPda, platformBump] = PublicKey.findProgramAddressSync(
    [PLATFORM_SEED],
    PROGRAM_ID
  );

  // Verificar si ya está inicializada
  try {
    const existing = await program.account["platform"].fetch(platformPda);
    console.log("⚠️  La plataforma ya está inicializada.");
    console.log(`   Authority: ${(existing as any).authority.toString()}`);
    console.log(`   Total projects: ${(existing as any).totalProjects.toString()}`);
    return;
  } catch {
    // No existe aún — continuar
  }

  // La treasury puede ser la misma wallet o una diferente
  // En producción, usar una wallet multisig
  const treasury = walletKeypair.publicKey;

  console.log(`📦 Platform PDA: ${platformPda.toString()}`);
  console.log(`💰 Treasury: ${treasury.toString()}`);

  const tx = await program.methods
    .initializePlatform()
    .accounts({
      platform: platformPda,
      authority: walletKeypair.publicKey,
      treasury,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log(`\n✅ Plataforma inicializada!`);
  console.log(`📋 TX: ${tx}`);
  console.log(`🌐 Explorer: https://explorer.solana.com/tx/${tx}?cluster=devnet`);

  // Guardar las addresses en un archivo de configuración
  const config = {
    programId: PROGRAM_ID.toString(),
    platformPda: platformPda.toString(),
    authority: walletKeypair.publicKey.toString(),
    treasury: treasury.toString(),
    cluster: "devnet",
    initializedAt: new Date().toISOString(),
  };

  const configPath = path.join(__dirname, "config.json");
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  console.log(`\n💾 Config guardado en ${configPath}`);
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
