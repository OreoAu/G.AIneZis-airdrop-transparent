//SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract MyTokenUpgradeable is
    Initializable,
    ERC20Upgradeable,
    OwnableUpgradeable
{
    function initialize(address _owner, uint256 _initial_supply)
        external
        initializer
    {
        __ERC20_init("Mojo", "MOJ");
        __Ownable_init();
        _mint(_owner, _initial_supply);
        _transferOwnership(_owner);
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address account, uint256 amount) public virtual onlyOwner {
        _burn(account, amount);
    }
}
