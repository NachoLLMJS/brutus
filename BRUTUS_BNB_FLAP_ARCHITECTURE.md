# Brutus BNB + Flap architecture

Estado: diseño de implementación para convertir Brutus en juego wallet-first sobre BNB/Flap sin que la DB pueda romper la economía.

## Objetivo de producto

Brutus será un auto-battler dark fantasy donde cada wallet BNB puede forjar hasta 3 brutos base. Para crear brutos extra se paga con el token lanzado vía Flap. Cada bruto tiene 3 acciones diarias verificadas on-chain. Los jugadores pueden entrar en arenas/torneos PvP con apuestas. Las tasas del token y del ecosistema alimentan un vault/reward pool, y los usuarios que stakeen mínimo 10,000 tokens pueden reclamar recompensas.

## Principios no negociables

1. La DB nunca decide dinero, propiedad, límites diarios, pagos ni claims.
2. Blockchain es la fuente de verdad para:
   - owner de cada bruto,
   - número de brutos por wallet,
   - pagos por brutos extra,
   - burn/reward split,
   - acciones diarias usadas,
   - retos PvP y depósitos,
   - resultados cerrados,
   - recompensas reclamables.
3. La DB solo cachea/renderiza:
   - nombre,
   - apariencia,
   - stats,
   - fight logs,
   - ranking cacheado,
   - metadata visual.
4. Cada fila DB de `Brute` debe mapear a un `bruteId` on-chain y a un `metadataHash`.
5. El frontend oficial solo acepta MetaMask/injected provider en BNB Chain/Testnet.

## Contratos propuestos

### 1. BrutusBloodVault/Faucet via Flap

Superficie Flap V2. Recibe BNB tax revenue del token lanzado por Flap.

Responsabilidades:
- `receive()` simple y gas-safe.
- Acumular BNB tax revenue.
- Exponer UI schema limpia.
- Forward manual/keeper hacia `BrutusRewardPool`.
- Wrappers read-only para que Flap UI vea métricas del reward pool.

Métodos user-facing sugeridos:
- `totalTaxRewardsReceived() view returns (uint256)`
- `rewardReceiver() view returns (address)`
- `rewardPoolTotalStaked() view returns (uint256)`
- `rewardPoolClaimable(address user) view returns (uint256)`

Métodos operator/guardian:
- `setRewardReceiver(address)`
- `forwardTaxRewards(uint256 amountWei)`
- emergency functions exactas según Flap Rule 009 si no es upgradeable.

### 2. BrutusRegistry

Registro canónico de brutos.

Reglas:
- Máximo 3 brutos base por wallet.
- Brutos extra requieren pago en token.
- Pago extra: 50% burn, 50% reward pool/treasury.
- Cada bruto tiene owner y metadataHash.
- Opcional MVP: brutos wallet-bound/no transferibles.

Funciones:
- `createBaseBrute(bytes32 metadataHash)`
- `createExtraBrute(bytes32 metadataHash)`
- `ownerOfBrute(uint256 bruteId)`
- `bruteCount(address user)`
- `extraBrutePrice(address user)`
- `metadataHashOf(uint256 bruteId)`

Eventos:
- `BruteCreated(address indexed owner, uint256 indexed bruteId, bytes32 metadataHash, bool extra, uint256 tokenPaid)`
- `ExtraBrutePayment(address indexed owner, uint256 indexed bruteId, uint256 burned, uint256 rewarded)`

### 3. BrutusDailyActions

Control de 3 acciones diarias por bruto.

Reglas:
- `day = block.timestamp / 1 days`.
- Máximo 3 usos por bruto/día.
- Solo owner del bruto.

Funciones:
- `useDailyAction(uint256 bruteId)`
- `actionsRemaining(uint256 bruteId) view returns (uint8)`
- `actionsUsed(uint256 bruteId, uint256 day) view returns (uint8)`

Evento:
- `DailyActionUsed(address indexed user, uint256 indexed bruteId, uint256 indexed day, uint8 used)`

### 4. BrutusArenaEscrow

PvP y apuestas.

Flujo:
1. A crea reto con bruteId y stake.
2. B acepta con bruteId y mismo stake.
3. Backend/oracle simula combate determinista.
4. Resultado se resuelve con firma/oracle autorizado y hash del fight log.
5. Ganador reclama.
6. Si expira sin resolución, refund.

Funciones:
- `createChallenge(uint256 bruteId, address stakeToken, uint256 amount)`
- `acceptChallenge(uint256 challengeId, uint256 bruteId)`
- `resolveChallenge(uint256 challengeId, uint256 winnerBruteId, bytes32 fightHash, bytes signature)`
- `claimWinnings(uint256 challengeId)`
- `cancelExpiredChallenge(uint256 challengeId)`

Reglas:
- Un bruto no puede estar en dos retos activos.
- Solo owner puede usar su bruto.
- No se resuelve sin firma/oracle válida.
- Fee de arena configurable y bounded.
- Refund si el match no se resuelve a tiempo.

### 5. BrutusRewardPool

Staking y distribución de recompensas.

Reglas:
- Mínimo 10,000 tokens stakeados para acumular recompensas.
- Recompensas pueden venir de:
  - BNB forwardeado por Flap Vault,
  - fees de arena,
  - 50% token fee de brutos extra si se decide depositarlo o convertirlo.
- No escanear holders. Solo stakers.

Funciones:
- `stake(uint256 amount)`
- `unstake(uint256 amount)`
- `depositTaxRewards() payable`
- `claimRewards()`
- `claimable(address user) view returns (uint256)`
- `totalStaked() view returns (uint256)`

## Sync DB-chain

### Creación de bruto

1. Front conecta MetaMask en BNB.
2. Usuario elige nombre/apariencia.
3. Backend prepara preview + metadataHash.
4. Front ejecuta tx:
   - `createBaseBrute(metadataHash)` si wallet tiene <3.
   - `createExtraBrute(metadataHash)` si wallet tiene >=3.
5. Backend verifica receipt y evento `BruteCreated`.
6. Backend crea fila DB con:
   - `onchainBruteId`,
   - `ownerWallet`,
   - `metadataHash`,
   - `creationTxHash`,
   - stats/name/appearance.

### Combate / acción diaria

1. Front llama `useDailyAction(bruteId)` antes de pelear/entrenar.
2. Backend verifica evento `DailyActionUsed` o receipt.
3. Backend simula combate y guarda fight log.
4. Si hay PvP con stake, resultado se resuelve también on-chain.

### Seguridad contra mismatch

- Si DB y chain discrepan, UI muestra estado bloqueado y pide re-sync.
- No se permite pelear con bruto si `ownerOfBrute(bruteId) != connectedWallet`.
- No se permite reclamar si contrato no dice claimable.
- No se da premio por fight log DB sin `resolveChallenge` on-chain.

## Cambios de frontend necesarios

### Global

- Wallet chip en Topbar.
- Solo MetaMask/injected provider.
- Chain guard para BNB Chain/Testnet.
- Estado global de wallet.
- Mensajes claros: wallet requerida, chain incorrecta, MetaMask no instalado.

### Landing

- Explicar economía:
  - 3 brutos base por wallet,
  - extra brutos pagando token,
  - 50% burn / 50% rewards,
  - 3 acciones diarias por bruto,
  - torneos PvP con apuestas.

### CharacterCreator

- Bloquear creación si no hay wallet conectada.
- Mostrar contador de brutos usados/base.
- Mostrar si el próximo bruto es base o extra.
- Mostrar coste en token cuando toque extra.
- En MVP local, seguir llamando API off-chain tras wallet login hasta que contratos estén desplegados.

### Profile

- Mostrar owner wallet.
- Mostrar bruteId on-chain cuando exista.
- Mostrar acciones diarias restantes.
- Bloquear pelear/entrenar si no quedan acciones.

### Arena

- Diferenciar pelea normal vs PvP stake.
- Crear/aceptar retos.
- Mostrar escrow status: Open, Accepted, Resolved, Refundable, Claimed.

### Rewards

Nueva sección:
- stake token,
- unstake,
- claim BNB rewards,
- total staked,
- claimable,
- threshold 10,000.

## Fases de ejecución

### Fase 1 — Front wallet + arquitectura

- Wallet MetaMask BNB.
- Topbar wallet chip.
- Creator bloqueado sin wallet.
- Documento de arquitectura.

### Fase 2 — Contratos base

- BrutusRegistry.
- BrutusDailyActions.
- BrutusRewardPool.
- Tests Foundry.

### Fase 3 — Flap Vault

- BrutusBloodVault + Factory desde FlapVaultExample.
- `vaultUISchema()` limpia.
- `receive()` gas-safe.
- Integration tests.
- BNB Testnet.

### Fase 4 — Backend sync

- Añadir campos Prisma:
  - `ownerWallet`,
  - `onchainBruteId`,
  - `metadataHash`,
  - `creationTxHash`.
- Endpoints de prepare/confirm.
- Event indexer simple.

### Fase 5 — PvP escrow

- BrutusArenaEscrow.
- Front de retos.
- Firma/oracle de resultados.
- Refund timeout.

## Non-goals iniciales

- No combate completo on-chain.
- No marketplace NFT desde día 1.
- No token rewards por holder sin staking.
- No claims basados en DB.
- No providers sociales: solo MetaMask/injected.
