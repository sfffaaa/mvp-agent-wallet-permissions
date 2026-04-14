// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PermissionManager.sol";

contract AgentExecutor {
    error ExecutionFailed();

    PermissionManager public immutable permissionManager;

    bool private _locked;

    modifier nonReentrant() {
        require(!_locked, "reentrant");
        _locked = true;
        _;
        _locked = false;
    }

    constructor(address _permissionManager) {
        permissionManager = PermissionManager(_permissionManager);
    }

    function execute(
        address owner,
        address target,
        bytes calldata data,
        uint256 value
    ) external nonReentrant returns (bytes memory) {
        bytes4 selector = data.length >= 4 ? bytes4(data[:4]) : bytes4(0);

        permissionManager.checkAndRecord(owner, msg.sender, target, selector, value);

        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) revert ExecutionFailed();

        return result;
    }
}
