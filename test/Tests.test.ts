import { expect } from "./chai-setup";
import { setupUsers, setupUser } from "./utils";
import { ethers, deployments, getNamedAccounts, getUnnamedAccounts } from "hardhat";
import { PANIC_CODES } from "@nomicfoundation/hardhat-chai-matchers/panic";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";

const setup = deployments.createFixture(
    async ({ deployments, getNamedAccounts, ethers }, options) => {
        await deployments.fixture(["Token"]);
        const { deployer, tokenOwner, upgradesAdmin } = await getNamedAccounts();
        const contracts = {
            Admin: await ethers.getContract("DefaultProxyAdmin"),
            Token: await ethers.getContract("MyTokenUpgradeable"),
            TokenImplementation: await ethers.getContract("MyTokenUpgradeable_Implementation"),
            Token2: await ethers.getContract("Token2"),
            Airdrop: await ethers.getContract("AirdropUpgradeable"),
            AirdropImplementation: await ethers.getContract("AirdropUpgradeable_Implementation"),
            Airdrop2: await ethers.getContract("Airdrop2"),
        }
        const users = await setupUsers(await getUnnamedAccounts(), contracts);
        const list = [ethers.utils.solidityPack(["address", "uint256"], [users[0].address, 10]), ethers.utils.solidityPack(["address", "uint256"], [users[1].address, 10])];
        const merkleTree = new MerkleTree(list, keccak256, { hashLeaves: true, sortPairs: true });
        return {
            ...contracts,
            users,
            deployer: await setupUser(deployer, contracts),
            tokenOwner: await setupUser(tokenOwner, contracts),
            upgradesAdmin: await setupUser(upgradesAdmin, contracts),
            merkleTree,
        };
    }
);

describe("Token contract", function () {
    it("Should be upgradeable, only by Admin", async function () {
        const { Token, Admin, TokenImplementation, Token2, upgradesAdmin } = await setup();
        expect(await upgradesAdmin.Admin.getProxyImplementation(Token.address)).to.equal(TokenImplementation.address);  // "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0");
        await (expect(Admin.upgrade(Token.address, Token2.address))).to.be.revertedWith("Ownable: caller is not the owner");
        await (expect(upgradesAdmin.Admin.upgrade(Token.address, Token2.address))).to.emit(Token, "Upgraded").withArgs(Token2.address);
        expect(await upgradesAdmin.Admin.getProxyImplementation(Token.address)).to.equal(Token2.address);  // "0x5FbDB2315678afecb367f032d93F642f64180aa3");
    });

    it("Should set the right owner", async function () {
        const { Token, tokenOwner } = await setup();
        expect(await Token.owner()).to.equal(tokenOwner.address);
    });

    it("Should assign the total supply of tokens to the owner", async function () {
        const { Token, tokenOwner } = await setup();
        const ownerBalance = await Token.balanceOf(tokenOwner.address);
        expect(await Token.totalSupply()).to.equal(ownerBalance);
    });

    it("Should be able to mint, only owner", async function () {
        const { Token, tokenOwner } = await setup();
        const ownerBalance = await Token.balanceOf(tokenOwner.address);
        await (expect(Token.mint(tokenOwner.address, 100))).to.be.revertedWith("Ownable: caller is not the owner");
        await tokenOwner.Token.mint(tokenOwner.address, 100);
        expect(await Token.totalSupply()).to.equal(Number(ownerBalance) + 100);
        expect(await Token.balanceOf(tokenOwner.address)).to.equal(Number(ownerBalance) + 100);
    });

    it("Should be able to burn, only owner", async function () {
        const { Token, tokenOwner } = await setup();
        const ownerBalance = await Token.balanceOf(tokenOwner.address);
        await (expect(Token.burn(tokenOwner.address, 100))).to.be.revertedWith("Ownable: caller is not the owner");
        await tokenOwner.Token.burn(tokenOwner.address, 100);
        expect(await Token.totalSupply()).to.equal(ownerBalance - 100);
        expect(await Token.balanceOf(tokenOwner.address)).to.equal(ownerBalance - 100);
    });

    it("Should transfer tokens between accounts", async function () {
        const { Token, users, tokenOwner } = await setup();
        // Transfer 50 tokens from owner to users[0]
        await tokenOwner.Token.transfer(users[0].address, 50);
        const users0Balance = await Token.balanceOf(users[0].address);
        expect(users0Balance).to.equal(50);

        // Transfer 50 tokens from users[0] to users[1]
        await users[0].Token.transfer(users[1].address, 50);
        const users1Balance = await Token.balanceOf(users[1].address);
        expect(users1Balance).to.equal(50);
    });

    it("Should transfer according to ERC20", async function () {
        const { Token, users, tokenOwner } = await setup();
        const initialOwnerBalance = await Token.balanceOf(tokenOwner.address);

        // Try to send 1 token from users[0] (0 tokens) to owner (1000 tokens).
        // `require` will evaluate false and revert the transaction.
        await expect(users[0].Token.transfer(tokenOwner.address, 1)).to.be.revertedWith("ERC20: transfer amount exceeds balance");

        // But transfer of 0 should work, even emitting an event.
        await expect(users[0].Token.transfer(users[1].address, 0)).to.emit(Token, "Transfer").withArgs(users[0].address, users[1].address, 0);

        // Transfer to zero address should revert.
        await expect(tokenOwner.Token.transfer("0x0000000000000000000000000000000000000000", 0)).to.be.revertedWith("ERC20: transfer to the zero address");

        // Owner balance shouldn't have changed.
        expect(await Token.balanceOf(tokenOwner.address)).to.equal(initialOwnerBalance);
    });

    it("Should work with the allowance mechanism", async function () {
        const { Token, users, tokenOwner } = await setup();
        const initialOwnerBalance = await Token.balanceOf(tokenOwner.address);

        // Allowance should start in 0.
        expect(await Token.allowance(tokenOwner.address, users[0].address)).to.equal(0);

        // Owner approves 100 for users[0] to expend.
        await expect(tokenOwner.Token.approve(users[0].address, 100)).to.emit(Token, "Approval").withArgs(tokenOwner.address, users[0].address, 100);

        // Allowance should be 100 now.
        expect(await Token.allowance(tokenOwner.address, users[0].address)).to.equal(100);

        // Allowance should decrease in 30.
        await expect(tokenOwner.Token.decreaseAllowance(users[0].address, 30)).to.emit(Token, "Approval").withArgs(tokenOwner.address, users[0].address, 70);
        expect(await Token.allowance(tokenOwner.address, users[0].address)).to.equal(70);

        // Spender spends 60
        await users[0].Token.transferFrom(tokenOwner.address, users[1].address, 60);
        expect(await Token.allowance(tokenOwner.address, users[0].address)).to.equal(10);
        // Owner balance should have changed.
        expect(await Token.balanceOf(tokenOwner.address)).to.equal(initialOwnerBalance - 60);
        expect(await Token.balanceOf(users[0].address)).to.equal(0);
        expect(await Token.balanceOf(users[1].address)).to.equal(60);

        // Infinite approval
        const maxUint256 = "115792089237316195423570985008687907853269984665640564039457584007913129639935";
        await tokenOwner.Token.approve(users[1].address, maxUint256);
        expect(await Token.allowance(tokenOwner.address, users[1].address)).to.equal(maxUint256);
        await users[1].Token.transferFrom(tokenOwner.address, users[0].address, 70);
        expect(await Token.balanceOf(tokenOwner.address)).to.equal(initialOwnerBalance - 60 - 70);
        expect(await Token.balanceOf(users[0].address)).to.equal(70);
        expect(await Token.balanceOf(users[1].address)).to.equal(60);
        expect(await Token.allowance(tokenOwner.address, users[1].address)).to.equal(maxUint256);
        await expect(tokenOwner.Token.increaseAllowance(users[1].address, 100)).to.be.revertedWithPanic(PANIC_CODES.ARITHMETIC_UNDER_OR_OVERFLOW);
        expect(await Token.allowance(tokenOwner.address, users[1].address)).to.equal(maxUint256);
    });
    it("Should not initialize twice", async function () {
        const { Token, upgradesAdmin, tokenOwner } = await setup();
        await expect(upgradesAdmin.Token.initialize(tokenOwner.address, 1000)).to.be.revertedWith("Initializable: contract is already initialized");
    });
});

describe("IERC20 metadata functions", function () {
    it("Should match name, symbol and decimals", async function () {
        const { Token } = await setup();
        // Check name
        const name = await Token.name();
        expect(name).to.equal("Mojo");
        // Check symbol
        const symbol = await Token.symbol();
        expect(symbol).to.equal("MOJ");
        // Check decimals
        const decimals = await Token.decimals();
        expect(decimals).to.equal(18);
    });
});

describe("Airdrop contract", function () {
    it("Should be upgradeable, only by Admin", async function () {
        const { Airdrop, Admin, AirdropImplementation, Airdrop2, upgradesAdmin } = await setup();
        expect(await Admin.getProxyImplementation(Airdrop.address)).to.equal(AirdropImplementation.address);
        await (expect(Admin.upgrade(Airdrop.address, Airdrop2.address))).to.be.revertedWith("Ownable: caller is not the owner");
        await (expect(upgradesAdmin.Admin.upgrade(Airdrop.address, Airdrop2.address))).to.emit(Airdrop, "Upgraded").withArgs(Airdrop2.address);
        expect(await upgradesAdmin.Admin.getProxyImplementation(Airdrop.address)).to.equal(Airdrop2.address);
    });
    it("Should have the upgradeable token associated", async function () {
        const { Token, Airdrop, users, deployer } = await setup();
        expect(await Airdrop.token()).to.equal(Token.address);
    });
    describe("Airdrop functionality", function () {
        it("Should create an allocation, only owner", async function () {
            const { Token, Airdrop, users, deployer, tokenOwner, merkleTree } = await setup();
            await tokenOwner.Token.transfer(deployer.address, 1000);
            await expect(deployer.Token.approve(Airdrop.address, 1000)).to.emit(Token, "Approval").withArgs(deployer.address, Airdrop.address, 1000);
            expect(await Token.allowance(deployer.address, Airdrop.address)).to.equal(1000);
            const merkleRoot = merkleTree.getRoot();
            await expect(users[0].Airdrop.seedNewAllocations(merkleRoot, 100)).to.be.revertedWith("Ownable: caller is not the owner");
            await expect(Airdrop.seedNewAllocations(merkleRoot, 100)).to.emit(Airdrop, "TrancheAdded").withArgs(0, "0x" + merkleRoot.toString("hex"), 100);
            expect(await Token.balanceOf(Airdrop.address)).to.equal(100);
            const leaf = keccak256(ethers.utils.solidityPack(["address", "uint256"], [users[1].address, 10]));
            const merkleProof = merkleTree.getHexProof(leaf);
            expect(await Airdrop.verifyLeaf(leaf, users[1].address, 10)).to.equal(true);
            expect(await Airdrop.verifyClaim(users[1].address, 0, 10, merkleProof)).to.equal(true);
            const wrongLeaf = keccak256(ethers.utils.solidityPack(["address", "uint256"], [users[2].address, 10]));
            expect(await Airdrop.verifyLeaf(wrongLeaf, users[2].address, 10)).to.equal(true);              // leaf is ok
            const wrongMerkleProof = merkleTree.getHexProof(wrongLeaf);
            expect(await Airdrop.verifyClaim(users[2].address, 0, 10, merkleProof)).to.equal(false);       // but address nor
            expect(await Airdrop.verifyClaim(users[2].address, 0, 10, wrongMerkleProof)).to.equal(false);  // leaf do not belong to the Merkle tree
        });
        it("Should claim the airdrop, only once, only for the registred addresses", async function () {
            const { Token, Airdrop, users, deployer, tokenOwner, merkleTree } = await setup();
            await tokenOwner.Token.transfer(deployer.address, 1000);
            await deployer.Token.approve(Airdrop.address.toLowerCase(), 1000);
            await Airdrop.seedNewAllocations(merkleTree.getRoot(), 100);
            const leaf = keccak256(ethers.utils.solidityPack(["address", "uint256"], [users[1].address, 10]));
            const merkleProof = merkleTree.getHexProof(leaf);
            expect(await Token.balanceOf(users[1].address)).to.equal(0);
            await expect(Airdrop.claimWeek(users[1].address, 0, 10, merkleProof)).to.emit(Airdrop, "Claimed").withArgs(users[1].address, 0, 10);
            expect(await Token.balanceOf(users[1].address)).to.equal(10);
            expect(await Token.balanceOf(Airdrop.address)).to.equal(90);
            await expect(Airdrop.claimWeek(users[1].address, 0, 10, merkleProof)).to.be.revertedWith("LP has already claimed");
            expect(await Token.balanceOf(users[1].address)).to.equal(10);
            await expect(Airdrop.claimWeek(users[2].address, 0, 10, merkleProof)).to.be.revertedWith("Incorrect merkle proof");
            expect(await Token.balanceOf(users[2].address)).to.equal(0);
            expect(await Token.balanceOf(Airdrop.address)).to.equal(90);
            await expect(Airdrop.claimWeek(users[1].address, 1, 10, merkleProof)).to.be.revertedWith("Week cannot be in the future");
        });
        it("Should expire the tranch and not allow more claims for it", async function () {
            const { Token, Airdrop, users, deployer, tokenOwner, merkleTree } = await setup();
            await tokenOwner.Token.transfer(deployer.address, 1000);
            await deployer.Token.approve(Airdrop.address.toLowerCase(), 1000);
            await Airdrop.seedNewAllocations(merkleTree.getRoot(), 100);
            const merkleRoot = merkleTree.getRoot();
            const leaf = keccak256(ethers.utils.solidityPack(["address", "uint256"], [users[0].address, 10]));
            const merkleProof = merkleTree.getHexProof(leaf);
            await expect(Airdrop.claimWeek(users[0].address, 0, 10, merkleProof)).to.emit(Airdrop, "Claimed").withArgs(users[0].address, 0, 10);
            await expect(Airdrop.expireTranche(0)).to.emit(Airdrop, "TrancheExpired").withArgs(0);
            const leaf1 = keccak256(ethers.utils.solidityPack(["address", "uint256"], [users[1].address, 10]));
            const merkleProof1 = merkleTree.getHexProof(leaf1);
            await expect(Airdrop.claimWeek(users[1].address, 0, 10, merkleProof1)).to.be.revertedWith("Incorrect merkle proof");
            expect(await Token.balanceOf(users[1].address)).to.equal(0);
        });
        it("Should claim two weeks at once", async function () {
            const { Token, Airdrop, users, deployer, tokenOwner } = await setup();
            const list0 = [ethers.utils.solidityPack(["address", "uint256"], [users[0].address, 10]), ethers.utils.solidityPack(["address", "uint256"], [users[1].address, 10])];
            const list1 = [ethers.utils.solidityPack(["address", "uint256"], [users[1].address, 10]), ethers.utils.solidityPack(["address", "uint256"], [users[2].address, 10])];
            const merkleTree0 = new MerkleTree(list0, keccak256, { hashLeaves: true, sortPairs: true });
            const merkleTree1 = new MerkleTree(list1, keccak256, { hashLeaves: true, sortPairs: true });
            await tokenOwner.Token.transfer(deployer.address, 1000);
            await deployer.Token.approve(Airdrop.address.toLowerCase(), 1000);
            await Airdrop.seedNewAllocations(merkleTree0.getRoot(), 100);
            await Airdrop.seedNewAllocations(merkleTree1.getRoot(), 100);
            const merkleRoot0 = merkleTree0.getRoot();
            const merkleRoot1 = merkleTree1.getRoot();
            const leaf = keccak256(ethers.utils.solidityPack(["address", "uint256"], [users[1].address, 10]));
            const merkleProof0 = merkleTree0.getHexProof(leaf);
            const merkleProof1 = merkleTree1.getHexProof(leaf);
            await expect(Airdrop.claimWeeks(users[1].address, [0, 1], [10, 10], [merkleProof0])).to.be.revertedWith("Mismatching inputs");
            await expect(Airdrop.claimWeeks(users[1].address, [0, 1], [10], [merkleProof0, merkleProof1])).to.be.revertedWith("Mismatching inputs");
            await expect(Airdrop.claimWeeks(users[1].address, [0], [10, 10], [merkleProof0, merkleProof1])).to.be.revertedWith("Mismatching inputs");
            await expect(Airdrop.claimWeeks(users[1].address, [0, 1], [10, 10], [merkleProof0, merkleProof1]))
                .to.emit(Airdrop, "Claimed").withArgs(users[1].address, 0, 10)
                .to.emit(Airdrop, "Claimed").withArgs(users[1].address, 1, 10);
            expect(await Token.balanceOf(users[1].address)).to.equal(20);
            const leaf0 = keccak256(ethers.utils.solidityPack(["address", "uint256"], [users[0].address, 10]));
            const merkleProof00 = merkleTree0.getHexProof(leaf0);
            const merkleProof01 = merkleTree1.getHexProof(leaf0);
            await expect(Airdrop.claimWeeks(users[0].address, [0, 1], [10, 10], [merkleProof00, merkleProof01])).to.be.revertedWith("Incorrect merkle proof");
            expect(await Token.balanceOf(users[0].address)).to.equal(0);
        });
        it("Should not attempt to transfer if the registered address has 0 assigned", async function () {
            const { Token, Airdrop, users, deployer, tokenOwner } = await setup();
            const list = [ethers.utils.solidityPack(["address", "uint256"], [users[0].address, 100]), ethers.utils.solidityPack(["address", "uint256"], [users[1].address, 0])];
            const merkleTree = new MerkleTree(list, keccak256, { hashLeaves: true, sortPairs: true });
            await tokenOwner.Token.transfer(deployer.address, 1000);
            await deployer.Token.approve(Airdrop.address.toLowerCase(), 1000);
            await Airdrop.seedNewAllocations(merkleTree.getRoot(), 100);
            const leaf0 = keccak256(ethers.utils.solidityPack(["address", "uint256"], [users[0].address, 100]));
            const merkleProof0 = merkleTree.getHexProof(leaf0);
            await expect(Airdrop.claimWeek(users[0].address, 0, 100, merkleProof0)).to.emit(Airdrop, "Claimed").withArgs(users[0].address, 0, 100);
            const leaf1 = keccak256(ethers.utils.solidityPack(["address", "uint256"], [users[1].address, 0]));
            const merkleProof1 = merkleTree.getHexProof(leaf1);
            await expect(Airdrop.claimWeek(users[1].address, 0, 0, merkleProof1)).to.be.revertedWith("No balance would be transferred - not going to waste your gas");
        });
        it("Should not initialize twice", async function () {
            const { Airdrop, upgradesAdmin, Token } = await setup();
            await expect(upgradesAdmin.Airdrop.initialize(Token.address)).to.be.revertedWith("Initializable: contract is already initialized");
        });
        it("Should not set token other than the owner", async function () {
            const { Airdrop, upgradesAdmin, Token } = await setup();
            await expect(upgradesAdmin.Airdrop.setToken(Token.address)).to.be.revertedWith("Ownable: caller is not the owner");
        });
    });
});
