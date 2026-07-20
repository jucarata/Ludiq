# Ludiq Competitive Escrow

Escrow for competitive rooms on **Celo Sepolia**.

## Economics

Each player pays **0.20 USDC**:

| Share | Amount | Destination |
|-------|--------|-------------|
| Pool | 0.15 | Accumulates; paid to winner on `settle` |
| Commission | 0.05 | Held in contract; owner `withdrawCommission` later |

## Flow

1. **Host** `approve`s USDC, then calls `deposit(roomKey)` with **0.20 USDC** (creates room; host is already paid).
2. Lobby pool starts at **0.15 USDC**.
3. **Joiners** in lobby `approve` + `joinDeposit(roomKey)` (**0.20** each). Pool grows by **0.15** per joiner.
4. Host can start only when every player in the lobby has paid (host included via create).
5. On room close (before start): host calls `refund(roomKey)` → full **0.20** back to each depositor (host pays gas).
6. On game start: backend `lock(roomKey)`.
7. On win: backend `settle(roomKey, winner)` → pool to winner; commission stays in the contract.
8. Later: owner `withdrawCommission(amount)` → commission wallet.

## Test

```bash
forge test
```

## Deploy (Celo Sepolia)

USDC testnet (Circle): `0x01C5C0122039549AD1493B8220cABEdD739BC44E`

```bash
export CELO_SEPOLIA_RPC_URL=https://forno.celo-sepolia.celo-testnet.org
export COMMISSION_WALLET=0xYourCommissionWallet
export ESCROW_OWNER=0xYourBackendOwnerWallet   # optional; defaults to deployer
export DEPLOYER_PRIVATE_KEY=0x...

forge script script/DeployCompetitiveEscrow.s.sol:DeployCompetitiveEscrow \
    --rpc-url $CELO_SEPOLIA_RPC_URL \
    --broadcast \
    --private-key $DEPLOYER_PRIVATE_KEY
```

Copy the deployed address into the app env as `NEXT_PUBLIC_ESCROW_ADDRESS`.
`ESCROW_OWNER_PRIVATE_KEY` in the app must match `ESCROW_OWNER` / deployer owner.
