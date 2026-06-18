/**
 * Full-coverage tests using anchor-bankrun for clock manipulation and account injection.
 * Covers all 11 instructions not already covered in quorum.ts.
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
const ORIGIN         = 1_000_000n;  // arbitrary base unix timestamp

// ── Program constants (mirrors constants.rs) ───────────────────────────────
const PYTH_FEED      = new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix");
const SOL_PRICE_USD  = 150;
const SOL_PRICE_RAW  = BigInt(SOL_PRICE_USD * 1e8);  // expo = -8
const MIN_RAISE      = new BN("666666667000");        // MIN_RAISE_LAMPORTS

// ── Pyth mock helpers ──────────────────────────────────────────────────────
function makePythData(ts: bigint): Uint8Array {
  const buf = Buffer.alloc(3312, 0);
  buf.writeUInt32LE(0xa1b2c3d4, 0);     // magic
  buf.writeUInt32LE(2, 4);               // ver = VERSION_2
  buf.writeUInt32LE(3, 8);               // atype = Price (3)
  buf.writeUInt32LE(3312, 12);           // size
  buf.writeInt32LE(-8, 20);              // expo = -8
  buf.writeBigInt64LE(ts - 30n, 96);    // timestamp = current - 30s
  buf.writeBigInt64LE(SOL_PRICE_RAW, 208); // agg.price
  buf.writeBigUInt64LE(100_000_000n, 216); // agg.conf
  buf.writeUInt32LE(1, 224);             // agg.status = Trading
  return buf;
}

function fundAccount(
  ctx: ProgramTestContext,
  pubkey: PublicKey,
  lamports = 20 * LAMPORTS_PER_SOL
) {
  ctx.setAccount(pubkey, {
    lamports,
    data: new Uint8Array(0),
    owner: SystemProgram.programId,
    executable: false,
  });
}

function setTime(ctx: ProgramTestContext, ts: bigint) {
  ctx.setClock(new Clock(1000n, 0n, 0n, 1n, ts));
}

function setPyth(ctx: ProgramTestContext, ts: bigint) {
  ctx.setAccount(PYTH_FEED, {
    lamports: LAMPORTS_PER_SOL,
    data: makePythData(ts),
    owner: SystemProgram.programId,
    executable: false,
  });
}

// ── Shared keypairs (re-used across both describe blocks) ──────────────────
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

    // Fund all test keypairs
    for (const kp of [platformAuth, dev, voter1, contributor1, contributor2, treasury]) {
      fundAccount(ctx, kp.publicKey, 50 * LAMPORTS_PER_SOL);
    }

    // Set clock to ORIGIN
    setTime(ctx, ORIGIN);
    setPyth(ctx, ORIGIN);

    // Derive PDAs
    [platformPda] = PublicKey.findProgramAddressSync(
      [PLATFORM_SEED], program.programId
    );
    tokenMint0 = Keypair.generate();
    [project0Pda] = PublicKey.findProgramAddressSync(
      [PROJECT_SEED, new BN(0).toArrayLike(Buffer, "le", 8)], program.programId
    );
    [vault0Pda] = PublicKey.findProgramAddressSync(
      [VAULT_SEED, new BN(0).toArrayLike(Buffer, "le", 8)], program.programId
    );

    // Initialize platform
    await program.methods
      .initializePlatform()
      .accounts({
        platform: platformPda,
        authority: platformAuth.publicKey,
        treasury: treasury.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([platformAuth])
      .rpc();

    // Create project #0 at ORIGIN
    await program.methods
      .createProject({
        name: "Test Project",
        ticker: "TST",
        description: "Full lifecycle test project",
        websiteUrl: "https://test.com",
        raiseGoal: MIN_RAISE,
      })
      .accounts({
        platform: platformPda,
        project: project0Pda,
        vault: vault0Pda,
        tokenMint: tokenMint0.publicKey,
        dev: dev.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([dev, tokenMint0])
      .rpc();

    // Cast a social vote
    const [votePda] = PublicKey.findProgramAddressSync(
      [VOTE_SEED, new BN(0).toArrayLike(Buffer, "le", 8), voter1.publicKey.toBuffer()],
      program.programId
    );
    await program.methods
      .castSocialVote()
      .accounts({
        project: project0Pda,
        socialVote: votePda,
        voter: voter1.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([voter1])
      .rpc();
  });

  // ── Group 1: open_economic_phase timing ──────────────────────────────────
  describe("open_economic_phase timing", () => {
    it("fails before day 15", async () => {
      setTime(ctx, ORIGIN + 14n * DAY);
      try {
        await program.methods
          .openEconomicPhase()
          .accounts({ project: project0Pda, caller: platformAuth.publicKey } as any)
          .signers([platformAuth])
          .rpc();
        expect.fail("Should have failed");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("EconomicPhaseNotActive");
      }
    });

    it("succeeds at day 15", async () => {
      setTime(ctx, ORIGIN + 15n * DAY);
      await program.methods
        .openEconomicPhase()
        .accounts({ project: project0Pda, caller: platformAuth.publicKey } as any)
        .signers([platformAuth])
        .rpc();
      const project = await program.account.project.fetch(project0Pda);
      expect(project.economicPhaseActive).to.be.true;
    });
  });

  // ── Group 2: contribute edge cases ────────────────────────────────────────
  describe("contribute", () => {
    let contrib0Pda: PublicKey;

    before(() => {
      // Warp to day 16 — inside economic phase
      setTime(ctx, ORIGIN + 16n * DAY);
      setPyth(ctx, ORIGIN + 16n * DAY);

      [contrib0Pda] = PublicKey.findProgramAddressSync(
        [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contributor1.publicKey.toBuffer()],
        program.programId
      );
    });

    it("happy path: minimum valid contribution", async () => {
      // $1 min at $150/SOL ≈ 6_666_667 lamports; use 10M to be safe
      const amount = new BN(10_000_000);
      await program.methods
        .contribute(amount)
        .accounts({
          platform: platformPda,
          project: project0Pda,
          contribution: contrib0Pda,
          vault: vault0Pda,
          treasury: treasury.publicKey,
          contributor: contributor1.publicKey,
          priceFeed: PYTH_FEED,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([contributor1])
        .rpc();
      const contrib = await program.account.contribution.fetch(contrib0Pda);
      expect(contrib.amountLamports.toNumber()).to.be.greaterThan(0);
      expect(contrib.tokensAllocated.toNumber()).to.be.greaterThan(0);
    });

    it("fails when contribution is below $1 minimum", async () => {
      // 1000 lamports is way below $1 equivalent
      const tinyAmount = new BN(1000);
      try {
        await program.methods
          .contribute(tinyAmount)
          .accounts({
            platform: platformPda,
            project: project0Pda,
            contribution: contrib0Pda,
            vault: vault0Pda,
            treasury: treasury.publicKey,
            contributor: contributor1.publicKey,
            priceFeed: PYTH_FEED,
            systemProgram: SystemProgram.programId,
          } as any)
          .signers([contributor1])
          .rpc();
        expect.fail("Should have failed");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("ContributionTooLow");
      }
    });

    it("contributes up to the 0.1% cap (MAX_HOLDER_BPS)", async () => {
      // Max tokens = TOKEN_SUPPLY * 10 / 10_000 = 1_000_000_000_000
      // max_lamports ≈ raise_goal * max_tokens / TOKEN_SUPPLY
      //             = 666_666_667_000 * 1_000_000_000_000 / 1_000_000_000_000_000
      //             ≈ 666_666_667 lamports
      // Already contributed 10M, contribute enough to nearly hit the cap
      // Remaining capacity ≈ 666_666_667 - 10_000_000 * (10000/9990) ≈ 656_656_000
      // To keep it simple, use a fresh contributor2 and contribute ~650M lamports
      const [contrib2Pda] = PublicKey.findProgramAddressSync(
        [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contributor2.publicKey.toBuffer()],
        program.programId
      );

      const amount = new BN(600_000_000); // 0.6 SOL, well within cap
      await program.methods
        .contribute(amount)
        .accounts({
          platform: platformPda,
          project: project0Pda,
          contribution: contrib2Pda,
          vault: vault0Pda,
          treasury: treasury.publicKey,
          contributor: contributor2.publicKey,
          priceFeed: PYTH_FEED,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([contributor2])
        .rpc();
      const contrib = await program.account.contribution.fetch(contrib2Pda);
      expect(contrib.tokensAllocated.toNumber()).to.be.greaterThan(0);
      console.log("   tokens allocated:", contrib.tokensAllocated.toString());
    });

    it("fails when exceeding the 0.1% holder cap", async () => {
      // contributor2 already contributed ~600M. Adding another 600M would exceed the cap
      const [contrib2Pda] = PublicKey.findProgramAddressSync(
        [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contributor2.publicKey.toBuffer()],
        program.programId
      );
      const overCapAmount = new BN(600_000_000);
      try {
        await program.methods
          .contribute(overCapAmount)
          .accounts({
            platform: platformPda,
            project: project0Pda,
            contribution: contrib2Pda,
            vault: vault0Pda,
            treasury: treasury.publicKey,
            contributor: contributor2.publicKey,
            priceFeed: PYTH_FEED,
            systemProgram: SystemProgram.programId,
          } as any)
          .signers([contributor2])
          .rpc();
        expect.fail("Should have exceeded cap");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("ExceedsHolderLimit");
      }
    });
  });

  // ── Group 3: close_social_phase timing ───────────────────────────────────
  describe("close_social_phase timing", () => {
    it("fails before day 30", async () => {
      setTime(ctx, ORIGIN + 29n * DAY);
      try {
        await program.methods
          .closeSocialPhase()
          .accounts({ project: project0Pda, caller: platformAuth.publicKey } as any)
          .signers([platformAuth])
          .rpc();
        expect.fail("Should have failed");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("SocialVoteNotEnded");
      }
    });

    it("succeeds after day 30 — transitions to EconomicPhase", async () => {
      setTime(ctx, ORIGIN + 30n * DAY + 1n);
      await program.methods
        .closeSocialPhase()
        .accounts({ project: project0Pda, caller: platformAuth.publicKey } as any)
        .signers([platformAuth])
        .rpc();
      const project = await program.account.project.fetch(project0Pda);
      expect(project.state).to.deep.equal({ economicPhase: {} });
    });
  });

  // ── Group 4: register_dev_activity + trigger_inactivity ──────────────────
  describe("register_dev_activity + trigger_inactivity", () => {
    it("register_dev_activity fails for non-dev caller", async () => {
      setTime(ctx, ORIGIN + 31n * DAY);
      try {
        await program.methods
          .registerDevActivity()
          .accounts({ project: project0Pda, dev: voter1.publicKey } as any)
          .signers([voter1])
          .rpc();
        expect.fail("Should have failed");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("UnauthorizedActivityUpdate");
      }
    });

    it("register_dev_activity succeeds for dev — resets inactivity clock", async () => {
      // dev calls registerDevActivity at day 31
      setTime(ctx, ORIGIN + 31n * DAY);
      await program.methods
        .registerDevActivity()
        .accounts({ project: project0Pda, dev: dev.publicKey } as any)
        .signers([dev])
        .rpc();
      const project = await program.account.project.fetch(project0Pda);
      // lastDevActivity should be updated to ~ORIGIN + 31d
      expect(project.lastDevActivity.toNumber()).to.be.greaterThan(
        Number(ORIGIN + 30n * DAY)
      );
    });

    it("trigger_inactivity fails before 60-day threshold", async () => {
      // 30 days after dev's last activity (ORIGIN+31d) → only 30d inactive, < 60d
      setTime(ctx, ORIGIN + 61n * DAY);
      try {
        await program.methods
          .triggerInactivity()
          .accounts({ project: project0Pda, caller: voter1.publicKey } as any)
          .signers([voter1])
          .rpc();
        expect.fail("Should have failed (only 30 days since last activity)");
      } catch (e: any) {
        // ~30d inactive < 60d threshold
        expect(e.error?.errorCode?.code ?? e.message).to.satisfy((m: string) =>
          m.includes("InvalidProjectState") || m.includes("6023")
        );
      }
    });

    it("trigger_inactivity succeeds at 60+ days since last activity", async () => {
      // dev last active at ORIGIN+31d; 60d later = ORIGIN+91d
      setTime(ctx, ORIGIN + 92n * DAY);
      await program.methods
        .triggerInactivity()
        .accounts({ project: project0Pda, caller: voter1.publicKey } as any)
        .signers([voter1])
        .rpc();
      const project = await program.account.project.fetch(project0Pda);
      expect(project.devLocked).to.be.true;
      console.log("   dev locked after inactivity ✓");
    });
  });

  // ── Group 5: finalize_funding failure path ────────────────────────────────
  describe("finalize_funding — failure path", () => {
    it("fails before vesting period ends", async () => {
      // vesting_end = economic_phase_open + 270d = (ORIGIN+15d) + 270d = ORIGIN+285d
      setTime(ctx, ORIGIN + 284n * DAY);
      setPyth(ctx, ORIGIN + 284n * DAY);
      try {
        await program.methods
          .finalizeFunding()
          .accounts({
            project: project0Pda,
            vault: vault0Pda,
            priceFeed: PYTH_FEED,
            caller: platformAuth.publicKey,
          } as any)
          .signers([platformAuth])
          .rpc();
        expect.fail("Should have failed — vesting not ended");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("EconomicPhaseNotEnded");
      }
    });

    it("marks project as Failed when conditions not met (< 1000 holders)", async () => {
      setTime(ctx, ORIGIN + 286n * DAY);
      setPyth(ctx, ORIGIN + 286n * DAY);
      await program.methods
        .finalizeFunding()
        .accounts({
          project: project0Pda,
          vault: vault0Pda,
          priceFeed: PYTH_FEED,
          caller: platformAuth.publicKey,
        } as any)
        .signers([platformAuth])
        .rpc();
      const project = await program.account.project.fetch(project0Pda);
      expect(project.state).to.deep.equal({ failed: {} });
      console.log(`   project failed: holderCount=${project.holderCount.toString()} (need 1000)`);
    });
  });

  // ── Group 6: refund ───────────────────────────────────────────────────────
  describe("refund", () => {
    let contrib0Pda: PublicKey;

    before(() => {
      [contrib0Pda] = PublicKey.findProgramAddressSync(
        [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contributor1.publicKey.toBuffer()],
        program.programId
      );
    });

    it("happy path: refunds contributor after project fails", async () => {
      const beforeBalance = (await ctx.banksClient.getAccount(contributor1.publicKey))!.lamports;
      await program.methods
        .refund()
        .accounts({
          project: project0Pda,
          contribution: contrib0Pda,
          vault: vault0Pda,
          contributor: contributor1.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([contributor1])
        .rpc();
      const contrib = await program.account.contribution.fetch(contrib0Pda);
      expect(contrib.refunded).to.be.true;
      expect(contrib.amountLamports.toNumber()).to.equal(0);
      const afterBalance = (await ctx.banksClient.getAccount(contributor1.publicKey))!.lamports;
      expect(afterBalance).to.be.greaterThan(beforeBalance);
      console.log("   refund received:", afterBalance - beforeBalance, "lamports");
    });

    it("prevents double-refund", async () => {
      try {
        await program.methods
          .refund()
          .accounts({
            project: project0Pda,
            contribution: contrib0Pda,
            vault: vault0Pda,
            contributor: contributor1.publicKey,
            systemProgram: SystemProgram.programId,
          } as any)
          .signers([contributor1])
          .rpc();
        expect.fail("Second refund should fail");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("NothingToRefund");
      }
    });
  });

  // ── Group 7: close_vault ─────────────────────────────────────────────────
  describe("close_vault", () => {
    it("fails if vault still has unreturned funds", async () => {
      // contributor2 hasn't been refunded yet — vault still owes them
      try {
        await program.methods
          .closeVault()
          .accounts({
            project: project0Pda,
            vault: vault0Pda,
            caller: platformAuth.publicKey,
          } as any)
          .signers([platformAuth])
          .rpc();
        expect.fail("Should fail — contributor2 not refunded yet");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("VaultNotFullyRefunded");
      }
    });

    it("succeeds after all contributors are refunded", async () => {
      // Refund contributor2 first
      const [contrib2Pda] = PublicKey.findProgramAddressSync(
        [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contributor2.publicKey.toBuffer()],
        program.programId
      );
      await program.methods
        .refund()
        .accounts({
          project: project0Pda,
          contribution: contrib2Pda,
          vault: vault0Pda,
          contributor: contributor2.publicKey,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([contributor2])
        .rpc();

      // Now close the vault
      const callerBefore = (await ctx.banksClient.getAccount(platformAuth.publicKey))!.lamports;
      await program.methods
        .closeVault()
        .accounts({
          project: project0Pda,
          vault: vault0Pda,
          caller: platformAuth.publicKey,
        } as any)
        .signers([platformAuth])
        .rpc();

      // Vault account should be gone
      const vaultAccount = await ctx.banksClient.getAccount(vault0Pda);
      expect(vaultAccount).to.be.null;
      const callerAfter = (await ctx.banksClient.getAccount(platformAuth.publicKey))!.lamports;
      expect(callerAfter).to.be.greaterThan(callerBefore);
      console.log("   rent reclaimed:", callerAfter - callerBefore, "lamports");
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════
// BLOCK 2: Success path — finalize_funding Graduated + claim_tokens
// ══════════════════════════════════════════════════════════════════════════
describe("quorum bankrun — success / graduation path", () => {
  let ctx: ProgramTestContext;
  let provider: BankrunProvider;
  let program: Program<Quorum>;

  let platformPda: PublicKey;
  let project1Pda: PublicKey;
  let project1Bump: number;
  let vault1Pda: PublicKey;
  let tokenMint1: Keypair;
  let contrib1Pda: PublicKey; // contribution of contributor1 on project #1

  // separate keypairs for this block
  const platformAuth2 = Keypair.generate();
  const dev2          = Keypair.generate();
  const treasury2     = Keypair.generate();
  const contrib_user  = Keypair.generate();

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

    [platformPda] = PublicKey.findProgramAddressSync(
      [PLATFORM_SEED], program.programId
    );
    tokenMint1 = Keypair.generate();

    // Project #0 doesn't exist in this fresh context, so project index = 0
    [project1Pda, project1Bump] = PublicKey.findProgramAddressSync(
      [PROJECT_SEED, new BN(0).toArrayLike(Buffer, "le", 8)], program.programId
    );
    [vault1Pda] = PublicKey.findProgramAddressSync(
      [VAULT_SEED, new BN(0).toArrayLike(Buffer, "le", 8)], program.programId
    );
    [contrib1Pda] = PublicKey.findProgramAddressSync(
      [CONTRIB_SEED, new BN(0).toArrayLike(Buffer, "le", 8), contrib_user.publicKey.toBuffer()],
      program.programId
    );

    // Initialize platform
    await program.methods
      .initializePlatform()
      .accounts({
        platform: platformPda,
        authority: platformAuth2.publicKey,
        treasury: treasury2.publicKey,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([platformAuth2])
      .rpc();

    // Create project (real on-chain, initializes vault and mint)
    await program.methods
      .createProject({
        name: "Success Project",
        ticker: "WIN",
        description: "Graduation test project",
        websiteUrl: "https://win.com",
        raiseGoal: MIN_RAISE,
      })
      .accounts({
        platform: platformPda,
        project: project1Pda,
        vault: vault1Pda,
        tokenMint: tokenMint1.publicKey,
        dev: dev2.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      } as any)
      .signers([dev2, tokenMint1])
      .rpc();

    // Open economic phase at day 15 (real)
    setTime(ctx, ORIGIN + 15n * DAY);
    await program.methods
      .openEconomicPhase()
      .accounts({ project: project1Pda, caller: platformAuth2.publicKey } as any)
      .signers([platformAuth2])
      .rpc();

    // Inject Pyth and have contrib_user make a real contribution
    setPyth(ctx, ORIGIN + 15n * DAY);
    await program.methods
      .contribute(new BN(300_000_000))   // 0.3 SOL, well within cap
      .accounts({
        platform: platformPda,
        project: project1Pda,
        contribution: contrib1Pda,
        vault: vault1Pda,
        treasury: treasury2.publicKey,
        contributor: contrib_user.publicKey,
        priceFeed: PYTH_FEED,
        systemProgram: SystemProgram.programId,
      } as any)
      .signers([contrib_user])
      .rpc();

    // Close social phase at day 30+1
    setTime(ctx, ORIGIN + 31n * DAY);
    await program.methods
      .closeSocialPhase()
      .accounts({ project: project1Pda, caller: platformAuth2.publicKey } as any)
      .signers([platformAuth2])
      .rpc();

    // ── Inject project state: 1000 holders, $700K raised, vesting ended ──
    // Fetch real account first to preserve token_mint, dev, bump etc.
    const realProject = await program.account.project.fetch(project1Pda);
    const coder = new BorshAccountsCoder(program.idl);
    const injectedData = await coder.encode("project", {
      dev: realProject.dev,
      tokenMint: realProject.tokenMint,
      projectId: realProject.projectId,
      name: realProject.name,
      ticker: realProject.ticker,
      description: realProject.description,
      websiteUrl: realProject.websiteUrl,
      state: { economicPhase: {} },
      socialVoteStart: realProject.socialVoteStart,
      socialVotes: realProject.socialVotes,
      economicPhaseActive: true,
      economicPhaseOpen: realProject.economicPhaseOpen,
      raiseGoal: realProject.raiseGoal,
      totalRaised: new BN("700000000000"),   // far above $100K min
      holderCount: new BN(1000),             // meets MIN_HOLDERS
      platformFeePaid: realProject.platformFeePaid,
      healthCheck1Emitted: false,
      healthCheck2Emitted: false,
      vestingStart: realProject.vestingStart,
      vestingEnd: new BN(Number(ORIGIN + 285n * DAY)),  // expires at day 285
      lastDevActivity: realProject.lastDevActivity,
      devLocked: false,
      bump: project1Bump,
    });

    // Write injected state
    const projectAcctInfo = await ctx.banksClient.getAccount(project1Pda);
    ctx.setAccount(project1Pda, {
      lamports: projectAcctInfo!.lamports,
      data: injectedData,
      owner: program.programId,
      executable: false,
    });
  });

  // ── finalize_funding SUCCESS ───────────────────────────────────────────
  describe("finalize_funding — success path", () => {
    it("marks project Graduated when 1000 holders and enough funds", async () => {
      // Warp past vesting_end (day 285)
      setTime(ctx, ORIGIN + 286n * DAY);
      setPyth(ctx, ORIGIN + 286n * DAY);

      await program.methods
        .finalizeFunding()
        .accounts({
          project: project1Pda,
          vault: vault1Pda,
          priceFeed: PYTH_FEED,
          caller: platformAuth2.publicKey,
        } as any)
        .signers([platformAuth2])
        .rpc();

      const project = await program.account.project.fetch(project1Pda);
      expect(project.state).to.deep.equal({ graduated: {} });
      console.log("   project graduated ✓");
    });
  });

  // ── claim_tokens ──────────────────────────────────────────────────────
  describe("claim_tokens", () => {
    it("contributor claims tokens after graduation", async () => {
      const contrib = await program.account.contribution.fetch(contrib1Pda);
      expect(contrib.claimed).to.be.false;
      expect(contrib.tokensAllocated.toNumber()).to.be.greaterThan(0);

      const ata = anchor.utils.token.associatedAddress({
        mint: tokenMint1.publicKey,
        owner: contrib_user.publicKey,
      });

      await program.methods
        .claimTokens()
        .accounts({
          project: project1Pda,
          contribution: contrib1Pda,
          tokenMint: tokenMint1.publicKey,
          contributorTokenAccount: ata,
          contributor: contrib_user.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        } as any)
        .signers([contrib_user])
        .rpc();

      const contribAfter = await program.account.contribution.fetch(contrib1Pda);
      expect(contribAfter.claimed).to.be.true;
      console.log("   tokens claimed:", contrib.tokensAllocated.toString());
    });

    it("prevents double-claim", async () => {
      const ata = anchor.utils.token.associatedAddress({
        mint: tokenMint1.publicKey,
        owner: contrib_user.publicKey,
      });
      try {
        await program.methods
          .claimTokens()
          .accounts({
            project: project1Pda,
            contribution: contrib1Pda,
            tokenMint: tokenMint1.publicKey,
            contributorTokenAccount: ata,
            contributor: contrib_user.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          } as any)
          .signers([contrib_user])
          .rpc();
        expect.fail("Second claim should fail");
      } catch (e: any) {
        expect(e.error?.errorCode?.code ?? e.message).to.include("VestingAlreadyClaimed");
      }
    });
  });
});
