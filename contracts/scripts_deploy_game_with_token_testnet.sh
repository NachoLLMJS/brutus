#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

: "${PRIVATE_KEY:?PRIVATE_KEY missing. Put it in contracts/.env locally; never paste it in chat.}"
: "${BNB_TESTNET_RPC_URL:=https://data-seed-prebsc-1-s1.binance.org:8545/}"
: "${BRUTUS_TOKEN_ADDRESS:?BRUTUS_TOKEN_ADDRESS missing. Set the token address created by Flap.}"

CHAIN_ID=$(cast chain-id --rpc-url "$BNB_TESTNET_RPC_URL")
if [[ "$CHAIN_ID" != "97" ]]; then
  echo "Wrong chain id: $CHAIN_ID. Expected BNB Testnet 97." >&2
  exit 1
fi

DEPLOYER=$(cast wallet address --private-key "$PRIVATE_KEY")
BALANCE=$(cast balance "$DEPLOYER" --rpc-url "$BNB_TESTNET_RPC_URL")
echo "Network: BNB Testnet ($CHAIN_ID)"
echo "Deployer: $DEPLOYER"
echo "Token: $BRUTUS_TOKEN_ADDRESS"
echo "Balance wei: $BALANCE"

forge script script/testnet/bnb/DeployBrutusGameWithToken.s.sol:DeployBrutusGameWithToken \
  --rpc-url "$BNB_TESTNET_RPC_URL" \
  --broadcast
