const { expect } = require("chai");
const { ethers } = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("MerkleDistributorV1.sol", () => {
  let owner, account1, account2, account3, account4;

  let ownerAddress,
    account1Address,
    account2Address,
    account3Address,
    account4Address;

  let TestERC20, testERC20, testERC20Address;

  let airdropAccounts = [];

  const buf2Hex = (x) => "0x" + x.toString("hex");

  let leaves, tree, root, hexRoot;

  let MerkleDistributor, merkleDistributor, merkleDistributorAddress;

  beforeEach(async () => {
    [owner, account1, account2, account3, account4] = await ethers.getSigners();

    ownerAddress = await owner.getAddress();
    account1Address = await account1.getAddress();
    account2Address = await account2.getAddress();
    account3Address = await account3.getAddress();
    account4Address = await account4.getAddress();

    airdropAccounts[0] = account1Address;
    airdropAccounts[1] = account2Address;
    airdropAccounts[2] = account3Address;
    airdropAccounts[3] = account4Address;

    leaves = airdropAccounts.map((account, index) => {
      return ethers.utils.solidityKeccak256(
        ["uint256", "address", "uint256"],
        [index, account, ethers.utils.parseEther("50")]
      );
    });

    tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

    root = tree.getRoot();
    hexRoot = buf2Hex(root);

    TestERC20 = await ethers.getContractFactory("TestERC20");
    testERC20 = await TestERC20.deploy(
      "Test Token",
      "TT",
      ethers.utils.parseEther("200")
    );
    await testERC20.deployed();
    testERC20Address = await testERC20.address;

    MerkleDistributor = await ethers.getContractFactory("MerkleDistributorV1");
    merkleDistributor = await MerkleDistributor.deploy(
      testERC20Address,
      hexRoot
    );
    await merkleDistributor.deployed();
    merkleDistributorAddress = await merkleDistributor.address;
  });

  describe("Correct Setup", () => {
    it("Should have name 'Test Token'.", async () => {
      const name = await testERC20.name();
      expect(name).to.equal("Test Token");
    });

    it("Should have symbol 'TT'.", async () => {
      const symbol = await testERC20.symbol();
      expect(symbol).to.equal("TT");
    });

    it("Should have the correct total supply.", async () => {
      const totalSupply = await testERC20.totalSupply();
      const expectedTotalSupply = ethers.utils.parseEther("200");
      expect(totalSupply).to.equal(expectedTotalSupply);
    });

    it("The owner should have the correct balance.", async () => {
      const balance = await testERC20.balanceOf(ownerAddress);
      const expectedBalance = ethers.utils.parseEther("200");
      expect(balance).to.equal(expectedBalance);
    });

    it("The merkle distributor have correct token address", async () => {
      const tokenAddress = await merkleDistributor.token();
      expect(tokenAddress).to.equal(testERC20Address);
    });

    it("The merkle distributor have correct token address", async () => {
      const merkleRoot = await merkleDistributor.merkleRoot();
      expect(merkleRoot).to.equal(hexRoot);
    });

    it("The merkle distributor have correct description", async () => {
      const description = await merkleDistributor.description();
      const expectedDescription = "Normal Merkle Distributor contract";
      expect(description).to.equal(expectedDescription);
    });
  });

  describe("Token distribution using merkle tree", () => {
    it("Token distribution should be correct", async () => {
      await testERC20.transfer(
        merkleDistributorAddress,
        ethers.utils.parseEther("200")
      );

      let status, proof;
      for (let index = 0; index < airdropAccounts.length; index++) {
        status = await merkleDistributor.isClaimed(index);
        expect(status).to.be.false;

        proof = tree.getProof(leaves[index]).map((item) => buf2Hex(item.data));

        await merkleDistributor.claim(
          index,
          airdropAccounts[index],
          ethers.utils.parseEther("50"),
          proof
        );

        status = await merkleDistributor.isClaimed(index);
        expect(status).to.be.true;
      }
    });

    it("Should revert when claiming for the same index more than once", async () => {
      await testERC20.transfer(
        merkleDistributorAddress,
        ethers.utils.parseEther("200")
      );

      const proof = tree.getProof(leaves[0]).map((item) => buf2Hex(item.data));

      await merkleDistributor.claim(
        0,
        airdropAccounts[0],
        ethers.utils.parseEther("50"),
        proof
      );

      await expect(
        merkleDistributor.claim(
          0,
          airdropAccounts[0],
          ethers.utils.parseEther("50"),
          proof
        )
      ).to.be.revertedWith("MerkleDistributor: Drop already claimed.");
    });

    it("Should revert when claiming with invalid proof", async () => {
      const proof = tree.getProof(leaves[0]).map((item) => buf2Hex(item.data));

      await expect(
        merkleDistributor.claim(
          1,
          airdropAccounts[1],
          ethers.utils.parseEther("50"),
          proof
        )
      ).to.be.revertedWith("MerkleDistributor: Invalid proof.");
    });

    it("Should revert if the contract doesn't have enough balance.", async () => {
      const proof = tree.getProof(leaves[0]).map((item) => buf2Hex(item.data));

      await expect(
        merkleDistributor.claim(
          0,
          airdropAccounts[0],
          ethers.utils.parseEther("50"),
          proof
        )
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });
  });
});
