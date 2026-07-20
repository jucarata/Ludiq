// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {CompetitiveEscrow} from "../src/CompetitiveEscrow.sol";

/// @dev Deploy to Celo Sepolia:
/// forge script script/DeployCompetitiveEscrow.s.sol:DeployCompetitiveEscrow \
///   --rpc-url $CELO_SEPOLIA_RPC_URL --broadcast --private-key $DEPLOYER_PRIVATE_KEY
///
/// Env:
///   STAKE_TOKEN (default: Celo Sepolia USDC)
///   COMMISSION_WALLET
///   ESCROW_OWNER (backend signer; defaults to msg.sender)
contract DeployCompetitiveEscrow is Script {
    // Circle USDC on Celo Sepolia (6 decimals)
    address constant CELO_SEPOLIA_USDC = 0x01C5C0122039549AD1493B8220cABEdD739BC44E;

    function run() external {
        address stakeToken = vm.envOr("STAKE_TOKEN", CELO_SEPOLIA_USDC);
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
        console2.log("stakeToken (USDC):", stakeToken);
        console2.log("commissionWallet:", commission);
        console2.log("owner:", owner_);
    }
}
