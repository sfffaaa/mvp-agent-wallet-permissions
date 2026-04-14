import type { WalletClient, Address, Hash } from "viem";
import { PERMISSION_MANAGER_ABI } from "./abis.js";
import type { PermissionParams } from "./types.js";

// 1e12 seconds = year 33658 — if expiry exceeds this it's almost certainly milliseconds
const MAX_EXPIRY_SECONDS = 1_000_000_000_000n;

export async function grantPermission(
  walletClient: WalletClient,
  permissionManagerAddress: Address,
  agent: Address,
  params: PermissionParams
): Promise<Hash> {
  if (params.expiry > MAX_EXPIRY_SECONDS) {
    throw new Error(`expiry ${params.expiry} looks like milliseconds — pass Unix seconds instead`);
  }
  if (params.expiry <= BigInt(Math.floor(Date.now() / 1000))) {
    throw new Error(`expiry ${params.expiry} is already in the past`);
  }
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
