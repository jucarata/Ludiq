# Ludiq Competitive Escrow

Escrow for competitive rooms on **Celo** (Mainnet or Sepolia).

## Economics

Each player pays **0.20 USDC**:

| Share | Amount | Destination |
|-------|--------|-------------|
| Pool | 0.18 (90%) | Accumulates; paid to winner on `settle` |
| Commission | 0.02 (10%) | Held in contract; owner `withdrawCommission` later |

Of weekly accrued commission, **40%** is reserved for the trophy leaderboard (1st 50% / 2nd 30% / 3rd 20% of that slice). Leaderboard payouts are app-side; this contract only holds commission.

## Contract (source of truth)

`src/CompetitiveEscrow.sol`

| Constant | Value | Meaning |
|----------|-------|---------|
| `ENTRY_FEE` | `200_000` | 0.20 USDC (6 decimals) |
| `POOL_SHARE_PER_PLAYER` | `180_000` | 0.18 (90%) |
| `COMMISSION_SHARE_PER_PLAYER` | `20_000` | 0.02 (10%) |
| `MAX_PLAYERS` | `4` | Cap per room |

Constructor args:

1. `usdt_` — ERC-20 stake token (use **USDC** address; name is historical)
2. `commissionWallet_` — receives `withdrawCommission`
3. `owner_` — backend that calls `lock` / `settle` / `withdrawCommission`

## Token addresses

| Network | Token | Address |
|---------|-------|---------|
| **Celo Mainnet** | USDC (Circle) | `0xcebA9300f2b948710d2653dD7B07f33A8B32118C` |
| Celo Sepolia | USDC (Circle) | `0x01C5C0122039549AD1493B8220cABEdD739BC44E` |

## Flow

1. **Host** `approve`s USDC, then calls `deposit(roomKey)` with **0.20 USDC**.
2. Lobby pool starts at **0.18 USDC**.
3. **Joiners** `approve` + `joinDeposit(roomKey)` (**0.20** each). Pool grows by **0.18** per joiner.
4. Host can start only when every lobby player has paid.
5. On room close (before start): host `refund(roomKey)` → full **0.20** back to each depositor.
6. On game start: backend `lock(roomKey)`.
7. On win: backend `settle(roomKey, winner)` → pool to winner; commission stays in the contract.
8. Later: owner `withdrawCommission(amount)` → commission wallet.

## Test

```bash
forge test --root contracts
```

## Deploy — Celo Mainnet (Proof of Ship)

Constants are immutable — after changing pool/commission shares, **redeploy** and update `NEXT_PUBLIC_ESCROW_ADDRESS`.

```bash
# From repo root (or cd contracts)
export STAKE_TOKEN=0xcebA9300f2b948710d2653dD7B07f33A8B32118C
export COMMISSION_WALLET=0xYourCommissionWallet
export ESCROW_OWNER=0xYourBackendOwnerWallet   # optional; defaults to deployer
export DEPLOYER_PRIVATE_KEY=0x...

forge script script/DeployCompetitiveEscrow.s.sol:DeployCompetitiveEscrow \
    --rpc-url https://forno.celo.org \
    --broadcast \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --root contracts
```

Then verify on Celoscan (replace ADDRESS):

```bash
forge verify-contract ADDRESS \
    src/CompetitiveEscrow.sol:CompetitiveEscrow \
    --chain-id 42220 \
    --watch \
    --constructor-args $(cast abi-encode "constructor(address,address,address)" \
      0xcebA9300f2b948710d2653dD7B07f33A8B32118C \
      $COMMISSION_WALLET \
      $ESCROW_OWNER) \
    --root contracts
```

App env after deploy:

```
NEXT_PUBLIC_CELO_CHAIN=mainnet
NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo.org
CELO_RPC_URL=https://forno.celo.org
NEXT_PUBLIC_ESCROW_ADDRESS=0xDeployedAddress
NEXT_PUBLIC_COMMISSION_WALLET=0xYourCommissionWallet
ESCROW_OWNER_PRIVATE_KEY=0x...   # must match ESCROW_OWNER
```

## Deploy — Celo Sepolia

```bash
export CELO_SEPOLIA_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
export COMMISSION_WALLET=0xYourCommissionWallet
export ESCROW_OWNER=0xYourBackendOwnerWallet
export DEPLOYER_PRIVATE_KEY=0x...
# STAKE_TOKEN defaults to Sepolia USDC

forge script script/DeployCompetitiveEscrow.s.sol:DeployCompetitiveEscrow \
    --rpc-url $CELO_SEPOLIA_RPC_URL \
    --broadcast \
    --private-key $DEPLOYER_PRIVATE_KEY \
    --root contracts
```
