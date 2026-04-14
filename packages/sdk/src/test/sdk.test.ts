import { grantPermission } from "../grant.js";
import type { WalletClient } from "viem";
import { parseEther } from "viem";

const PM_ADDRESS = "0x1234567890123456789012345678901234567890" as const;
const AGENT_ADDRESS = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" as const;

function makeMockWallet(hash = "0xdeadbeef00000000000000000000000000000000000000000000000000000000") {
  return {
    writeContract: jest.fn().mockResolvedValue(hash),
  } as unknown as WalletClient;
}

describe("grantPermission", () => {
  it("calls writeContract with grantPermission", async () => {
    const wallet = makeMockWallet();
    const hash = await grantPermission(wallet, PM_ADDRESS, AGENT_ADDRESS, {
      spendingLimitPerTx: parseEther("0.1"),
      spendingLimitDaily: parseEther("0.5"),
      expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
      allowedContracts: ["0x3333333333333333333333333333333333333333"],
      allowedSelectors: ["0x12345678"],
    });
    expect(hash).toBe("0xdeadbeef00000000000000000000000000000000000000000000000000000000");
    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "grantPermission" })
    );
  });

  it("rejects expiry in milliseconds", async () => {
    const wallet = makeMockWallet();
    await expect(
      grantPermission(wallet, PM_ADDRESS, AGENT_ADDRESS, {
        spendingLimitPerTx: parseEther("0.1"),
        spendingLimitDaily: parseEther("0.5"),
        expiry: BigInt(Date.now()), // milliseconds — should be rejected
        allowedContracts: [],
        allowedSelectors: [],
      })
    ).rejects.toThrow("milliseconds");
  });

  it("rejects expiry in the past", async () => {
    const wallet = makeMockWallet();
    await expect(
      grantPermission(wallet, PM_ADDRESS, AGENT_ADDRESS, {
        spendingLimitPerTx: parseEther("0.1"),
        spendingLimitDaily: parseEther("0.5"),
        expiry: BigInt(Math.floor(Date.now() / 1000) - 1), // 1 second ago
        allowedContracts: [],
        allowedSelectors: [],
      })
    ).rejects.toThrow("past");
  });

  it("rejects if writeContract throws", async () => {
    const wallet = {
      writeContract: jest.fn().mockRejectedValue(new Error("reverted")),
    } as unknown as WalletClient;
    await expect(
      grantPermission(wallet, PM_ADDRESS, AGENT_ADDRESS, {
        spendingLimitPerTx: parseEther("0.1"),
        spendingLimitDaily: parseEther("0.5"),
        expiry: BigInt(Math.floor(Date.now() / 1000) + 3600),
        allowedContracts: [],
        allowedSelectors: [],
      })
    ).rejects.toThrow("reverted");
  });
});

import { executeWithPermission } from "../execute.js";
import { revokePermission } from "../revoke.js";
import { getPermission } from "../query.js";
import type { PublicClient } from "viem";

const EXECUTOR_ADDRESS = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" as const;
const OWNER_ADDRESS = "0xcccccccccccccccccccccccccccccccccccccccc" as const;
const TARGET_ADDRESS = "0xdddddddddddddddddddddddddddddddddddddddd" as const;

describe("executeWithPermission", () => {
  it("calls writeContract with execute", async () => {
    const wallet = makeMockWallet();
    const hash = await executeWithPermission(wallet, EXECUTOR_ADDRESS, OWNER_ADDRESS, {
      target: TARGET_ADDRESS,
      data: "0x12345678",
      value: parseEther("0.05"),
    });
    expect(hash).toBe("0xdeadbeef00000000000000000000000000000000000000000000000000000000");
    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "execute" })
    );
  });
});

describe("revokePermission", () => {
  it("calls writeContract with revokePermission", async () => {
    const wallet = makeMockWallet();
    const hash = await revokePermission(wallet, PM_ADDRESS, AGENT_ADDRESS);
    expect(wallet.writeContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "revokePermission" })
    );
    expect(hash).toBeDefined();
  });
});

describe("getPermission", () => {
  it("calls readContract with getPermission", async () => {
    const mockPublic = {
      readContract: jest.fn().mockResolvedValue({
        spendingLimitPerTx: parseEther("0.1"),
        spendingLimitDaily: parseEther("0.5"),
        spentToday: 0n,
        dayReset: 0n,
        expiry: BigInt(9999999999),
        allowedContracts: [],
        allowedSelectors: [],
        active: true,
      }),
    } as unknown as PublicClient;

    const perm = await getPermission(mockPublic, PM_ADDRESS, OWNER_ADDRESS, AGENT_ADDRESS);
    expect(perm.active).toBe(true);
    expect(perm.spendingLimitPerTx).toBe(parseEther("0.1"));
    expect(mockPublic.readContract).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "getPermission" })
    );
  });
});
