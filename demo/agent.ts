// demo/agent.ts
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import { deployContracts } from "./deploy.js";
import { grantPermission } from "../packages/sdk/src/grant.js";
import { executeWithPermission } from "../packages/sdk/src/execute.js";

const OWNER_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;
const AGENT_PK  = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d" as `0x${string}`;

// Use empty selector (0x00000000) with empty calldata for plain ETH transfer
const DEMO_SELECTOR = "0x00000000" as `0x${string}`;
const DEMO_DATA = "0x" as `0x${string}`;

async function main() {
  const scenarioArg = process.argv.find((a) => a.startsWith("--scenario="));
  const scenario = scenarioArg ? parseInt(scenarioArg.split("=")[1]) : 1;

  const ownerAccount = privateKeyToAccount(OWNER_PK);
  const agentAccount = privateKeyToAccount(AGENT_PK);

  const ownerWallet = createWalletClient({ account: ownerAccount, chain: anvil, transport: http() });
  const agentWallet  = createWalletClient({ account: agentAccount,  chain: anvil, transport: http() });
  const publicClient = createPublicClient({ chain: anvil, transport: http() });

  console.log("\nDeploying contracts to Anvil...");
  const { pmAddress, exAddress } = await deployContracts();
  console.log(`  PermissionManager: ${pmAddress}`);
  console.log(`  AgentExecutor:     ${exAddress}`);

  // Fund AgentExecutor with 1 ETH so it can forward ETH in execute()
  const fundHash = await ownerWallet.sendTransaction({ to: exAddress, value: parseEther("1") });
  await publicClient.waitForTransactionReceipt({ hash: fundHash });
  console.log(`  AgentExecutor funded with 1 ETH`);

  // Target for demo calls: owner EOA — plain ETH transfer always succeeds
  const target = ownerAccount.address;

  if (scenario === 1) {
    console.log("\n=== Scenario 1: Agent executes within permission bounds ===");

    const grantHash1 = await grantPermission(ownerWallet, pmAddress, agentAccount.address, {
      spendingLimitPerTx: parseEther("0.1"),
      spendingLimitDaily: parseEther("0.5"),
      expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
      allowedContracts: [target],
      allowedSelectors: [DEMO_SELECTOR],
    });
    await publicClient.waitForTransactionReceipt({ hash: grantHash1 });
    console.log("  [wallet] Permission granted:");
    console.log("    spendingLimitPerTx: 0.1 ETH");
    console.log("    spendingLimitDaily: 0.5 ETH");
    console.log("    expiry: now + 1 hour");
    console.log(`    allowedContracts: [${target}]`);
    console.log(`    allowedSelectors: [${DEMO_SELECTOR}]`);

    try {
      await executeWithPermission(agentWallet, exAddress, ownerAccount.address, {
        target,
        data: DEMO_DATA,
        value: parseEther("0.05"),
      });
      console.log("\n  [agent] Execute 0.05 ETH → SUCCESS ✓");
    } catch (e: unknown) {
      console.log("\n  [agent] Execute → UNEXPECTED FAILURE ✗", e instanceof Error ? e.message : e);
    }
  }

  if (scenario === 2) {
    console.log("\n=== Scenario 2: Agent exceeds per-tx spending limit ===");

    const grantHash2 = await grantPermission(ownerWallet, pmAddress, agentAccount.address, {
      spendingLimitPerTx: parseEther("0.1"),
      spendingLimitDaily: parseEther("0.5"),
      expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
      allowedContracts: [target],
      allowedSelectors: [DEMO_SELECTOR],
    });
    await publicClient.waitForTransactionReceipt({ hash: grantHash2 });
    console.log("  [wallet] Permission granted (limit: 0.1 ETH/tx)");

    try {
      await executeWithPermission(agentWallet, exAddress, ownerAccount.address, {
        target,
        data: DEMO_DATA,
        value: parseEther("0.2"),
      });
      console.log("\n  [agent] Execute 0.2 ETH → UNEXPECTED SUCCESS");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const isExpected = msg.includes("ExceedsPerTxLimit");
      console.log(`\n  [agent] Execute 0.2 ETH → REVERT: ExceedsPerTxLimit ${isExpected ? "✓" : "✗ (wrong error: " + msg + ")"}`);
    }
  }

  if (scenario === 3) {
    console.log("\n=== Scenario 3: Permission expired ===");

    const grantHash3 = await grantPermission(ownerWallet, pmAddress, agentAccount.address, {
      spendingLimitPerTx: parseEther("0.1"),
      spendingLimitDaily: parseEther("0.5"),
      expiry: BigInt(Math.floor(Date.now() / 1000) + 1),
      allowedContracts: [target],
      allowedSelectors: [DEMO_SELECTOR],
    });
    await publicClient.waitForTransactionReceipt({ hash: grantHash3 });
    console.log("  [wallet] Permission granted (expiry: now + 1s)");

    // Wait 2 seconds for expiry
    await new Promise((r) => setTimeout(r, 2000));

    try {
      await executeWithPermission(agentWallet, exAddress, ownerAccount.address, {
        target,
        data: DEMO_DATA,
        value: parseEther("0.05"),
      });
      console.log("\n  [agent] Execute → UNEXPECTED SUCCESS");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      const isExpected = msg.includes("PermissionExpired");
      console.log(`\n  [agent] Execute → REVERT: PermissionExpired ${isExpected ? "✓" : "✗ (wrong error: " + msg + ")"}`);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
