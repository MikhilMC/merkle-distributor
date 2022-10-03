const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("MerkleDistributorERC721V2.sol", () => {
  let owner, account1, account2, account3, account4;

  let ownerAddress,
    account1Address,
    account2Address,
    account3Address,
    account4Address;

  let airdropData = [];

  const buf2Hex = (x) => "0x" + x.toString("hex");

  let leaves, tree, root, timelock;

  let MerkleDistributorERC721V2,
    merkleDistributorERC721V2,
    merkleDistributorERC721V2Address;

  beforeEach(async () => {
    [owner, account1, account2, account3, account4] = await ethers.getSigners();

    ownerAddress = await owner.getAddress();
    account1Address = await account1.getAddress();
    account2Address = await account2.getAddress();
    account3Address = await account3.getAddress();
    account4Address = await account4.getAddress();

    airdropData[0] = {
      address: account1Address,
      tokenId: 0,
    };
    airdropData[1] = {
      address: account2Address,
      tokenId: 1,
    };
    airdropData[2] = {
      address: account3Address,
      tokenId: 2,
    };
    airdropData[3] = {
      address: account4Address,
      tokenId: 3,
    };

    // console.log(airdropData);

    leaves = airdropData.map((account) => {
      return ethers.utils.solidityKeccak256(
        ["uint256", "address"],
        [account.tokenId, account.address]
      );
    });

    // console.log(leaves);

    tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    // console.log(tree.toString());

    root = tree.getHexRoot();
    // console.log(root);
    timelock = (await time.latest()) + 2000;

    MerkleDistributorERC721V2 = await ethers.getContractFactory(
      "MerkleDistributorERC721V2"
    );
    merkleDistributorERC721V2 = await MerkleDistributorERC721V2.deploy(
      "Sample NFT",
      "SNFT",
      root,
      timelock
    );
    await merkleDistributorERC721V2.deployed();
    merkleDistributorERC721V2Address = await merkleDistributorERC721V2.address;
  });

  describe("Correct setup", () => {
    it("Should have correct name", async () => {
      const name = await merkleDistributorERC721V2.name();
      expect(name).to.equal("Sample NFT");
    });

    it("Should have correct symbol", async () => {
      const symbol = await merkleDistributorERC721V2.symbol();
      expect(symbol).to.equal("SNFT");
    });

    it("Should have correct merkle root", async () => {
      const merkleRoot = await merkleDistributorERC721V2.root();
      expect(merkleRoot).to.equal(root);
    });

    it("Should have correct timelock", async () => {
      const timestamp = await merkleDistributorERC721V2.timestamp();
      expect(timestamp).to.equal(timelock);
    });
  });

  describe("Correct destribution of NFTs", () => {
    it("Should distribute NFTs correctly", async () => {
      let proof, nftOwner;

      await network.provider.send("evm_increaseTime", [2000]);
      await network.provider.send("evm_mine");

      for (let index = 0; index < airdropData.length; index++) {
        await expect(
          merkleDistributorERC721V2.ownerOf(airdropData[index].tokenId)
        ).to.be.revertedWith("ERC721: invalid token ID");

        proof = tree.getHexProof(leaves[index]);
        await merkleDistributorERC721V2.redeem(
          airdropData[index].address,
          airdropData[index].tokenId,
          proof
        );

        nftOwner = await merkleDistributorERC721V2.ownerOf(
          airdropData[index].tokenId
        );
        expect(nftOwner).to.equal(airdropData[index].address);
      }
    });

    it("Should revert if timelock have not expired", async () => {
      const proof = tree.getHexProof(leaves[0]);
      await expect(
        merkleDistributorERC721V2.redeem(
          airdropData[0].address,
          airdropData[0].tokenId,
          proof
        )
      ).to.be.revertedWith("Merkle Distribution: Timelock have not expired.");
    });

    it("Should revert if proof is invalid", async () => {
      await network.provider.send("evm_increaseTime", [2000]);
      await network.provider.send("evm_mine");

      const proof = tree.getHexProof(leaves[1]);
      await expect(
        merkleDistributorERC721V2.redeem(
          airdropData[0].address,
          airdropData[0].tokenId,
          proof
        )
      ).to.be.revertedWith("Merkle Distribution: Invalid merkle proof");
    });
  });
});
