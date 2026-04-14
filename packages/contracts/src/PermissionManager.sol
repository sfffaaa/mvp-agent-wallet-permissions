// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract PermissionManager {
    error NotAuthorized();
    error PermissionExpired();
    error ExceedsPerTxLimit();
    error ExceedsDailyLimit();
    error ContractNotAllowed();
    error SelectorNotAllowed();

    struct Permission {
        uint256 spendingLimitPerTx;
        uint256 spendingLimitDaily;
        uint256 spentToday;
        uint256 dayReset;
        uint256 expiry;
        address[] allowedContracts;
        bytes4[]  allowedSelectors;
        bool      active;
    }

    mapping(address => mapping(address => Permission)) private _permissions;

    event PermissionGranted(address indexed owner, address indexed agent);
    event PermissionRevoked(address indexed owner, address indexed agent);
    event SpendRecorded(address indexed owner, address indexed agent, uint256 value);

    function grantPermission(address agent, Permission calldata p) external {
        _permissions[msg.sender][agent] = p;
        _permissions[msg.sender][agent].active = true;
        _permissions[msg.sender][agent].spentToday = 0;
        _permissions[msg.sender][agent].dayReset = block.timestamp;
        emit PermissionGranted(msg.sender, agent);
    }

    function revokePermission(address agent) external {
        _permissions[msg.sender][agent].active = false;
        emit PermissionRevoked(msg.sender, agent);
    }

    function getPermission(address owner, address agent) external view returns (Permission memory) {
        return _permissions[owner][agent];
    }

    function checkAndRecord(
        address owner,
        address agent,
        address target,
        bytes4 selector,
        uint256 value
    ) external {
        Permission storage p = _permissions[owner][agent];

        if (!p.active) revert NotAuthorized();
        if (block.timestamp >= p.expiry) revert PermissionExpired();
        if (value > p.spendingLimitPerTx) revert ExceedsPerTxLimit();

        bool contractOk;
        for (uint256 i; i < p.allowedContracts.length; i++) {
            if (p.allowedContracts[i] == target) { contractOk = true; break; }
        }
        if (!contractOk) revert ContractNotAllowed();

        bool selectorOk;
        for (uint256 i; i < p.allowedSelectors.length; i++) {
            if (p.allowedSelectors[i] == selector) { selectorOk = true; break; }
        }
        if (!selectorOk) revert SelectorNotAllowed();

        if (block.timestamp >= p.dayReset + 1 days) {
            p.spentToday = 0;
            p.dayReset = block.timestamp;
        }
        if (p.spentToday + value > p.spendingLimitDaily) revert ExceedsDailyLimit();
        p.spentToday += value;

        emit SpendRecorded(owner, agent, value);
    }
}
