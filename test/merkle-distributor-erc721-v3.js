const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("MerkleDistributorERC721V3.sol", () => {
  let owner, account1, account2, account3, account4;

  let ownerAddress,
    account1Address,
    account2Address,
    account3Address,
    account4Address;

  let airdropData = [];

  const buf2Hex = (x) => "0x" + x.toString("hex");

  let leaves, tree, root, timelock;

  let MerkleDistributorERC721V3,
    merkleDistributorERC721V3,
    merkleDistributorERC721V3Address;

  beforeEach(async () => {
    [owner, account1, account2, account3, account4] = await ethers.getSigners();

    ownerAddress = await owner.getAddress();
    account1Address = await account1.getAddress();
    account2Address = await account2.getAddress();
    account3Address = await account3.getAddress();
    account4Address = await account4.getAddress();

    timelock = (await time.latest()) + 2000;

    airdropData[0] = {
      address: account1Address,
      tokenId: 0,
      timestamp: timelock + 500 * 0,
    };
    airdropData[1] = {
      address: account2Address,
      tokenId: 1,
      timestamp: timelock + 500 * 1,
    };
    airdropData[2] = {
      address: account3Address,
      tokenId: 2,
      timestamp: timelock + 500 * 2,
    };
    airdropData[3] = {
      address: account4Address,
      tokenId: 3,
      timestamp: timelock + 500 * 3,
    };

    // console.log(airdropData);

    leaves = airdropData.map((account) => {
      return ethers.utils.solidityKeccak256(
        ["uint256", "address", "uint256"],
        [account.tokenId, account.address, account.timestamp]
      );
    });

    // console.log(leaves);

    tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    // console.log(tree.toString());

    root = tree.getHexRoot();
    // console.log(root);

    MerkleDistributorERC721V3 = await ethers.getContractFactory(
      "MerkleDistributorERC721V3"
    );
    merkleDistributorERC721V3 = await MerkleDistributorERC721V3.deploy(
      "Sample NFT",
      "SNFT",
      root
    );
    await merkleDistributorERC721V3.deployed();
    merkleDistributorERC721V3Address = await merkleDistributorERC721V3.address;
  });

  describe("Correct setup", () => {
    it("Should have correct name", async () => {
      const name = await merkleDistributorERC721V3.name();
      expect(name).to.equal("Sample NFT");
    });

    it("Should have correct symbol", async () => {
      const symbol = await merkleDistributorERC721V3.symbol();
      expect(symbol).to.equal("SNFT");
    });

    it("Should have correct merkle root", async () => {
      const merkleRoot = await merkleDistributorERC721V3.root();
      expect(merkleRoot).to.equal(root);
    });
  });

  describe("Correct destribution of NFTs", () => {
    it("Should distribute NFTs correctly", async () => {
      let proof, nftOwner;

      await network.provider.send("evm_increaseTime", [2000]);
      await network.provider.send("evm_mine");

      for (let index = 0; index < airdropData.length; index++) {
        await expect(
          merkleDistributorERC721V3.ownerOf(airdropData[index].tokenId)
        ).to.be.revertedWith("ERC721: invalid token ID");

        proof = tree.getHexProof(leaves[index]);
        await merkleDistributorERC721V3.redeem(
          airdropData[index].address,
          airdropData[index].tokenId,
          airdropData[index].timestamp,
          proof
        );

        nftOwner = await merkleDistributorERC721V3.ownerOf(
          airdropData[index].tokenId
        );
        expect(nftOwner).to.equal(airdropData[index].address);

        await network.provider.send("evm_increaseTime", [500]);
        await network.provider.send("evm_mine");
      }
    });

    it("Should revert if timelock have not expired", async () => {
      const proof = tree.getHexProof(leaves[0]);
      await expect(
        merkleDistributorERC721V3.redeem(
          airdropData[0].address,
          airdropData[0].tokenId,
          airdropData[0].timestamp,
          proof
        )
      ).to.be.revertedWith("Merkle Distribution: Timelock have not expired.");
    });

    it("Should revert if proof is invalid", async () => {
      await network.provider.send("evm_increaseTime", [2000]);
      await network.provider.send("evm_mine");

      const proof = tree.getHexProof(leaves[1]);
      await expect(
        merkleDistributorERC721V3.redeem(
          airdropData[0].address,
          airdropData[0].tokenId,
          airdropData[0].timestamp,
          proof
        )
      ).to.be.revertedWith("Merkle Distribution: Invalid merkle proof");
    });
  });
});
