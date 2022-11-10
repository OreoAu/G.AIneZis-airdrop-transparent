// SPDX-License-Identifier: MIT
// Based on https://medium.com/mochilab/merkle-airdrop-one-of-the-best-airdrop-solution-for-token-issues-e2279df1c5c1
pragma solidity ^0.8.16;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract AirdropUpgradeable is OwnableUpgradeable {
    event Claimed(address claimant, uint256 week, uint256 balance);
    event TrancheAdded(
        uint256 tranche,
        bytes32 merkleRoot,
        uint256 totalAmount
    );
    event TrancheExpired(uint256 tranche);

    IERC20Upgradeable public token;
    mapping(uint256 => bytes32) public merkleRoots;
    mapping(uint256 => mapping(address => bool)) public claimed;
    uint256 public tranches;

    function initialize(IERC20Upgradeable initToken) external initializer {
        __Ownable_init();
        setToken(initToken);
    }

    function setToken(IERC20Upgradeable newToken) public onlyOwner {
        token = newToken;
    }

    function seedNewAllocations(bytes32 merkleRoot, uint256 totalAllocation)
        public
        onlyOwner
        returns (uint256 trancheId)
    {
        trancheId = tranches;
        merkleRoots[trancheId] = merkleRoot;
        tranches = tranches + 1;
        emit TrancheAdded(trancheId, merkleRoot, totalAllocation);
        bool success = token.transferFrom(
            msg.sender,
            address(this),
            totalAllocation
        );
        require(success, "`transferFrom` failed");
    }

    function expireTranche(uint256 trancheId) public onlyOwner {
        merkleRoots[trancheId] = bytes32(0);
        emit TrancheExpired(trancheId);
    }

    function claimWeek(
        address liquidityProvider,
        uint256 tranche,
        uint256 balance,
        bytes32[] memory merkleProof
    ) public {
        _claimWeek(liquidityProvider, tranche, balance, merkleProof);
        _disburse(liquidityProvider, balance);
    }

    function claimWeeks(
        address liquidityProvider,
        uint256[] memory parTranches,
        uint256[] memory balances,
        bytes32[][] memory merkleProofs
    ) public {
        uint256 len = parTranches.length;
        require(
            len == balances.length && len == merkleProofs.length,
            "Mismatching inputs"
        );
        uint256 totalBalance = 0;
        for (uint256 i = 0; i < len; i++) {
            _claimWeek(
                liquidityProvider,
                parTranches[i],
                balances[i],
                merkleProofs[i]
            );
            totalBalance = totalBalance + balances[i];
        }
        _disburse(liquidityProvider, totalBalance);
    }

    function verifyClaim(
        address liquidityProvider,
        uint256 tranche,
        uint256 balance,
        bytes32[] memory merkleProof
    ) public view returns (bool valid) {
        return _verifyClaim(liquidityProvider, tranche, balance, merkleProof);
    }

    function _claimWeek(
        address liquidityProvider,
        uint256 tranche,
        uint256 balance,
        bytes32[] memory merkleProof
    ) private {
        require(tranche < tranches, "Week cannot be in the future");
        require(!claimed[tranche][liquidityProvider], "LP has already claimed");
        require(
            _verifyClaim(liquidityProvider, tranche, balance, merkleProof),
            "Incorrect merkle proof"
        );
        claimed[tranche][liquidityProvider] = true;
        emit Claimed(liquidityProvider, tranche, balance);
    }

    function verifyLeaf(
        bytes32 leaf,
        address liquidityProvider,
        uint256 balance
    ) public pure returns (bool) {
        bytes32 cleaf = keccak256(abi.encodePacked(liquidityProvider, balance));
        return (leaf == cleaf);
    }

    function _verifyClaim(
        address liquidityProvider,
        uint256 tranche,
        uint256 balance,
        bytes32[] memory merkleProof
    ) private view returns (bool valid) {
        bytes32 leaf = keccak256(abi.encodePacked(liquidityProvider, balance));
        return MerkleProof.verify(merkleProof, merkleRoots[tranche], leaf);
    }

    function _disburse(address liquidityProvider, uint256 balance) private {
        if (balance > 0) {
            bool success = token.transfer(liquidityProvider, balance);
            require(success, "`transfer` failed");
        } else {
            revert(
                "No balance would be transferred - not going to waste your gas"
            );
        }
    }
}
