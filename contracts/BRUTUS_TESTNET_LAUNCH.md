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
- RewardPool / CombatRewardsV3: `0x9b9b801Fef24947D13b850a93B456C03aeed1Aec`
- Registry: `0xd74a0941c441Bac2121992f33bd910059300B2C3`
- DailyActions: `0xecF5EA60D706c7D96Bbf1aaE19be8B40E149eB49`
- ArenaEscrow: `0x2415248C3adAEc3484E041A741C1BFE1AA9bBC14`
- VaultFactory: `0x1A641ca0aDeEc88817A5D9E0CCeD281d41AdaE49`

## Verified wiring

- Registry `gameToken` = real Flap token.
- CombatRewardsV3 `gameToken` = real Flap token.
- Real vault `taxToken` = real Flap token.
- Real vault `rewardReceiver` = CombatRewardsV3.
- DailyActions points to the current DailyActions deployment.
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
