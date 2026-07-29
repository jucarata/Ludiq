# Party Escrow

Escrow for **Party mode** rooms on **Celo** (Mainnet or Sepolia).

## Economics

Anyone may contribute any pool amount (min **0.01 USDT**) while the room is Open. Multiple contributions per wallet are allowed.

| Piece | Formula | Destination |
|-------|---------|-------------|
| Pool | User-chosen `X` | Accumulates; paid to winner on `settle` |
| Fee | `min(X × 10%, $10)` | Held in contract; owner `withdrawCommission` later |

Examples: contribute $1 → pay $1.10; contribute $100 → pay $110 (fee capped at $10); contribute $200 → pay $210 (still $10 fee).

| Action | Who pays gas | What is returned |
|--------|--------------|------------------|
| `withdrawContribution` (leave) | Leaving player | **Pool only**; fee stays |
| `kickRefund` (host kick) | Host | **Pool + fee** (100%) |
| `refund` (host closes room) | Host | Pool only to everyone; fee stays |
| `fullRefund` (error / failed start) | Host | Pool + fee to everyone |

Playing does **not** require contributing.

Of weekly accrued commission, **40%** is reserved for the trophy leaderboard (app-side).

## Contract (source of truth)

`src/PartyEscrow.sol`

| Constant | Value | Meaning |
|----------|-------|---------|
| `FEE_BPS` | `1000` | 10% |
| `FEE_CAP` | `10_000_000` | $10 USDT (6 decimals) |
| `MIN_POOL_AMOUNT` | `10_000` | $0.01 USDT |

Constructor args:

1. `usdt_` — ERC-20 stake token (USDT)
2. `commissionWallet_` — receives `withdrawCommission`
3. `owner_` — backend that calls `lock` / `settle` / `withdrawCommission`

Legacy `CompetitiveEscrow.sol` (fixed 0.20 entry) is superseded by PartyEscrow.

## Token addresses

| Network | Token | Address |
|---------|-------|---------|
| **Celo Mainnet** | USDT (Tether) | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` |
| Celo Sepolia | USDT | `0xd077A400968890Eacc75cdc901F0356c943e4fDb` |

## Flow

1. Host creates a free lobby in the app, then enables Party mode → `open(roomKey)`
2. Anyone calls `contribute(roomKey, poolAmount)` (approve USDT first)
3. Optional leave → `withdrawContribution` (pool only); optional kick → host `kickRefund`
4. Host starts game (payments optional) → backend `lock(roomKey)` if pot &gt; 0
5. On win → backend `settle(roomKey, winner)`

## Deploy

```bash
# Celo Sepolia
forge script script/DeployPartyEscrow.s.sol:DeployPartyEscrow \
  --rpc-url $CELO_SEPOLIA_RPC_URL --broadcast --private-key $DEPLOYER_PRIVATE_KEY

# Celo Mainnet
STAKE_TOKEN=0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e \
COMMISSION_WALLET=$COMMISSION_WALLET \
ESCROW_OWNER=$ESCROW_OWNER \
forge script script/DeployPartyEscrow.s.sol:DeployPartyEscrow \
  --rpc-url https://forno.celo.org --broadcast --private-key $DEPLOYER_PRIVATE_KEY
```

Env: `COMMISSION_WALLET`, optional `ESCROW_OWNER`, optional `STAKE_TOKEN`.

After deploy, set `NEXT_PUBLIC_ESCROW_ADDRESS` to the new PartyEscrow address.

## Current Mainnet deployment

| Field | Value |
|-------|-------|
| PartyEscrow | `0x5831BA4ca0BA0f21CF4BDdb62E191144Ebd4C6fe` |
| Owner | `0xE5E783dF136E3325E48f5FE1d02a3a77Fc701238` |
| Commission | `0xBFa6a995aCf4E26783502e49611689b043B3F991` |
| USDT | `0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e` |
