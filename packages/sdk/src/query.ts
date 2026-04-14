import type { PublicClient, Address } from "viem";
import { PERMISSION_MANAGER_ABI } from "./abis.js";
import type { Permission } from "./types.js";

export async function getPermission(
  publicClient: PublicClient,
  permissionManagerAddress: Address,
  owner: Address,
  agent: Address
): Promise<Permission> {
  const result = await publicClient.readContract({
    address: permissionManagerAddress,
    abi: PERMISSION_MANAGER_ABI,
    functionName: "getPermission",
    args: [owner, agent],
  });
  return result as Permission;
}
