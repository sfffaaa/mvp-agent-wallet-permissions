export const PERMISSION_MANAGER_ABI = [
  {
    type: "function",
    name: "grantPermission",
    inputs: [
      { name: "agent", type: "address" },
      {
        name: "p",
        type: "tuple",
        components: [
          { name: "spendingLimitPerTx", type: "uint256" },
          { name: "spendingLimitDaily", type: "uint256" },
          { name: "spentToday", type: "uint256" },
          { name: "dayReset", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "allowedContracts", type: "address[]" },
          { name: "allowedSelectors", type: "bytes4[]" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "revokePermission",
    inputs: [{ name: "agent", type: "address" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "getPermission",
    inputs: [
      { name: "owner", type: "address" },
      { name: "agent", type: "address" },
    ],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "spendingLimitPerTx", type: "uint256" },
          { name: "spendingLimitDaily", type: "uint256" },
          { name: "spentToday", type: "uint256" },
          { name: "dayReset", type: "uint256" },
          { name: "expiry", type: "uint256" },
          { name: "allowedContracts", type: "address[]" },
          { name: "allowedSelectors", type: "bytes4[]" },
          { name: "active", type: "bool" },
        ],
      },
    ],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "checkAndRecord",
    inputs: [
      { name: "owner", type: "address" },
      { name: "agent", type: "address" },
      { name: "target", type: "address" },
      { name: "selector", type: "bytes4" },
      { name: "value", type: "uint256" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

export const AGENT_EXECUTOR_ABI = [
  {
    type: "function",
    name: "execute",
    inputs: [
      { name: "owner", type: "address" },
      { name: "target", type: "address" },
      { name: "data", type: "bytes" },
      { name: "value", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bytes" }],
    stateMutability: "nonpayable",
  },
] as const;
