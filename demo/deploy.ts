// demo/deploy.ts
import { createWalletClient, createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { anvil } from "viem/chains";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const OWNER_PK = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;

export async function deployContracts() {
  const account = privateKeyToAccount(OWNER_PK);
  const walletClient = createWalletClient({ account, chain: anvil, transport: http() });
  const publicClient = createPublicClient({ chain: anvil, transport: http() });

  const pmArtifact = JSON.parse(
    readFileSync(join(__dirname, "../packages/contracts/out/PermissionManager.sol/PermissionManager.json"), "utf-8")
  );
  const exArtifact = JSON.parse(
    readFileSync(join(__dirname, "../packages/contracts/out/AgentExecutor.sol/AgentExecutor.json"), "utf-8")
  );

  const pmHash = await walletClient.deployContract({
    abi: pmArtifact.abi,
    bytecode: pmArtifact.bytecode.object,
  });
  const pmReceipt = await publicClient.waitForTransactionReceipt({ hash: pmHash });
  const pmAddress = pmReceipt.contractAddress!;

  const exHash = await walletClient.deployContract({
    abi: exArtifact.abi,
    bytecode: exArtifact.bytecode.object,
    args: [pmAddress],
  });
  const exReceipt = await publicClient.waitForTransactionReceipt({ hash: exHash });
  const exAddress = exReceipt.contractAddress!;

  return { pmAddress, exAddress };
}
