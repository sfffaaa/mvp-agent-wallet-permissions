import type { WalletClient, Address, Hash } from "viem";
import { PERMISSION_MANAGER_ABI } from "./abis.js";

export async function revokePermission(
  walletClient: WalletClient,
  permissionManagerAddress: Address,
  agent: Address
): Promise<Hash> {
  return walletClient.writeContract({
    address: permissionManagerAddress,
    abi: PERMISSION_MANAGER_ABI,
    functionName: "revokePermission",
    args: [agent],
  });
}
