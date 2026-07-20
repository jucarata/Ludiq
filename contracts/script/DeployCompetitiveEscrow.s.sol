// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {CompetitiveEscrow} from "../src/CompetitiveEscrow.sol";

/// @dev Deploy CompetitiveEscrow (entry 0.20 USDT = 0.18 pool + 0.02 commission).
///
/// Celo Mainnet (Proof of Ship):
///   STAKE_TOKEN=0x48065fbBE25f71C9282ddf5e1cD6D6A887483D5e  # Tether USDT
///   forge script script/DeployCompetitiveEscrow.s.sol:DeployCompetitiveEscrow \
///     --rpc-url https://forno.celo.org --broadcast --private-key $DEPLOYER_PRIVATE_KEY
///
/// Celo Sepolia (default STAKE_TOKEN if unset):
///   forge script script/DeployCompetitiveEscrow.s.sol:DeployCompetitiveEscrow \
///     --rpc-url $CELO_SEPOLIA_RPC_URL --broadcast --private-key $DEPLOYER_PRIVATE_KEY
///
/// Env:
///   STAKE_TOKEN (default: Celo Sepolia USDT — set mainnet USDT for production)
///   COMMISSION_WALLET
///   ESCROW_OWNER (backend signer; defaults to msg.sender)
contract DeployCompetitiveEscrow is Script {
    // Tether USDT on Celo Sepolia (6 decimals) — override with mainnet USDT for prod
    address constant CELO_SEPOLIA_USDT = 0xd077A400968890Eacc75cdc901F0356c943e4fDb;

    function run() external {
        address stakeToken = vm.envOr("STAKE_TOKEN", CELO_SEPOLIA_USDT);
        address commission = vm.envAddress("COMMISSION_WALLET");
        address owner_ = vm.envOr("ESCROW_OWNER", address(0));

        vm.startBroadcast();
        if (owner_ == address(0)) {
            owner_ = msg.sender;
        }
        CompetitiveEscrow escrow = new CompetitiveEscrow(
            stakeToken,
            commission,
            owner_
        );
        vm.stopBroadcast();

        console2.log("CompetitiveEscrow:", address(escrow));
        console2.log("stakeToken (USDT):", stakeToken);
        console2.log("commissionWallet:", commission);
        console2.log("owner:", owner_);
    }
}
