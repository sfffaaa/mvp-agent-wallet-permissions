// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/PermissionManager.sol";

contract PermissionManagerTest is Test {
    PermissionManager pm;
    address owner = address(0x1);
    address agent = address(0x2);
    address target = address(0x3);
    bytes4 selector = bytes4(keccak256("transfer(address,uint256)"));

    function setUp() public {
        pm = new PermissionManager();
        vm.warp(1_000_000);
    }

    function _perm() internal view returns (PermissionManager.Permission memory) {
        address[] memory cs = new address[](1);
        cs[0] = target;
        bytes4[] memory ss = new bytes4[](1);
        ss[0] = selector;
        return PermissionManager.Permission({
            spendingLimitPerTx: 0.1 ether,
            spendingLimitDaily: 0.5 ether,
            spentToday: 0,
            dayReset: block.timestamp,
            expiry: block.timestamp + 1 hours,
            allowedContracts: cs,
            allowedSelectors: ss,
            active: true
        });
    }

    function test_grantPermission_stores_permission() public {
        vm.prank(owner);
        pm.grantPermission(agent, _perm());
        PermissionManager.Permission memory p = pm.getPermission(owner, agent);
        assertEq(p.spendingLimitPerTx, 0.1 ether);
        assertTrue(p.active);
    }

    function test_revokePermission_sets_inactive() public {
        vm.prank(owner);
        pm.grantPermission(agent, _perm());
        vm.prank(owner);
        pm.revokePermission(agent);
        PermissionManager.Permission memory p = pm.getPermission(owner, agent);
        assertFalse(p.active);
    }

    function test_checkAndRecord_success_records_spend() public {
        vm.prank(owner);
        pm.grantPermission(agent, _perm());
        vm.prank(agent);
        pm.checkAndRecord(owner, agent, target, selector, 0.05 ether);
        PermissionManager.Permission memory p = pm.getPermission(owner, agent);
        assertEq(p.spentToday, 0.05 ether);
    }

    function test_checkAndRecord_revert_notAuthorized() public {
        vm.prank(agent);
        vm.expectRevert(PermissionManager.NotAuthorized.selector);
        pm.checkAndRecord(owner, agent, target, selector, 0.05 ether);
    }

    function test_checkAndRecord_revert_expired() public {
        vm.prank(owner);
        pm.grantPermission(agent, _perm());
        vm.warp(block.timestamp + 2 hours);
        vm.prank(agent);
        vm.expectRevert(PermissionManager.PermissionExpired.selector);
        pm.checkAndRecord(owner, agent, target, selector, 0.05 ether);
    }

    function test_checkAndRecord_revert_exceedsPerTxLimit() public {
        vm.prank(owner);
        pm.grantPermission(agent, _perm());
        vm.prank(agent);
        vm.expectRevert(PermissionManager.ExceedsPerTxLimit.selector);
        pm.checkAndRecord(owner, agent, target, selector, 0.2 ether);
    }

    function test_checkAndRecord_revert_exceedsDailyLimit() public {
        vm.prank(owner);
        pm.grantPermission(agent, _perm());
        for (uint i = 0; i < 5; i++) {
            vm.prank(agent);
            pm.checkAndRecord(owner, agent, target, selector, 0.1 ether);
        }
        vm.prank(agent);
        vm.expectRevert(PermissionManager.ExceedsDailyLimit.selector);
        pm.checkAndRecord(owner, agent, target, selector, 0.05 ether);
    }

    function test_checkAndRecord_revert_contractNotAllowed() public {
        vm.prank(owner);
        pm.grantPermission(agent, _perm());
        vm.prank(agent);
        vm.expectRevert(PermissionManager.ContractNotAllowed.selector);
        pm.checkAndRecord(owner, agent, address(0x999), selector, 0.05 ether);
    }

    function test_checkAndRecord_revert_selectorNotAllowed() public {
        vm.prank(owner);
        pm.grantPermission(agent, _perm());
        bytes4 bad = bytes4(keccak256("badFn()"));
        vm.prank(agent);
        vm.expectRevert(PermissionManager.SelectorNotAllowed.selector);
        pm.checkAndRecord(owner, agent, target, bad, 0.05 ether);
    }

    function test_dailyReset_allows_spend_after_24h() public {
        PermissionManager.Permission memory p = _perm();
        p.expiry = block.timestamp + 25 hours;
        vm.prank(owner);
        pm.grantPermission(agent, p);
        for (uint i = 0; i < 4; i++) {
            vm.prank(agent);
            pm.checkAndRecord(owner, agent, target, selector, 0.1 ether);
        }
        vm.warp(block.timestamp + 1 days + 1);
        vm.prank(agent);
        pm.checkAndRecord(owner, agent, target, selector, 0.1 ether);
        PermissionManager.Permission memory updated = pm.getPermission(owner, agent);
        assertEq(updated.spentToday, 0.1 ether);
    }
}
