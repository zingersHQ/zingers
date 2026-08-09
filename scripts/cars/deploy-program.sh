#!/usr/bin/env bash
# Deploy card_immortalize to the configured Solana cluster (mainnet costs real SOL).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT/onchain/card_immortalize"

CLUSTER="${1:-mainnet}"
echo "Building…"
anchor build

echo "Deploying to $CLUSTER…"
if [[ "$CLUSTER" == "mainnet" || "$CLUSTER" == "mainnet-beta" ]]; then
  solana config set --url https://api.mainnet-beta.solana.com
  anchor deploy --provider.cluster mainnet
else
  solana config set --url "$CLUSTER"
  anchor deploy --provider.cluster "$CLUSTER"
fi

echo "Program id: $(solana address -k target/deploy/card_immortalize-keypair.json)"
echo "Next: npm run cars:init-program"
