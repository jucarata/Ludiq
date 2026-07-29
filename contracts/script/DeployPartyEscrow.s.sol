// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {PartyEscrow} from "../src/PartyEscrow.sol";

/// @dev Deploy PartyEscrow (voluntary contributions, 10% fee capped at $10).
///
/// Celo Mainnet:
///   STAKE_TOKEN=0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e
///   forge script script/DeployPartyEscrow.s.sol:DeployPartyEscrow \
///     --rpc-url https://forno.celo.org --broadcast --private-key $DEPLOYER_PRIVATE_KEY
///
/// Celo Sepolia (default STAKE_TOKEN if unset):
///   forge script script/DeployPartyEscrow.s.sol:DeployPartyEscrow \
///     --rpc-url $CELO_SEPOLIA_RPC_URL --broadcast --private-key $DEPLOYER_PRIVATE_KEY
///
/// Env:
///   STAKE_TOKEN (default: Celo Sepolia USDT)
///   COMMISSION_WALLET
///   ESCROW_OWNER (backend signer; defaults to msg.sender)
contract DeployPartyEscrow is Script {
    address constant CELO_SEPOLIA_USDT = 0xd077A400968890Eacc75cdc901F0356c943e4fDb;

    function run() external {
        address stakeToken = vm.envOr("STAKE_TOKEN", CELO_SEPOLIA_USDT);
        address commission = vm.envAddress("COMMISSION_WALLET");
        address owner_ = vm.envOr("ESCROW_OWNER", address(0));

        vm.startBroadcast();
        if (owner_ == address(0)) {
            owner_ = msg.sender;
        }
        PartyEscrow escrow = new PartyEscrow(stakeToken, commission, owner_);
        vm.stopBroadcast();

        console2.log("PartyEscrow:", address(escrow));
        console2.log("stakeToken (USDT):", stakeToken);
        console2.log("commissionWallet:", commission);
        console2.log("owner:", owner_);
    }
}
