import type { Address } from "viem";

export interface PermissionParams {
  spendingLimitPerTx: bigint;
  spendingLimitDaily: bigint;
  expiry: bigint;
  allowedContracts: Address[];
  allowedSelectors: `0x${string}`[];
}

export interface Permission extends PermissionParams {
  spentToday: bigint;
  dayReset: bigint;
  active: boolean;
}
