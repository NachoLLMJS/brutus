# Brutus BNB Testnet launch handoff

Private keys:
- Never commit or save a real private key.
- Use a burner testnet wallet only.
- `.env` is ignored by git.

## Current real deployment

Network: BNB Testnet
Chain ID: 97

Real Flap token:
`0x473159256928B25f6B0E7cd75d49EbD4ac977777`

Real Flap vault:
`0x4e7a2406a623dB7DdB0a93748732Bb7D95390A02`

Brutus contracts already wired to the real token:
- RewardPool: `0x5debF8Ad01AB37726bE848Ada5D76EFFae87fd8C`
- Registry: `0xe1A2c617C358C7e3DB73B7cD2b10fdca2d4F8A6B`
- DailyActions: `0xe241a941A8642877ab7848741c3a51F3033B2B6d`
- ArenaEscrow: `0xeC0fba251500F60b5151d5030aA1D5b3E347464B`
- VaultFactory: `0x6A0C133eDA27204349CE924ac6FE6B3B4AdBA083`

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
