/**
 * Full-coverage tests using anchor-bankrun for clock manipulation and account injection.
 */
import * as anchor from "@coral-xyz/anchor";
import { Program, BorshAccountsCoder } from "@coral-xyz/anchor";
import { BankrunProvider, startAnchor } from "anchor-bankrun";
import { Clock, ProgramTestContext } from "solana-bankrun";
import { Quorum } from "../target/types/quorum";
import {
  PublicKey,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { expect } from "chai";
import BN from "bn.js";

const IDL = require("../target/idl/quorum.json");

// ── Seeds ─────────────────────────────────────────────────────────────────
const PLATFORM_SEED  = Buffer.from("platform");
const PROJECT_SEED   = Buffer.from("project");
const VAULT_SEED     = Buffer.from("vault");
const VOTE_SEED      = Buffer.from("vote");
const CONTRIB_SEED   = Buffer.from("contribution");

// ── Time constants ─────────────────────────────────────────────────────────
const DAY            = 86_400n;
const ORIGIN         = 1_000_000n;

// ── Program constants ──────────────────────────────────────────────────────
const PYTH_FEED      = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix");
const SOL_PRICE_USD  = 150;
const SOL_PRICE_RAW  = BigInt(SOL_PRICE_USD * 1e8);
const MIN_RAISE      = new BN("666666667000");

// ── Pyth mock helpers ──────────────────────────────────────────────────────
function makePythData(ts: bigint): Uint8Array {
  const buf = Buffer.alloc(3312, 0);
  buf.writeUInt32LE(0xa1b2c3d4, 0);
  buf.writeUInt32LE(2, 4);
  buf.writeUInt32LE(3, 8);
  buf.writeUInt32LE(3312, 12);
  buf.writeInt32LE(-8, 20);
  buf.writeBigInt64LE(ts - 30n, 96);
  buf.writeBigInt64LE(SOL_PRICE_RAW, 208);
  buf.writeBigUInt64LE(100_000_000n, 216);
  buf.writeUInt32LE(1, 224);
  return buf;
}

function fundAccount(ctx: ProgramTestContext, pubkey: PublicKey, lamports = 20 * LAMPORTS_PER_SOL) {
  ctx.setAccount(pubkey, {
    lamports, data: new Uint8Array(0),
    owner: SystemProgram.programId, executable: false,
  });
}

function setTime(ctx: ProgramTestContext, ts: bigint) {
  ctx.setClock(new Clock(1000n, 0n, 0n, 1n, ts));
}

function setPyth(ctx: ProgramTestContext, ts: bigint) {
  ctx.setAccount(PYTH_FEED, {
    lamports: LAMPORTS_PER_SOL, data: makePythData(ts),
    owner: SystemProgram.programId, executable: false,
  });
}

// ── Vault injection helper ─────────────────────────────────────────────────
function makeVaultData(projectPubkey: PublicKey, totalReceived: bigint, vaultBump: number): Buffer {
  const buf = Buffer.alloc(57, 0);
  [230, 251, 241, 83, 139, 202, 93, 28].forEach((b, i) => buf.writeUInt8(b, i));
  projectPubkey.toBuffer().copy(buf, 8);
  buf.writeBigUInt64LE(totalReceived, 40);
  buf.writeBigUInt64LE(0n, 48);
  buf.writeUInt8(vaultBump, 56);
  return buf;
}

// ── Shared keypairs ────────────────────────────────────────────────────────
const platformAuth = Keypair.generate();
const dev          = Keypair.generate();
const voter1       = Keypair.generate();
const contributor1 = Keypair.generate();
const contributor2 = Keypair.generate();
const treasury     = Keypair.generate();

// ══════════════════════════════════════════════════════════════════════════
// BLOCK 1: Failure path — timing, contribute, inactivity, finalize, refund
// ══════════════════════════════════════════════════════════════════════════
describe("quorum bankrun — failure lifecycle", () => {
  let ctx: ProgramTestContext;
  let provider: BankrunProvider;
  let program: Program<Quorum>;

  let platformPda: PublicKey;
  let project0Pda: PublicKey;
  let vault0Pda: PublicKey;
  let tokenMint0: Keypair;

  before(async () => {
    ctx = await startAnchor(".", [], []);
    provider = new BankrunProvider(ctx);
    anchor.setProvider(provider as any);
    program = new anchor.Program(IDL, provider) as Program<Quorum>;

    for (const kp of [platformAuth, dev, voter1, contributor1, contributor2, treasury]) {
      fundAccount(ctx, kp.publicKey, 50 * LAMPORTS_PER_SOL);
    }
    setTime(ctx, ORIGIN);
    setPyth(ctx, ORIGIN);

    [platformPda] = PublicKey.findProgramAddressSync([PLATFORM_SEED], program.programId);
    tokenMint0 = Keypair.generate();
    [project0Pda] = PublicKey.findProgramAddressSync(
      [PROJECT_SEED, new BN(0).toArrayLike(Buffer, "le", 8)], program.programId
    );
    [vault0Pda] = PublicKey.findProgramAddressSync(
      [VAULT_SEED, new BN(0).toArrayLike(Buffer, "le", 8)], program.programId
    );

    await program.methods.initializePlatform()
      .accounts({ platform: platformPda, authority: platformAuth.publicKey,
        treasury: treasury.publicKey, systemProgram: SystemProgram.programId } as any)
      .signers([platformAuth]).rpc();

    await program.methods.createProject({
      name: "Test Project", ticker: "TST", description: "Full lifecycle test",
      websiteUrl: "https://test.com", raiseGoal: MIN_RAISE,
    }).accounts({
      platform: platformPda, project: project0Pda, vault: vault0Pda,
      tokenMint: tokenMint0.publicKey, dev: dev.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    } as any).signers([dev, tokenMint0]).rpc();

    const [votePda] = PublicKey.findProgramAddressSync(
      [VOTE_SEED, new BN(0).toArrayLike(Buffer, "le", 8), voter1.publicKey.toBuffer()],
      program.programId
    );
    await program.methods.castSocialVote()
      .accounts({ project: project0Pda, socialVote: votePda,
        voter: voter1.publicKey, systemProgram: SystemProgram.programId } as any)
      .signers([voter1]).rpc();
  });

  describe("open_economic_phase timing", () => {
    it("fails before day 15", async () => {
      setTime(ctx, ORIGIN + 14n * DAY);
      try {
        await program.methods.openEconomicPhase()
          .accounts({ project: project0Pda, caller: platformAuth.publicKey } as any)
          .signers([platformAuth]).rpc();
        expect.fail("Should have failed");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("EconomicPhaseNotActive");
      }
    });

    it("succeeds at day 15", async () => {
      setTime(ctx, ORIGIN + 15n * DAY);
      await program.methods.openEconomicPhase()
        .accounts({ project: project0Pda, caller: platformAuth.publicKey } as any)
        .signers([platformAuth]).rpc();
      const project = await program.account.project.fetch(project0Pda);
      expect(project.economicPhaseActive).to.be.true;
    });
  });

  describe("contribute", () => {
    before(() => {
      setTime(ctx, ORIGIN + 16n * DAY);
      setPyth(ctx, ORIGIN + 16n * DAY);
    });

    it("happy path: minimum valid contribution", async () => {
      const [c1Pda] = PublicKey.findProgramAddressSync(
        [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contributor1.publicKey.toBuffer()],
        program.programId
      );
      await program.methods.contribute(new BN(10_000_000))
        .accounts({ platform: platformPda, project: project0Pda, contribution: c1Pda,
          vault: vault0Pda, treasury: treasury.publicKey, contributor: contributor1.publicKey,
          priceFeed: PYTH_FEED, systemProgram: SystemProgram.programId } as any)
        .signers([contributor1]).rpc();
      const contrib = await program.account.contribution.fetch(c1Pda);
      expect(contrib.amountLamports.toNumber()).to.be.greaterThan(0);
    });

    it("fails when contribution is below $1 minimum", async () => {
      const [c1Pda] = PublicKey.findProgramAddressSync(
        [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contributor1.publicKey.toBuffer()],
        program.programId
      );
      try {
        await program.methods.contribute(new BN(1000))
          .accounts({ platform: platformPda, project: project0Pda, contribution: c1Pda,
            vault: vault0Pda, treasury: treasury.publicKey, contributor: contributor1.publicKey,
            priceFeed: PYTH_FEED, systemProgram: SystemProgram.programId } as any)
          .signers([contributor1]).rpc();
        expect.fail();
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("ContributionTooLow");
      }
    });

    it("contributes up to 0.1% cap", async () => {
      const [c2Pda] = PublicKey.findProgramAddressSync(
        [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contributor2.publicKey.toBuffer()],
        program.programId
      );
      await program.methods.contribute(new BN(600_000_000))
        .accounts({ platform: platformPda, project: project0Pda, contribution: c2Pda,
          vault: vault0Pda, treasury: treasury.publicKey, contributor: contributor2.publicKey,
          priceFeed: PYTH_FEED, systemProgram: SystemProgram.programId } as any)
        .signers([contributor2]).rpc();
      const contrib = await program.account.contribution.fetch(c2Pda);
      expect(contrib.tokensAllocated.toNumber()).to.be.greaterThan(0);
    });

    it("fails when exceeding the 0.1% holder cap", async () => {
      const [c2Pda] = PublicKey.findProgramAddressSync(
        [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contributor2.publicKey.toBuffer()],
        program.programId
      );
      try {
        await program.methods.contribute(new BN(600_000_000))
          .accounts({ platform: platformPda, project: project0Pda, contribution: c2Pda,
            vault: vault0Pda, treasury: treasury.publicKey, contributor: contributor2.publicKey,
            priceFeed: PYTH_FEED, systemProgram: SystemProgram.programId } as any)
          .signers([contributor2]).rpc();
        expect.fail();
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("ExceedsHolderLimit");
      }
    });
  });

  describe("close_social_phase timing", () => {
    it("fails before day 30", async () => {
      setTime(ctx, ORIGIN + 29n * DAY);
      try {
        await program.methods.closeSocialPhase()
          .accounts({ project: project0Pda, caller: platformAuth.publicKey } as any)
          .signers([platformAuth]).rpc();
        expect.fail();
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("SocialVoteNotEnded");
      }
    });

    it("succeeds after day 30 — transitions to EconomicPhase", async () => {
      setTime(ctx, ORIGIN + 30n * DAY + 1n);
      await program.methods.closeSocialPhase()
        .accounts({ project: project0Pda, caller: platformAuth.publicKey } as any)
        .signers([platformAuth]).rpc();
      const project = await program.account.project.fetch(project0Pda);
      expect(project.state).to.deep.equal({ economicPhase: {} });
    });
  });

  describe("register_dev_activity + trigger_inactivity", () => {
    it("register_dev_activity fails for non-dev caller", async () => {
      setTime(ctx, ORIGIN + 31n * DAY);
      try {
        await program.methods.registerDevActivity()
          .accounts({ project: project0Pda, dev: voter1.publicKey } as any)
          .signers([voter1]).rpc();
        expect.fail();
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("UnauthorizedActivityUpdate");
      }
    });

    it("register_dev_activity succeeds for dev", async () => {
      setTime(ctx, ORIGIN + 31n * DAY);
      await program.methods.registerDevActivity()
        .accounts({ project: project0Pda, dev: dev.publicKey } as any)
        .signers([dev]).rpc();
      const project = await program.account.project.fetch(project0Pda);
      expect(project.lastDevActivity.toNumber()).to.be.greaterThan(Number(ORIGIN + 30n * DAY));
    });

    it("trigger_inactivity fails before 60-day threshold", async () => {
      setTime(ctx, ORIGIN + 61n * DAY);
      try {
        await program.methods.triggerInactivity()
          .accounts({ project: project0Pda, caller: voter1.publicKey } as any)
          .signers([voter1]).rpc();
        expect.fail();
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.satisfy((m: string) =>
          m.includes("InvalidProjectState") || m.includes("6023")
        );
      }
    });

    it("trigger_inactivity succeeds at 60+ days since last activity", async () => {
      setTime(ctx, ORIGIN + 92n * DAY);
      // use platformAuth to avoid duplicate-tx rejection in bankrun (same nonce as voter1's prior failed tx)
      await program.methods.triggerInactivity()
        .accounts({ project: project0Pda, caller: platformAuth.publicKey } as any)
        .signers([platformAuth]).rpc();
      const project = await program.account.project.fetch(project0Pda);
      expect(project.devLocked).to.be.true;
    });
  });

  describe("finalize_funding — Day 284 auto-fail", () => {
    it("fails before vesting_end", async () => {
      setTime(ctx, ORIGIN + 284n * DAY);
      try {
        await program.methods.finalizeFunding()
          .accounts({ project: project0Pda, caller: platformAuth.publicKey } as any)
          .signers([platformAuth]).rpc();
        expect.fail();
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("EconomicPhaseNotEnded");
      }
    });

    it("marks project Failed after vesting_end (graduation window expired)", async () => {
      setTime(ctx, ORIGIN + 286n * DAY);
      // use voter1 to avoid duplicate-tx rejection (platformAuth already sent the failed tx above)
      await program.methods.finalizeFunding()
        .accounts({ project: project0Pda, caller: voter1.publicKey } as any)
        .signers([voter1]).rpc();
      const project = await program.account.project.fetch(project0Pda);
      expect(project.state).to.deep.equal({ failed: {} });
    });
  });

  describe("refund", () => {
    it("happy path: refunds contributor after project fails", async () => {
      const [c1Pda] = PublicKey.findProgramAddressSync(
        [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contributor1.publicKey.toBuffer()],
        program.programId
      );
      const before = (await ctx.banksClient.getAccount(contributor1.publicKey))!.lamports;
      await program.methods.refund()
        .accounts({ project: project0Pda, contribution: c1Pda, vault: vault0Pda,
          contributor: contributor1.publicKey, systemProgram: SystemProgram.programId } as any)
        .signers([contributor1]).rpc();
      const contrib = await program.account.contribution.fetch(c1Pda);
      expect(contrib.refunded).to.be.true;
      const after = (await ctx.banksClient.getAccount(contributor1.publicKey))!.lamports;
      expect(after).to.be.greaterThan(before);
    });

    it("prevents double-refund", async () => {
      const [c1Pda] = PublicKey.findProgramAddressSync(
        [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contributor1.publicKey.toBuffer()],
        program.programId
      );
      try {
        await program.methods.refund()
          .accounts({ project: project0Pda, contribution: c1Pda, vault: vault0Pda,
            contributor: contributor1.publicKey, systemProgram: SystemProgram.programId } as any)
          .signers([contributor1]).rpc();
        expect.fail();
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("NothingToRefund");
      }
    });
  });

  describe("close_vault", () => {
    it("fails if contributor2 not refunded yet", async () => {
      try {
        await program.methods.closeVault()
          .accounts({ project: project0Pda, vault: vault0Pda, caller: platformAuth.publicKey } as any)
          .signers([platformAuth]).rpc();
        expect.fail();
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("VaultNotFullyRefunded");
      }
    });

    it("succeeds after all contributors are refunded", async () => {
      const [c2Pda] = PublicKey.findProgramAddressSync(
        [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contributor2.publicKey.toBuffer()],
        program.programId
      );
      await program.methods.refund()
        .accounts({ project: project0Pda, contribution: c2Pda, vault: vault0Pda,
          contributor: contributor2.publicKey, systemProgram: SystemProgram.programId } as any)
        .signers([contributor2]).rpc();

      const before = (await ctx.banksClient.getAccount(platformAuth.publicKey))!.lamports;
      await program.methods.closeVault()
        .accounts({ project: project0Pda, vault: vault0Pda, caller: platformAuth.publicKey } as any)
        .signers([platformAuth]).rpc();
      expect(await ctx.banksClient.getAccount(vault0Pda)).to.be.null;
      const after = (await ctx.banksClient.getAccount(platformAuth.publicKey))!.lamports;
      expect(after).to.be.greaterThan(before);
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// BLOCK 2: graduate_project timing + conditions + claim_tokens
// ══════════════════════════════════════════════════════════════════════════
describe("quorum bankrun — graduate_project + claim_tokens", () => {
  let ctx: ProgramTestContext;
  let provider: BankrunProvider;
  let program: Program<Quorum>;

  let platformPda: PublicKey;
  let projPda: PublicKey;
  let projBump: number;
  let vaultPda: PublicKey;
  let vaultBump: number;
  let tokenMint: Keypair;
  let contribPda: PublicKey;

  const platformAuth2 = Keypair.generate();
  const dev2          = Keypair.generate();
  const treasury2     = Keypair.generate();
  const contrib_user  = Keypair.generate();

  async function injectGraduableProject(holderCount: number) {
    const realProject = await program.account.project.fetch(projPda);
    const coder = new BorshAccountsCoder(program.idl);
    const injectedData = await coder.encode("project", {
      dev: realProject.dev, tokenMint: realProject.tokenMint,
      projectId: realProject.projectId, name: realProject.name,
      ticker: realProject.ticker, description: realProject.description,
      websiteUrl: realProject.websiteUrl, state: { economicPhase: {} },
      socialVoteStart: realProject.socialVoteStart, socialVotes: realProject.socialVotes,
      economicPhaseActive: true, economicPhaseOpen: realProject.economicPhaseOpen,
      raiseGoal: realProject.raiseGoal,
      totalRaised: new BN("700000000000"),
      holderCount: new BN(holderCount),
      platformFeePaid: realProject.platformFeePaid,
      healthCheck1Emitted: false, healthCheck2Emitted: false,
      holdersGoalEmitted: false, raiseGoalEmitted: false, graduationAvailableEmitted: false,
      vestingStart: new BN(Number(ORIGIN + 15n * DAY)),
      vestingEnd: new BN(Number(ORIGIN + 285n * DAY)),
      lastDevActivity: realProject.lastDevActivity, devLocked: false, bump: projBump,
    });
    const acct = await ctx.banksClient.getAccount(projPda);
    ctx.setAccount(projPda, {
      lamports: acct!.lamports, data: injectedData,
      owner: program.programId, executable: false,
    });

    // Inject vault with enough SOL
    const vaultAcct = await ctx.banksClient.getAccount(vaultPda);
    const vaultData = makeVaultData(projPda, 700_000_000_000n, vaultBump);
    ctx.setAccount(vaultPda, {
      lamports: vaultAcct!.lamports + 700_000_000_000,
      data: vaultData, owner: program.programId, executable: false,
    });
  }

  before(async () => {
    ctx = await startAnchor(".", [], []);
    provider = new BankrunProvider(ctx);
    anchor.setProvider(provider as any);
    program = new anchor.Program(IDL, provider) as Program<Quorum>;

    for (const kp of [platformAuth2, dev2, treasury2, contrib_user]) {
      fundAccount(ctx, kp.publicKey, 50 * LAMPORTS_PER_SOL);
    }
    setTime(ctx, ORIGIN);
    setPyth(ctx, ORIGIN);

    [platformPda] = PublicKey.findProgramAddressSync([PLATFORM_SEED], program.programId);
    tokenMint = Keypair.generate();
    [projPda, projBump] = PublicKey.findProgramAddressSync(
      [PROJECT_SEED, new BN(0).toArrayLike(Buffer, "le", 8)], program.programId
    );
    [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
      [VAULT_SEED, new BN(0).toArrayLike(Buffer, "le", 8)], program.programId
    );
    [contribPda] = PublicKey.findProgramAddressSync(
      [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contrib_user.publicKey.toBuffer()],
      program.programId
    );

    await program.methods.initializePlatform()
      .accounts({ platform: platformPda, authority: platformAuth2.publicKey,
        treasury: treasury2.publicKey, systemProgram: SystemProgram.programId } as any)
      .signers([platformAuth2]).rpc();

    await program.methods.createProject({
      name: "Grad Project", ticker: "GRAD", description: "Test",
      websiteUrl: "https://grad.com", raiseGoal: MIN_RAISE,
    }).accounts({
      platform: platformPda, project: projPda, vault: vaultPda,
      tokenMint: tokenMint.publicKey, dev: dev2.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    } as any).signers([dev2, tokenMint]).rpc();

    setTime(ctx, ORIGIN + 15n * DAY);
    await program.methods.openEconomicPhase()
      .accounts({ project: projPda, caller: platformAuth2.publicKey } as any)
      .signers([platformAuth2]).rpc();

    setPyth(ctx, ORIGIN + 15n * DAY);
    await program.methods.contribute(new BN(300_000_000))
      .accounts({ platform: platformPda, project: projPda, contribution: contribPda,
        vault: vaultPda, treasury: treasury2.publicKey, contributor: contrib_user.publicKey,
        priceFeed: PYTH_FEED, systemProgram: SystemProgram.programId } as any)
      .signers([contrib_user]).rpc();

    setTime(ctx, ORIGIN + 31n * DAY);
    await program.methods.closeSocialPhase()
      .accounts({ project: projPda, caller: platformAuth2.publicKey } as any)
      .signers([platformAuth2]).rpc();

    await injectGraduableProject(1000);
  });

  describe("graduate_project timing", () => {
    it("fails before Day 180 from vesting_start (even with 1000 holders)", async () => {
      // vesting_start = ORIGIN+15d; Day 180 from it = ORIGIN+195d; Day 179 = ORIGIN+194d
      setTime(ctx, ORIGIN + 194n * DAY);
      setPyth(ctx, ORIGIN + 194n * DAY);
      try {
        await program.methods.graduateProject()
          .accounts({ project: projPda, vault: vaultPda,
            priceFeed: PYTH_FEED, caller: platformAuth2.publicKey } as any)
          .signers([platformAuth2]).rpc();
        expect.fail("Should fail: before Day 180");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("GraduationNotAvailableYet");
      }
    });

    it("succeeds at exactly Day 180 from vesting_start", async () => {
      setTime(ctx, ORIGIN + 195n * DAY);
      setPyth(ctx, ORIGIN + 195n * DAY);
      await program.methods.graduateProject()
        .accounts({ project: projPda, vault: vaultPda,
          priceFeed: PYTH_FEED, caller: platformAuth2.publicKey } as any)
        .signers([platformAuth2]).rpc();
      const project = await program.account.project.fetch(projPda);
      expect(project.state).to.deep.equal({ graduated: {} });
      console.log("   project graduated at Day 195 (Day 180 from vesting_start) ✓");
    });
  });

  describe("graduate_project conditions — fresh project2", () => {
    let proj2Pda: PublicKey;
    let proj2Bump: number;
    let vault2Pda: PublicKey;
    let vault2Bump: number;
    let tokenMint2: Keypair;

    before(async () => {
      const platform = await program.account.platform.fetch(platformPda);
      const projId = platform.totalProjects;
      [proj2Pda, proj2Bump] = PublicKey.findProgramAddressSync(
        [PROJECT_SEED, projId.toArrayLike(Buffer, "le", 8)], program.programId
      );
      [vault2Pda, vault2Bump] = PublicKey.findProgramAddressSync(
        [VAULT_SEED, projId.toArrayLike(Buffer, "le", 8)], program.programId
      );
      tokenMint2 = Keypair.generate();

      // Create project — this initializes the PDAs. State injection handles the rest.
      // (We skip openEconomicPhase/closeSocialPhase because the clock is already at Day 195
      //  from the prior test, so Day 15 from NOW would be Day 210 — too far ahead.)
      await program.methods.createProject({
        name: "Cond Test", ticker: "CDT", description: "Cond test",
        websiteUrl: "https://cdt.com", raiseGoal: MIN_RAISE,
      }).accounts({ platform: platformPda, project: proj2Pda, vault: vault2Pda,
        tokenMint: tokenMint2.publicKey, dev: dev2.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID, systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY } as any)
        .signers([dev2, tokenMint2]).rpc();
    });

    async function injectProj2(holderCount: number, totalReceived: bigint, vestingEndOffset: bigint) {
      const realProject = await program.account.project.fetch(proj2Pda);
      const coder = new BorshAccountsCoder(program.idl);
      const data = await coder.encode("project", {
        dev: realProject.dev, tokenMint: realProject.tokenMint,
        projectId: realProject.projectId, name: realProject.name,
        ticker: realProject.ticker, description: realProject.description,
        websiteUrl: realProject.websiteUrl, state: { economicPhase: {} },
        socialVoteStart: realProject.socialVoteStart, socialVotes: realProject.socialVotes,
        economicPhaseActive: true, economicPhaseOpen: realProject.economicPhaseOpen,
        raiseGoal: realProject.raiseGoal,
        totalRaised: new BN(totalReceived.toString()),
        holderCount: new BN(holderCount),
        platformFeePaid: realProject.platformFeePaid,
        healthCheck1Emitted: false, healthCheck2Emitted: false,
        holdersGoalEmitted: false, raiseGoalEmitted: false, graduationAvailableEmitted: false,
        vestingStart: new BN(Number(ORIGIN + 15n * DAY)),
        vestingEnd: new BN(Number(ORIGIN + vestingEndOffset)),
        lastDevActivity: realProject.lastDevActivity, devLocked: false, bump: proj2Bump,
      });
      const acct = await ctx.banksClient.getAccount(proj2Pda);
      ctx.setAccount(proj2Pda, { lamports: acct!.lamports, data, owner: program.programId, executable: false });

      const vaultAcct = await ctx.banksClient.getAccount(vault2Pda);
      ctx.setAccount(vault2Pda, {
        lamports: vaultAcct!.lamports + Number(totalReceived),
        data: makeVaultData(proj2Pda, totalReceived, vault2Bump),
        owner: program.programId, executable: false,
      });
    }

    it("fails when holder_count < 1000 (conditions not met)", async () => {
      await injectProj2(500, 700_000_000_000n, 285n * DAY);
      setTime(ctx, ORIGIN + 200n * DAY);
      setPyth(ctx, ORIGIN + 200n * DAY);
      try {
        await program.methods.graduateProject()
          .accounts({ project: proj2Pda, vault: vault2Pda,
            priceFeed: PYTH_FEED, caller: platformAuth2.publicKey } as any)
          .signers([platformAuth2]).rpc();
        expect.fail("Should fail: not enough holders");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("GraduationNotAvailableYet");
      }
    });

    it("fails after Day 284 even with full conditions (window expired)", async () => {
      await injectProj2(1000, 700_000_000_000n, 285n * DAY);
      setTime(ctx, ORIGIN + 286n * DAY);
      setPyth(ctx, ORIGIN + 286n * DAY);
      try {
        await program.methods.graduateProject()
          .accounts({ project: proj2Pda, vault: vault2Pda,
            priceFeed: PYTH_FEED, caller: platformAuth2.publicKey } as any)
          .signers([platformAuth2]).rpc();
        expect.fail("Should fail: window expired");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("GraduationWindowExpired");
      }
    });

    it("finalize_funding auto-fails proj2 after Day 284 (never graduated)", async () => {
      setTime(ctx, ORIGIN + 287n * DAY);
      await program.methods.finalizeFunding()
        .accounts({ project: proj2Pda, caller: platformAuth2.publicKey } as any)
        .signers([platformAuth2]).rpc();
      const project = await program.account.project.fetch(proj2Pda);
      expect(project.state).to.deep.equal({ failed: {} });
      console.log("   finalize_funding auto-failed proj2 ✓");
    });
  });

  describe("claim_tokens (projPda = Graduated)", () => {
    it("contributor claims tokens after graduation", async () => {
      const contrib = await program.account.contribution.fetch(contribPda);
      expect(contrib.claimed).to.be.false;
      expect(contrib.tokensAllocated.toNumber()).to.be.greaterThan(0);

      const ata = anchor.utils.token.associatedAddress({
        mint: tokenMint.publicKey, owner: contrib_user.publicKey,
      });
      await program.methods.claimTokens()
        .accounts({ project: projPda, contribution: contribPda,
          tokenMint: tokenMint.publicKey, contributorTokenAccount: ata,
          contributor: contrib_user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId } as any)
        .signers([contrib_user]).rpc();
      const contribAfter = await program.account.contribution.fetch(contribPda);
      expect(contribAfter.claimed).to.be.true;
      console.log("   tokens claimed:", contrib.tokensAllocated.toString());
    });

    it("prevents double-claim", async () => {
      const ata = anchor.utils.token.associatedAddress({
        mint: tokenMint.publicKey, owner: contrib_user.publicKey,
      });
      try {
        await program.methods.claimTokens()
          .accounts({ project: projPda, contribution: contribPda,
            tokenMint: tokenMint.publicKey, contributorTokenAccount: ata,
            contributor: contrib_user.publicKey, tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId } as any)
          .signers([contrib_user]).rpc();
        expect.fail();
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("VestingAlreadyClaimed");
      }
    });
  });
});
