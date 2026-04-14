import type { WalletClient, Address, Hash, Hex } from "viem";
import { AGENT_EXECUTOR_ABI } from "./abis.js";

export async function executeWithPermission(
  agentWallet: WalletClient,
  agentExecutorAddress: Address,
  owner: Address,
  call: { target: Address; data: Hex; value: bigint }
): Promise<Hash> {
  return agentWallet.writeContract({
    address: agentExecutorAddress,
    abi: AGENT_EXECUTOR_ABI,
    functionName: "execute",
    args: [owner, call.target, call.data, call.value],
  });
}
