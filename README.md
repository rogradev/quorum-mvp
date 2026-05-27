# QUORUM PROTOCOL — MVP

> Tokens with intention. Community as filter.

Token launchpad on Solana where community validates before anyone funds.
Bilateral 9-month vesting. 0.1% holder limit. No rugs by design.

**X:** @QuorumBuild  
**Domain:** quorumbuild.xyz

---

## Protocol Rules

| Rule | Detail |
|---|---|
| Social voting | Day 1–30. Any wallet. Free. |
| Economic phase opens | Day 15 — in parallel with social voting |
| Vesting starts | Day 15 — simultaneously with first contribution |
| Max per holder | 0.1% of supply — enforced on-chain |
| Min contribution | $1 USD equivalent in SOL |
| Platform fee | 0.1% per contribution — non-refundable |
| Health check 1 | Month 3 — informational, no penalty |
| Health check 2 | Month 6 — informational, no penalty |
| Final evaluation | Day 284 — $100K raised + 1,000 holders |
| Success | Graduate to Raydium |
| Failure | 99% auto-refunded on-chain |

---

## Architecture

```
quorum/
├── program/          # Rust/Anchor smart contract
├── app/              # Next.js 14 — frontend + API + DB
└── scripts/          # Deploy, initialize, seed
```

---

## Prerequisites

```bash
# Required versions
Rust: 1.85+
Solana CLI: 2.1+
Anchor CLI: 0.32.1
Node.js: 20+

# Install all (Mac/Linux)
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash

# Verify
rustc --version && solana --version && anchor --version && node --version
```

> **Windows users:** Use GitHub Codespaces (browser-based Linux environment)
> or install Git for Windows + tools natively.

---

## Setup — Step by Step

### 1. Configure Solana for devnet

```bash
solana config set --url devnet
solana-keygen new   # Skip if you already have a wallet
solana airdrop 2
solana balance
```

### 2. Build and deploy the program

```bash
cd quorum/program

# First build — generates the real Program ID
anchor build

# Sync Program ID across all files
anchor keys sync

# Rebuild with correct ID
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet
```

### 3. Initialize the platform on-chain

```bash
cd ../scripts
npm install
npx ts-node initialize.ts
# Saves config to scripts/config.json
```

### 4. Run tests

```bash
cd ../program
anchor test --provider.cluster devnet
```

### 5. Configure and start the frontend

```bash
cd ../app
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local:
# DATABASE_URL=your-supabase-url
# NEXT_PUBLIC_RPC_ENDPOINT=https://devnet.helius-rpc.com/?api-key=YOUR_KEY

# Create database tables
npx prisma db push

# Start development server
npm run dev
# → http://localhost:3000
```

### 6. Seed demo data

```bash
cd ../scripts
npx ts-node seed.ts

# Sync with database
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type":"create_project"}'
```

### 7. Verify on Solana Explorer

```
https://explorer.solana.com/?cluster=devnet
Search your Program ID to verify deployment.
```

---

## Protocol Lifecycle

```
DAY 1
└── Social voting opens (30 days)
    └── Any wallet votes — free — no capital at stake

DAY 15
└── Economic phase opens (in parallel with social)
    └── Vesting starts simultaneously
    └── Funding stays open for 270 days
    └── Min $1 per wallet, max 0.1% supply per wallet
    └── 0.1% platform fee per contribution (non-refundable)

DAY 30
└── Social voting closes
    └── Economic phase continues

MONTH 3 (Day 105)
└── Health check 1 — informational
    └── Is project at 10% of goal ($10K)?
    └── Public indicator — no penalty

MONTH 6 (Day 195)
└── Health check 2 — informational
    └── Is project at 40% of goal ($40K)?
    └── Public indicator — no penalty

DAY 284
└── Final evaluation — on-chain, automatic
    ├── $100K raised + 1,000 unique holders?
    │   YES → Graduate to Raydium. Vesting lifts. Token free.
    │   NO  → Failed. 99% auto-refunded on-chain.
    └── No grace period. No exceptions.
```

---

## Environment Variables

```env
# app/.env.local

# PostgreSQL — Supabase or Neon (free tier)
DATABASE_URL="postgresql://..."

# Solana RPC — Helius devnet (free tier)
NEXT_PUBLIC_RPC_ENDPOINT="https://devnet.helius-rpc.com/?api-key=YOUR_KEY"

# Or use public devnet (slower, no API key needed)
# NEXT_PUBLIC_RPC_ENDPOINT="https://api.devnet.solana.com"
```

---

## Free Services for MVP

| Service | Purpose | Link |
|---|---|---|
| Supabase | PostgreSQL | supabase.com |
| Helius | Solana RPC | helius.dev |
| Vercel | Hosting | vercel.com |
| Solana devnet | Test blockchain | — |

**Total MVP cost: $0/month**

---

## Common Errors

```
"insufficient funds"
→ solana airdrop 2 (repeat until you have 4+ SOL)

"account not found"
→ Run: npx ts-node scripts/initialize.ts

"IDL not found"
→ Copy target/idl/quorum.json to app/src/lib/idl.json

Rust compilation fails
→ rustup update && cargo clean && anchor build

"Program authority mismatch"
→ anchor keys sync && anchor build && anchor deploy
```

---

## Roadmap

- [ ] Raydium graduation integration
- [ ] Dev inactivity system enforcement
- [ ] Holder emergency vote
- [ ] Platform governance token (QRMD)
- [ ] Developer analytics dashboard
- [ ] Mainnet deployment

---

## License

MIT
