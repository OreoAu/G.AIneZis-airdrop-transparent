// SPDX-License-Identifier: MIT
// Based on https://medium.com/mochilab/merkle-airdrop-one-of-the-best-airdrop-solution-for-token-issues-e2279df1c5c1
pragma solidity ^0.8.0;

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

    function initialize(IERC20Upgradeable _token) external initializer {
        __Ownable_init();
        setToken(_token);
    }

    function setToken(IERC20Upgradeable _token) public onlyOwner {
        token = _token;
    }

    function seedNewAllocations(bytes32 _merkleRoot, uint256 _totalAllocation)
        public
        onlyOwner
        returns (uint256 trancheId)
    {
        token.transferFrom(msg.sender, address(this), _totalAllocation);
        trancheId = tranches;
        merkleRoots[trancheId] = _merkleRoot;
        tranches = tranches + 1;
        emit TrancheAdded(trancheId, _merkleRoot, _totalAllocation);
    }

    function expireTranche(
        uint256 _trancheId /*onlyOwner*/
    ) public {
        merkleRoots[_trancheId] = bytes32(0);
        emit TrancheExpired(_trancheId);
    }

    function claimWeek(
        address _liquidityProvider,
        uint256 _tranche,
        uint256 _balance,
        bytes32[] memory _merkleProof
    ) public {
        _claimWeek(_liquidityProvider, _tranche, _balance, _merkleProof);
        _disburse(_liquidityProvider, _balance);
    }

    function claimWeeks(
        address _liquidityProvider,
        uint256[] memory _tranches,
        uint256[] memory _balances,
        bytes32[][] memory _merkleProofs
    ) public {
        uint256 len = _tranches.length;
        require(
            len == _balances.length && len == _merkleProofs.length,
            "Mismatching inputs"
        );
        uint256 totalBalance = 0;
        for (uint256 i = 0; i < len; i++) {
            _claimWeek(
                _liquidityProvider,
                _tranches[i],
                _balances[i],
                _merkleProofs[i]
            );
            totalBalance = totalBalance + _balances[i];
        }
        _disburse(_liquidityProvider, totalBalance);
    }

    function verifyClaim(
        address _liquidityProvider,
        uint256 _tranche,
        uint256 _balance,
        bytes32[] memory _merkleProof
    ) public view returns (bool valid) {
        return
            _verifyClaim(_liquidityProvider, _tranche, _balance, _merkleProof);
    }

    function _claimWeek(
        address _liquidityProvider,
        uint256 _tranche,
        uint256 _balance,
        bytes32[] memory _merkleProof
    ) private {
        require(_tranche < tranches, "Week cannot be in the future");
        require(
            !claimed[_tranche][_liquidityProvider],
            "LP has already claimed"
        );
        require(
            _verifyClaim(_liquidityProvider, _tranche, _balance, _merkleProof),
            "Incorrect merkle proof"
        );
        claimed[_tranche][_liquidityProvider] = true;
        emit Claimed(_liquidityProvider, _tranche, _balance);
    }

    function verifyLeaf(
        bytes32 leaf,
        address _liquidityProvider,
        uint256 _balance
    ) public pure returns (bool) {
        bytes32 cleaf = keccak256(
            abi.encodePacked(_liquidityProvider, _balance)
        );
        return (leaf == cleaf);
    }

    function _verifyClaim(
        address _liquidityProvider,
        uint256 _tranche,
        uint256 _balance,
        bytes32[] memory _merkleProof
    ) private view returns (bool valid) {
        bytes32 leaf = keccak256(
            abi.encodePacked(_liquidityProvider, _balance)
        );
        return MerkleProof.verify(_merkleProof, merkleRoots[_tranche], leaf);
    }

    function _disburse(address _liquidityProvider, uint256 _balance) private {
        if (_balance > 0) {
            token.transfer(_liquidityProvider, _balance);
        } else {
            revert(
                "No balance would be transferred - not going to waste your gas"
            );
        }
    }
}
