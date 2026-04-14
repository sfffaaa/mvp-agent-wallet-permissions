# Agent Wallet Permissions

On-chain permission layer for AI agents. A wallet grants an agent a scoped permission — spend limit, daily cap, function whitelist, expiry — enforced by Solidity contracts. Reference implementation of [ERC-7715](https://eips.ethereum.org/EIPS/eip-7715) spirit + [EIP-7702](https://eips.ethereum.org/EIPS/eip-7702) (Pectra).

## What This Shows

- **PermissionManager.sol** — stores `Permission` structs indexed by `(owner, agent)`
- **AgentExecutor.sol** — agents call `execute()`, which checks permission before forwarding
- **TypeScript SDK** — `grantPermission()`, `executeWithPermission()`, `revokePermission()`, `getPermission()`
- **CLI Demo** — 3 scenarios on local Anvil (success / exceed-limit / expired)

## Permission Constraints

| Constraint | Enforced by |
|---|---|
| Max ETH per transaction | `spendingLimitPerTx` |
| Max ETH per day (auto-resets) | `spendingLimitDaily` |
| Permission expiry | `expiry` (unix timestamp) |
| Contract whitelist | `allowedContracts[]` |
| Function selector whitelist | `allowedSelectors[]` |

## Quick Start

### Prerequisites

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

# Install Node deps
npm install
```

### Run Contract Tests

```bash
npm run test:contracts
# or
cd packages/contracts && forge test -vv
```

### Run SDK Tests

```bash
npm run test:sdk
# or
cd packages/sdk && npm test
```

### Run Demo

In terminal 1:
```bash
anvil --hardfork prague
```

In terminal 2:
```bash
# Build contracts first
cd packages/contracts && forge build

# Scenario 1: agent executes within limits → SUCCESS
npx tsx --tsconfig tsconfig.json demo/agent.ts --scenario=1

# Scenario 2: agent exceeds per-tx limit → REVERT: ExceedsPerTxLimit
npx tsx --tsconfig tsconfig.json demo/agent.ts --scenario=2

# Scenario 3: permission expired → REVERT: PermissionExpired
npx tsx --tsconfig tsconfig.json demo/agent.ts --scenario=3
```

## Architecture

```
wallet → grantPermission() → PermissionManager.sol
agent  → execute()         → AgentExecutor.sol
                           → checkAndRecord() → PermissionManager.sol
                           → target.call()
```

## Standards

- [ERC-7715: Grant Permissions from Wallets](https://eips.ethereum.org/EIPS/eip-7715)
- [EIP-7702: Set EOA Account Code](https://eips.ethereum.org/EIPS/eip-7702)
