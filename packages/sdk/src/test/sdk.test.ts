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
