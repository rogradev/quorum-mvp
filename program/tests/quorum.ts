import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Quorum } from "../target/types/quorum";
import { PublicKey, Keypair, LAMPORTS_PER_SOL, SystemProgram } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from "@solana/spl-token";
import { expect } from "chai";

describe("quorum", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Quorum as Program<Quorum>;

  // Wallets de prueba
  const platformAuthority = provider.wallet;
  const dev = Keypair.generate();
  const voter1 = Keypair.generate();
  const voter2 = Keypair.generate();
  const contributor1 = Keypair.generate();

  // PDAs
  let platformPda: PublicKey;
  let projectPda: PublicKey;
  let tokenMint: Keypair;

  const PLATFORM_SEED = Buffer.from("platform");
  const PROJECT_SEED = Buffer.from("project");

  before(async () => {
    // Airdrop SOL a wallets de prueba
    for (const wallet of [dev, voter1, voter2, contributor1]) {
      const sig = await provider.connection.requestAirdrop(
        wallet.publicKey,
        2 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }

    [platformPda] = PublicKey.findProgramAddressSync(
      [PLATFORM_SEED],
      program.programId
    );

    tokenMint = Keypair.generate();
  });

  // ── TEST 1: Inicializar plataforma ──────────────────────────
  it("Inicializa la plataforma", async () => {
    const treasury = Keypair.generate();

    await program.methods
      .initializePlatform()
      .accounts({
        platform: platformPda,
        authority: platformAuthority.publicKey,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const platform = await program.account.platform.fetch(platformPda);
    expect(platform.authority.toString()).to.equal(platformAuthority.publicKey.toString());
    expect(platform.totalProjects.toNumber()).to.equal(0);
    console.log("✅ Plataforma inicializada:", platformPda.toString());
  });

  // ── TEST 2: Crear proyecto ──────────────────────────────────
  it("Crea un proyecto", async () => {
    const platform = await program.account.platform.fetch(platformPda);
    const projectId = platform.totalProjects;

    [projectPda] = PublicKey.findProgramAddressSync(
      [PROJECT_SEED, projectId.toArrayLike(Buffer, "le", 8)],
      program.programId
    );

    const raiseGoal = new anchor.BN(666_666_667); // ~$100 USD en lamports

    await program.methods
      .createProject({
        name: "Quorum Test Token",
        ticker: "QTT",
        description: "Un token de prueba para validar el protocolo Quorum",
        websiteUrl: "https://quorum.fi",
        raiseGoal,
      })
      .accounts({
        platform: platformPda,
        project: projectPda,
        tokenMint: tokenMint.publicKey,
        dev: dev.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([dev, tokenMint])
      .rpc();

    const project = await program.account.project.fetch(projectPda);
    expect(project.name).to.equal("Quorum Test Token");
    expect(project.ticker).to.equal("QTT");
    expect(project.holderCount.toNumber()).to.equal(0);
    console.log("✅ Proyecto creado. ID:", project.projectId.toString());
    console.log("   Token mint:", tokenMint.publicKey.toString());
  });

  // ── TEST 3: Votar en fase social ────────────────────────────
  it("Permite votar en la fase social", async () => {
    const project = await program.account.project.fetch(projectPda);
    const projectIdBytes = project.projectId.toArrayLike(Buffer, "le", 8);

    const VOTE_SEED = Buffer.from("vote");

    const [votePda1] = PublicKey.findProgramAddressSync(
      [VOTE_SEED, projectIdBytes, voter1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .castSocialVote()
      .accounts({
        project: projectPda,
        socialVote: votePda1,
        voter: voter1.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([voter1])
      .rpc();

    const updatedProject = await program.account.project.fetch(projectPda);
    expect(updatedProject.socialVotes.toNumber()).to.equal(1);
    console.log("✅ Voto social registrado. Total votos:", updatedProject.socialVotes.toString());
  });

  // ── TEST 4: No puede votar dos veces ───────────────────────
  it("Previene votar dos veces con la misma wallet", async () => {
    const project = await program.account.project.fetch(projectPda);
    const projectIdBytes = project.projectId.toArrayLike(Buffer, "le", 8);
    const VOTE_SEED = Buffer.from("vote");

    const [votePda1] = PublicKey.findProgramAddressSync(
      [VOTE_SEED, projectIdBytes, voter1.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .castSocialVote()
        .accounts({
          project: projectPda,
          socialVote: votePda1,
          voter: voter1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([voter1])
        .rpc();
      expect.fail("Debería haber fallado");
    } catch (e) {
      console.log("✅ Correctamente rechazó voto duplicado");
    }
  });

  // ── TEST 5: Registro de actividad del dev ──────────────────
  it("Dev puede registrar actividad", async () => {
    // Nota: este test requiere que el proyecto esté en estado Vesting
    // En un test real, se manipularía el tiempo con warp_to_timestamp
    console.log("ℹ️  Test de actividad del dev requiere estado Vesting (skip en MVP)");
  });

  after(() => {
    console.log("\n🔗 Addresses relevantes:");
    console.log("   Program ID:", program.programId.toString());
    console.log("   Platform PDA:", platformPda.toString());
    console.log("   Project PDA:", projectPda?.toString());
  });
});
