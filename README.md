# QUORUM PROTOCOL — MVP

> Tokens con intención. Comunidad como filtro.

Launchpad de tokens en Solana donde la comunidad valida antes de fondear.
Vesting bilateral de 9 meses. Límite de 0.1% por holder. Sin rugs por diseño.

---

## Arquitectura

```
quorum/
├── program/          # Programa Rust/Anchor (Solana smart contract)
├── app/              # Next.js 14 — frontend + API + DB
└── scripts/          # Deploy, inicialización y seed de datos
```

---

## Requisitos

```bash
# Versiones necesarias
Rust: 1.85+
Solana CLI: 2.1+
Anchor CLI: 0.32.1
Node.js: 20+
yarn o npm
```

### Instalación de herramientas

```bash
# Todo en un comando (Mac/Linux)
curl --proto '=https' --tlsv1.2 -sSfL https://solana-install.solana.workers.dev | bash

# Verificar
rustc --version && solana --version && anchor --version && node --version
```

---

## Setup paso a paso

### 1. Configurar Solana CLI para devnet

```bash
solana config set --url devnet
solana-keygen new   # Si no tienes wallet local
solana airdrop 2    # SOL de prueba para deploy
```

### 2. Compilar y deployar el programa

```bash
cd quorum/program

# Compilar
anchor build

# El primer build genera el Program ID real en:
# target/deploy/quorum-keypair.json
# Actualizar el ID en lib.rs y Anchor.toml:
anchor keys sync

# Re-compilar con el ID correcto
anchor build

# Deploy a devnet
anchor deploy --provider.cluster devnet
```

### 3. Inicializar la plataforma on-chain

```bash
cd quorum/scripts
npm install
npm run initialize
```

Esto crea el PDA de la plataforma y guarda la config en `scripts/config.json`.

### 4. Configurar y arrancar el frontend

```bash
cd quorum/app
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Editar .env.local con:
# - DATABASE_URL (Supabase o Neon, gratis)
# - NEXT_PUBLIC_RPC_ENDPOINT (Helius devnet o api.devnet.solana.com)
```

### 5. Configurar la base de datos

```bash
# Crear las tablas
npx prisma db push

# Verificar con Prisma Studio (opcional)
npx prisma studio
```

### 6. Arrancar

```bash
npm run dev
# → http://localhost:3000
```

---

## Seed de datos para demo

```bash
cd quorum/scripts
npm run seed

# Luego sincronizar con la DB:
curl -X POST http://localhost:3000/api/sync \
  -H "Content-Type: application/json" \
  -d '{"type":"create_project"}'
```

---

## Tests del programa

```bash
cd quorum/program
anchor test
```

---

## Flujo completo del protocolo

```
Dev conecta wallet → Crea proyecto (name, ticker, description, raise_goal)
  ↓
  Fase 1: Votación Social (7 días)
  Cualquier wallet vota sin capital en juego
  ↓
  advance_to_economic() — cualquiera puede llamar al terminar los 7 días
  ↓
  Fase 2: Contribución Económica (14 días)
  - Mínimo $1 USD por wallet
  - Máximo 0.1% del supply por holder
  - Plataforma cobra 0.1% inmediatamente
  ↓
  finalize_funding() — cualquiera puede llamar al terminar los 14 días
  ↓
  ¿Cumple requisitos? (≥1,000 holders Y ≥ raise_goal)
    SÍ → Vesting activo 9 meses (dev y holders bloqueados)
    NO → Estado Failed → holders reclaman refund() del 99%
```

---

## Parámetros del protocolo

| Parámetro | Valor |
|---|---|
| Fee de plataforma | 0.1% del total recaudado |
| Límite por holder | 0.1% del supply |
| Holders mínimos | 1,000 |
| Recaudación mínima | $100 USD equivalente en SOL |
| Duración Fase 1 | 7 días |
| Duración Fase 2 | 14 días |
| Duración vesting | 9 meses (270 días) |
| Supply total del token | 1,000,000,000 (1B) con 6 decimales |

---

## Variables de entorno

```env
# app/.env.local

# Base de datos — PostgreSQL (Supabase o Neon gratis)
DATABASE_URL="postgresql://..."

# RPC de Solana
# Opción A: Helius (recomendado, gratis hasta cierto límite)
NEXT_PUBLIC_RPC_ENDPOINT="https://devnet.helius-rpc.com/?api-key=TU_API_KEY"

# Opción B: RPC público (más lento pero sin API key)
# NEXT_PUBLIC_RPC_ENDPOINT="https://api.devnet.solana.com"
```

---

## Servicios gratuitos para el MVP

| Servicio | Uso | Link |
|---|---|---|
| Supabase | PostgreSQL gratuito | supabase.com |
| Neon | PostgreSQL alternativo | neon.tech |
| Helius | RPC Solana devnet | helius.dev |
| Vercel | Hosting Next.js | vercel.com |
| Solana devnet | Blockchain de prueba | — |

**Costo total del MVP: $0/mes**

---

## Roadmap post-MVP

- [ ] Graduación a Raydium (migración de liquidez)
- [ ] Sistema de inactividad del dev on-chain
- [ ] Votación de holders para contingencias
- [ ] Token nativo de gobernanza (QRMD)
- [ ] Dashboard de dev con analytics
- [ ] Perfil público de wallet con historial de proyectos
- [ ] Webhook de Helius para sync automático
- [ ] Mainnet deploy

---

## Licencia

MIT
