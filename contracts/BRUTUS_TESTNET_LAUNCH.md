# Brutus BNB Testnet launch handoff

Private keys:
- Never commit or save a real private key.
- Use a burner testnet wallet only.
- `.env` is ignored by git.

## Current real deployment

Network: BNB Testnet
Chain ID: 97

Real Flap token:
`0xe7B0C3574C85C5A8C8Bbbfde299B223F68477777`

Real Flap vault:
`0xae21b38dD8Ef95aa41824fb840436fc1f049fcFf`

Brutus contracts already wired to the real token:
- RewardPool: `0x79182dEF2B8662F2F932B358bbd0F4Ab6496fe8F`
- Registry: `0xe1A2c617C358C7e3DB73B7cD2b10fdca2d4F8A6B`
- DailyActions: `0xe241a941A8642877ab7848741c3a51F3033B2B6d`
- ArenaEscrow: `0xeC0fba251500F60b5151d5030aA1D5b3E347464B`
- VaultFactory: `0x1A641ca0aDeEc88817A5D9E0CCeD281d41AdaE49`

## Verified wiring

- Registry `gameToken` = real Flap token.
- RewardPool `stakingToken` = real Flap token.
- Real vault `taxToken` = real Flap token.
- Real vault `rewardReceiver` = BrutusRewardPool.
- DailyActions points to the real Registry.
- ArenaEscrow resolver is the deployer/operator wallet.

## Vault UI

The Brutus vault uses `vaultUISchema()` for a clean Flap UI.

User-facing UI methods include status/read methods and reward forwarding. Emergency/admin methods are kept out of the generic UI schema so the page stays professional.

## Emergency / recovery

Recovery functions are explicit:

```solidity
emergencyWithdrawNative(address to)
emergencyWithdrawToken(address token, address to)
setRewardReceiver(address newReceiver)
forwardTaxRewards(uint256 amountWei)
```

No fake/misleading `burn` recovery function is used.

## If deploying another real token later

Use this script only for another real token deployment:

```bash
BRUTUS_TOKEN_ADDRESS=0x_REAL_FLAP_TOKEN ./scripts_deploy_game_with_token_testnet.sh
```

There is no production mock token deploy script anymore.
