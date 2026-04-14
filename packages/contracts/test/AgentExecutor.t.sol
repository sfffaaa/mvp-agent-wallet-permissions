// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/AgentExecutor.sol";
import "../src/PermissionManager.sol";

contract MockTarget {
    bytes4 public constant TRANSFER_SEL = bytes4(keccak256("transfer(address,uint256)"));

    uint256 public lastValue;
    bytes public lastData;
    bool public shouldRevert;

    function setShouldRevert(bool v) external { shouldRevert = v; }

    function transfer(address, uint256 amount) external payable returns (bool) {
        if (shouldRevert) revert("MockTarget: forced revert");
        lastValue = amount;
        lastData = msg.data;
        return true;
    }

    receive() external payable {}
}

contract AgentExecutorTest is Test {
    PermissionManager pm;
    AgentExecutor executor;
    MockTarget target;

    address owner = address(0x1);
    address agent = address(0x2);

    bytes4 constant TRANSFER_SEL = bytes4(keccak256("transfer(address,uint256)"));

    function setUp() public {
        pm = new PermissionManager();
        executor = new AgentExecutor(address(pm));
        pm.setExecutor(address(executor));
        target = new MockTarget();
        vm.deal(address(executor), 10 ether);
    }

    function _defaultPermission() internal view returns (PermissionManager.Permission memory) {
        address[] memory contracts = new address[](1);
        contracts[0] = address(target);
        bytes4[] memory sels = new bytes4[](1);
        sels[0] = TRANSFER_SEL;
        return PermissionManager.Permission({
            spendingLimitPerTx: 1 ether,
            spendingLimitDaily: 5 ether,
            spentToday: 0,
            dayReset: block.timestamp,
            expiry: block.timestamp + 1 hours,
            allowedContracts: contracts,
            allowedSelectors: sels,
            active: false // grantPermission will set true
        });
    }

    // Test 1: Grant permission, agent calls execute, verify MockTarget received the call
    function test_execute_success() public {
        PermissionManager.Permission memory perm = _defaultPermission();
        vm.prank(owner);
        pm.grantPermission(agent, perm);

        bytes memory data = abi.encodeWithSelector(TRANSFER_SEL, address(0xdead), 42);

        vm.prank(agent);
        executor.execute(owner, address(target), data, 0);

        assertEq(target.lastValue(), 42);
    }

    // Test 2: Agent has no permission (mapping is empty) → NotAuthorized() revert
    function test_execute_reverts_if_no_permission() public {
        bytes memory data = abi.encodeWithSelector(TRANSFER_SEL, address(0xdead), 42);

        vm.prank(agent);
        vm.expectRevert(PermissionManager.NotAuthorized.selector);
        executor.execute(owner, address(target), data, 0);
    }

    // Test 3: Permission granted with small limit, call with large value → ExceedsPerTxLimit() revert
    function test_execute_reverts_if_exceeds_per_tx_limit() public {
        PermissionManager.Permission memory perm = _defaultPermission(); // spendingLimitPerTx = 1 ether
        vm.prank(owner);
        pm.grantPermission(agent, perm);

        bytes memory data = abi.encodeWithSelector(TRANSFER_SEL, address(0xdead), 42);

        vm.prank(agent);
        vm.expectRevert(PermissionManager.ExceedsPerTxLimit.selector);
        executor.execute(owner, address(target), data, 2 ether); // exceeds 1 ether limit
    }

    // Test 4: Target not in allowedContracts → ContractNotAllowed() revert
    function test_execute_reverts_if_target_not_allowed() public {
        PermissionManager.Permission memory perm = _defaultPermission();
        vm.prank(owner);
        pm.grantPermission(agent, perm);

        address badTarget = address(0x999);
        bytes memory data = abi.encodeWithSelector(TRANSFER_SEL, address(0xdead), 42);

        vm.prank(agent);
        vm.expectRevert(PermissionManager.ContractNotAllowed.selector);
        executor.execute(owner, badTarget, data, 0);
    }

    // Test 5: MockTarget configured to revert → ExecutionFailed() revert
    function test_execute_reverts_if_call_fails() public {
        PermissionManager.Permission memory perm = _defaultPermission();
        vm.prank(owner);
        pm.grantPermission(agent, perm);

        target.setShouldRevert(true);
        bytes memory data = abi.encodeWithSelector(TRANSFER_SEL, address(0xdead), 42);

        vm.prank(agent);
        vm.expectRevert(AgentExecutor.ExecutionFailed.selector);
        executor.execute(owner, address(target), data, 0);
    }
}
