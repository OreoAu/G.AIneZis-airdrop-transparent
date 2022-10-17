import { HardhatRuntimeEnvironment } from 'hardhat/types';
import { DeployFunction } from 'hardhat-deploy/types';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
    const { deployments, getNamedAccounts } = hre;
    const { deploy } = deployments;

    const { deployer, tokenOwner, upgradesAdmin } = await getNamedAccounts();

    const token = await deploy('MyTokenUpgradeable', {
        from: deployer,
        skipIfAlreadyDeployed: true,
        proxy: {
            owner: upgradesAdmin,
            proxyContract: 'OpenZeppelinTransparentProxy',
            execute: {
                methodName: "initialize",
                args: [tokenOwner, 1000]
            }
        },
        // proxy: {
        //     // owner: tokenOwner,
        //     methodName: 'initialize',
        // },
        // args: [tokenOwner.address],
        log: true,
    });

    await deploy('Token2', {
        contract: 'MyTokenUpgradeable',
        from: deployer,
        log: true,
    });

    await deploy('AirdropUpgradeable', {
        from: deployer,
        skipIfAlreadyDeployed: true,
        proxy: {
            owner: upgradesAdmin,
            proxyContract: 'OpenZeppelinTransparentProxy',
            execute: {
                methodName: "initialize",
                args: [token.address]
            }
        },
        log: true,
    });

    await deploy('Airdrop2', {
        contract: 'AirdropUpgradeable',
        from: deployer,
        log: true,
    });

};
export default func;
func.tags = ['Token'];