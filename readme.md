# Upgradeable Airdrop Transparent

This project is based on different resources found on the internet and as proof of concept it combines:

* Hardhat-deploy
* Transparent Proxy
* ERC20 token, upgradeable
* Airdrop functionality, upgradeable
* Testing with 100% coverage
* Security audit with Slither

## Hardhat-deploy

Plugin for Hardhat (development environment) that allows to write deploy scripts to be easily reused in test scenarios and different test and live networks.

See:
* https://github.com/wighawag/hardhat-deploy, readme of the plugin
* https://github.com/wighawag/tutorial-hardhat-deploy, tutorial
* https://www.youtube.com/watch?v=o-vSmiRzTKI, demo by the author of the plugin
* https://www.npmjs.com/package/hardhat-deploy, package documentation
* https://github.com/wighawag/hardhat-deploy#creating-fixtures, test fixtures, improved test time in about 40%

In any case, the documentation is incomplete and googling you don't find many answers for common problems. For advanced issues you might need to ask here: https://github.com/wighawag/hardhat-deploy/issues

## Transparent Proxy

By using proxies you decouple the entry point and storage from the logic, so you can update the logic keeping the entry point and the values and structure of the storage. There are different flavors of proxies. This project uses the transparent version, where depending on the caller, it can access administrative tasks (if it is the owner of the contract, for example can update the implementation), or delegates the call to the implementation for the non administrative tasks (if the caller is not the owner).

See:
* https://docs.openzeppelin.com/upgrades-plugins/1.x/proxies, explanation of the pattern
* https://docs.openzeppelin.com/contracts/4.x/api/proxy, the contracts and their functions
* https://docs.openzeppelin.com/learn/upgrading-smart-contracts, upgrading contracts tutorial
* https://dev.to/yakult/tutorial-write-upgradeable-smart-contract-proxy-contract-with-openzeppelin-1916, detailed tutorial
* https://www.quicknode.com/guides/ethereum-development/how-to-create-and-deploy-an-upgradeable-smart-contract-using-openzeppelin-and-hardhat, another detailed tutorial

## ERC20 token

Fungible tokens that you can:
* mint (create)
* burn (delete)
* transfer between wallets
* allow to be used by a third party (allowance mechanism)

All this functionality is provided by the base clase. The harder part was to find how to make it upgradeable.

See:
* https://docs.openzeppelin.com/contracts/4.x/erc20, basic documentation
* https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#IERC20, interface description
* https://docs.openzeppelin.com/contracts/4.x/api/token/erc20#ERC20, implementation
* https://www.youtube.com/watch?v=gwn1rVDuGL0, hands-on
* https://www.youtube.com/watch?v=8rpir_ZSK1g, detailed tutorial
* https://docs.openzeppelin.com/upgrades-plugins/1.x/writing-upgradeable, moving to the upgradeable version
* https://www.youtube.com/watch?v=Vt20jCu8OC8, detailed tutorial showing how to move to the upgradeable version

## Airdrop functionality

A common need for a new token is a way to create and increase the user base. This can be done with airdrops, where people sign up to receive free tokens, and when the registration period ends, the users call a contract to collect the new tokens.
Storing a long list of addresses on the blockchain would be very expensive, so the Merkle airdrop is used. This is based on a Merkle tree, which based on a few parameters can tell if an address was registered or not as a receiver.
For this project the development was based on https://medium.com/mochilab/merkle-airdrop-one-of-the-best-airdrop-solution-for-token-issues-e2279df1c5c1, with the upgradeable part added.

See:
* https://itzone.com.vn/en/article/merkle-airdrop-the-airdrop-solution-for-token-issues/, theory and contract
* https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/cryptography/MerkleProof.sol, contract with the Merkle tree functions

## Testing with 100% coverage

Using hardhat-deploy with Chai and Mocha for the tests, and solidity-coverage to evaluate test coverage, with these results:

File                     |  % Stmts | % Branch |  % Funcs |  % Lines |Uncovered Lines |
-------------------------|----------|----------|----------|----------|----------------|
 src/                    |      100 |      100 |      100 |      100 |                |
  AirdropUpgradeable.sol |      100 |      100 |      100 |      100 |                |
  MyTokenUpgradeable.sol |      100 |      100 |      100 |      100 |                |
-------------------------|----------|----------|----------|----------|----------------|
All files                |      100 |      100 |      100 |      100 |                |

See:
* https://itnext.io/how-to-make-tests-using-chai-and-mocha-e9db7d8d48bc, Chai and Mocha tutorial
* https://www.npmjs.com/package/solidity-coverage, package
* https://blog.colony.io/code-coverage-for-solidity-eecfa88668c2/, developer's accompanying article

## Security audit with Slither

Slither is a static analysis framework, that detects potential vulnerabilies in your code.

I installed it with `pip3 install slither-analyzer`, and it detected a few vulnerabilities that were addressed. After correcting them:

```
$ slither . --filter-paths "node_modules"

'npx hardhat compile --force' running
Compiled 10 Solidity files successfully

. analyzed (10 contracts with 81 detectors), 0 result(s) found
```

See:
* https://medium.com/coinmonks/slither-smart-contract-security-tools-29918df0fa8c, review
* https://blog.trailofbits.com/2019/05/27/slither-the-leading-static-analyzer-for-smart-contracts/, blog post by the authors
* https://github.com/crytic/slither, code and readme

## Next steps

Use UUPS proxies instead of transparent, because of the cost of gas incurred by checking for each interaction if the caller is the owner or not.

See:
* https://www.youtube.com/watch?v=kWUDTZhxKZI, Deploying More Efficient Upgradeable Contracts using the UUPS Proxy pattern.
