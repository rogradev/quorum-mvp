#!/bin/bash
# ============================================================
# QUORUM PROTOCOL — Deploy a Devnet
# ============================================================

set -e

echo "🚀 Deploying Quorum Protocol to Devnet..."
echo ""

# Ir al directorio del programa
cd "$(dirname "$0")/../program"

# Verificar dependencias
echo "📋 Verificando dependencias..."
command -v anchor >/dev/null 2>&1 || { echo "❌ Anchor CLI no instalado. Instala con: cargo install --git https://github.com/coral-xyz/anchor avm --locked && avm install latest && avm use latest"; exit 1; }
command -v solana >/dev/null 2>&1 || { echo "❌ Solana CLI no instalado."; exit 1; }

# Verificar que estamos en devnet
CLUSTER=$(solana config get | grep "RPC URL" | awk '{print $3}')
echo "🌐 RPC actual: $CLUSTER"

if [[ $CLUSTER != *"devnet"* ]]; then
  echo "⚠️  Cambiando a devnet..."
  solana config set --url devnet
fi

# Verificar balance
BALANCE=$(solana balance --lamports 2>/dev/null || echo "0")
echo "💰 Balance actual: $BALANCE lamports"

if [ "$BALANCE" -lt 2000000000 ]; then
  echo "⚡ Solicitando airdrop de 2 SOL..."
  solana airdrop 2 || echo "⚠️  Airdrop falló (límite de rate). Intenta manualmente: solana airdrop 2"
  sleep 3
fi

# Compilar el programa
echo ""
echo "🔨 Compilando programa..."
anchor build

# Obtener el Program ID
PROGRAM_ID=$(solana-keygen pubkey target/deploy/quorum-keypair.json)
echo "📍 Program ID: $PROGRAM_ID"

# Actualizar el Program ID en los archivos si es diferente
CURRENT_ID=$(grep "declare_id!" programs/quorum/src/lib.rs | grep -oP '"\K[^"]+')
if [ "$PROGRAM_ID" != "$CURRENT_ID" ]; then
  echo "🔄 Actualizando Program ID..."
  sed -i "s/$CURRENT_ID/$PROGRAM_ID/g" programs/quorum/src/lib.rs
  sed -i "s/$CURRENT_ID/$PROGRAM_ID/g" Anchor.toml
  
  # Re-compilar con el ID correcto
  echo "🔨 Re-compilando con Program ID correcto..."
  anchor build
fi

# Deploy
echo ""
echo "📡 Deployando a devnet..."
anchor deploy --provider.cluster devnet

# Inicializar la plataforma
echo ""
echo "🏗️  Inicializando la plataforma..."
cd ..
npx ts-node scripts/initialize.ts

echo ""
echo "✅ Deploy completado!"
echo "📍 Program ID: $PROGRAM_ID"
echo "🌐 Ver en explorer: https://explorer.solana.com/address/$PROGRAM_ID?cluster=devnet"
echo ""
echo "Próximos pasos:"
echo "  1. cd app && cp .env.example .env.local"
echo "  2. Configura DATABASE_URL en .env.local"
echo "  3. npx prisma db push"
echo "  4. npm run dev"
