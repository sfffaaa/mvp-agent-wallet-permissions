import type { WalletClient, Address, Hash } from "viem";
import { PERMISSION_MANAGER_ABI } from "./abis.js";
import type { PermissionParams } from "./types.js";

export async function grantPermission(
  walletClient: WalletClient,
  permissionManagerAddress: Address,
  agent: Address,
  params: PermissionParams
): Promise<Hash> {
  return walletClient.writeContract({
    address: permissionManagerAddress,
    abi: PERMISSION_MANAGER_ABI,
    functionName: "grantPermission",
    args: [
      agent,
      {
        spendingLimitPerTx: params.spendingLimitPerTx,
        spendingLimitDaily: params.spendingLimitDaily,
        spentToday: 0n,
        dayReset: BigInt(Math.floor(Date.now() / 1000)),
        expiry: params.expiry,
        allowedContracts: params.allowedContracts,
        allowedSelectors: params.allowedSelectors,
        active: true,
      },
    ],
  });
}
