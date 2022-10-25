import { HardhatUserConfig } from 'hardhat/types';
import 'hardhat-deploy';
import '@nomiclabs/hardhat-ethers';
import "@nomicfoundation/hardhat-chai-matchers";
import { PANIC_CODES } from "@nomicfoundation/hardhat-chai-matchers/panic";
import 'solidity-coverage'

const config: HardhatUserConfig = {
    solidity: {
        version: '0.8.10',
    },
    namedAccounts: {
        deployer: 0,
        tokenOwner: 1,
        upgradesAdmin: 2
    },
    paths: {
        sources: 'src',
    },
};
export default config;