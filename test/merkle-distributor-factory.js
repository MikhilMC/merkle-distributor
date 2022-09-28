const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

describe("MerkleDistributorFactory.sol", () => {
  let owner, account1, account2, account3, account4;

  let ownerAddress,
    account1Address,
    account2Address,
    account3Address,
    account4Address;

  let TestERC20, testToken1, testToken2, testToken1Address, testToken2Address;

  let airdropData = [];

  const buf2Hex = (x) => "0x" + x.toString("hex");

  let leaves, tree, root;

  let MerkleDistributor,
    merkleDistributor1,
    merkleDistributor2,
    merkleDistributor1Address,
    merkleDistributor2Address;

  let MerkleDistributorFactory,
    merkleDistributorFactory,
    merkleDistributorFactoryAddress;

  beforeEach(async () => {
    [owner, account1, account2, account3, account4] = await ethers.getSigners();

    ownerAddress = await owner.getAddress();
    account1Address = await account1.getAddress();
    account2Address = await account2.getAddress();
    account3Address = await account3.getAddress();
    account4Address = await account4.getAddress();

    timelock = (await time.latest()) + 2000;

    airdropData[0] = {
      index: 0,
      address: account1Address,
      amount: ethers.utils.parseEther("50"),
      timestamp: timelock + 500 * 0,
    };
    airdropData[1] = {
      index: 1,
      address: account2Address,
      amount: ethers.utils.parseEther("100"),
      timestamp: timelock + 500 * 1,
    };
    airdropData[2] = {
      index: 2,
      address: account3Address,
      amount: ethers.utils.parseEther("150"),
      timestamp: timelock + 500 * 2,
    };
    airdropData[3] = {
      index: 3,
      address: account4Address,
      amount: ethers.utils.parseEther("200"),
      timestamp: timelock + 500 * 3,
    };

    leaves = airdropData.map((account) => {
      return ethers.utils.solidityKeccak256(
        ["uint256", "address", "uint256", "uint256"],
        [account.index, account.address, account.amount, account.timestamp]
      );
    });

    tree = new MerkleTree(leaves, keccak256, { sortPairs: true });

    root = tree.getHexRoot();
    // console.log(root);

    TestERC20 = await ethers.getContractFactory("TestERC20");
    testToken1 = await TestERC20.deploy(
      "Test Token 1",
      "TT1",
      ethers.utils.parseEther("500")
    );
    await testToken1.deployed();
    testToken1Address = await testToken1.address;

    testToken2 = await TestERC20.deploy(
      "Test Token 2",
      "TT2",
      ethers.utils.parseEther("500")
    );
    await testToken2.deployed();
    testToken2Address = await testToken2.address;

    MerkleDistributorFactory = await ethers.getContractFactory(
      "MerkleDistributionFactory"
    );
    merkleDistributorFactory = await MerkleDistributorFactory.deploy();
    await merkleDistributorFactory.deployed();
    merkleDistributorFactoryAddress = await merkleDistributorFactory.address;

    MerkleDistributor = await ethers.getContractFactory("MerkleDistributorV3");
  });

  describe("Airdrop without fixed time duration", () => {
    it("Should distribute the tokens properly", async () => {
      await testToken1.approve(
        merkleDistributorFactoryAddress,
        ethers.utils.parseEther("500")
      );

      const txResponse = await merkleDistributorFactory.createTokenAirdrop(
        testToken1Address,
        root,
        ethers.utils.parseEther("500"),
        false,
        0,
        0
      );
      const txReceipt = await txResponse.wait();
      const transferEvent = txReceipt.events;
      merkleDistributor1Address =
        transferEvent[transferEvent.length - 1].args[0];

      merkleDistributor1 = await MerkleDistributor.attach(
        merkleDistributor1Address
      );

      let contractBalance = await testToken1.balanceOf(
        merkleDistributor1Address
      );
      expect(contractBalance).to.equal(ethers.utils.parseEther("500"));

      await network.provider.send("evm_increaseTime", [2000]);
      await network.provider.send("evm_mine");

      let status, proof;
      for (let index = 0; index < airdropData.length; index++) {
        status = await merkleDistributor1.isClaimed(index);
        expect(status).to.be.false;

        proof = tree.getHexProof(leaves[index]);

        await merkleDistributor1.claim(
          airdropData[index].index,
          airdropData[index].address,
          airdropData[index].amount,
          airdropData[index].timestamp,
          proof
        );

        status = await merkleDistributor1.isClaimed(index);
        expect(status).to.be.true;

        await network.provider.send("evm_increaseTime", [500]);
        await network.provider.send("evm_mine");
      }

      contractBalance = await testToken1.balanceOf(merkleDistributor1Address);
      expect(contractBalance).to.equal(ethers.utils.parseEther("0"));
    });

    it("Should revert if we try to create airdrop without approving the factory contract.", async () => {
      await expect(
        merkleDistributorFactory.createTokenAirdrop(
          testToken1Address,
          root,
          ethers.utils.parseEther("500"),
          false,
          0,
          0
        )
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should revert if we try claim token before the timestamp expiring.", async () => {
      await testToken1.approve(
        merkleDistributorFactoryAddress,
        ethers.utils.parseEther("500")
      );

      const txResponse = await merkleDistributorFactory.createTokenAirdrop(
        testToken1Address,
        root,
        ethers.utils.parseEther("500"),
        false,
        0,
        0
      );
      const txReceipt = await txResponse.wait();
      const transferEvent = txReceipt.events;
      merkleDistributor1Address =
        transferEvent[transferEvent.length - 1].args[0];

      merkleDistributor1 = await MerkleDistributor.attach(
        merkleDistributor1Address
      );

      const proof = tree.getHexProof(leaves[0]);

      await expect(
        merkleDistributor1.claim(
          airdropData[0].index,
          airdropData[0].address,
          airdropData[0].amount,
          airdropData[0].timestamp,
          proof
        )
      ).to.be.revertedWith("MerkleDistributor: Timestamp have not expired.");
    });

    it("Should revert if we try claim token with wrong proof.", async () => {
      await testToken1.approve(
        merkleDistributorFactoryAddress,
        ethers.utils.parseEther("500")
      );

      const txResponse = await merkleDistributorFactory.createTokenAirdrop(
        testToken1Address,
        root,
        ethers.utils.parseEther("500"),
        false,
        0,
        0
      );
      const txReceipt = await txResponse.wait();
      const transferEvent = txReceipt.events;
      merkleDistributor1Address =
        transferEvent[transferEvent.length - 1].args[0];

      merkleDistributor1 = await MerkleDistributor.attach(
        merkleDistributor1Address
      );

      await network.provider.send("evm_increaseTime", [2000]);
      await network.provider.send("evm_mine");

      const proof = tree.getHexProof(leaves[1]);

      await expect(
        merkleDistributor1.claim(
          airdropData[0].index,
          airdropData[0].address,
          airdropData[0].amount,
          airdropData[0].timestamp,
          proof
        )
      ).to.be.revertedWith("MerkleDistributor: Invalid proof.");
    });

    it("Should revert if we try claim token more than once.", async () => {
      await testToken1.approve(
        merkleDistributorFactoryAddress,
        ethers.utils.parseEther("500")
      );

      const txResponse = await merkleDistributorFactory.createTokenAirdrop(
        testToken1Address,
        root,
        ethers.utils.parseEther("500"),
        false,
        0,
        0
      );
      const txReceipt = await txResponse.wait();
      const transferEvent = txReceipt.events;
      merkleDistributor1Address =
        transferEvent[transferEvent.length - 1].args[0];

      merkleDistributor1 = await MerkleDistributor.attach(
        merkleDistributor1Address
      );

      await network.provider.send("evm_increaseTime", [2000]);
      await network.provider.send("evm_mine");

      const proof = tree.getHexProof(leaves[0]);

      await merkleDistributor1.claim(
        airdropData[0].index,
        airdropData[0].address,
        airdropData[0].amount,
        airdropData[0].timestamp,
        proof
      );

      await expect(
        merkleDistributor1.claim(
          airdropData[0].index,
          airdropData[0].address,
          airdropData[0].amount,
          airdropData[0].timestamp,
          proof
        )
      ).to.be.revertedWith("MerkleDistributor: Drop already claimed.");
    });
  });

  describe("Airdrop with fixed time duration", () => {
    it("Should distribute the tokens properly", async () => {
      await testToken2.approve(
        merkleDistributorFactoryAddress,
        ethers.utils.parseEther("500")
      );

      const currentTime = await time.latest();
      const startingTime = currentTime + 1000;
      const endingTime = currentTime + 4000;

      const txResponse = await merkleDistributorFactory.createTokenAirdrop(
        testToken2Address,
        root,
        ethers.utils.parseEther("500"),
        true,
        startingTime,
        endingTime
      );
      const txReceipt = await txResponse.wait();
      const transferEvent = txReceipt.events;
      merkleDistributor2Address =
        transferEvent[transferEvent.length - 1].args[0];

      merkleDistributor2 = await MerkleDistributor.attach(
        merkleDistributor2Address
      );

      let contractBalance = await testToken2.balanceOf(
        merkleDistributor2Address
      );
      expect(contractBalance).to.equal(ethers.utils.parseEther("500"));

      await network.provider.send("evm_increaseTime", [2000]);
      await network.provider.send("evm_mine");

      let status, proof;
      for (let index = 0; index < airdropData.length; index++) {
        status = await merkleDistributor2.isClaimed(index);
        expect(status).to.be.false;

        proof = tree.getHexProof(leaves[index]);

        await merkleDistributor2.claim(
          airdropData[index].index,
          airdropData[index].address,
          airdropData[index].amount,
          airdropData[index].timestamp,
          proof
        );

        status = await merkleDistributor2.isClaimed(index);
        expect(status).to.be.true;

        await network.provider.send("evm_increaseTime", [500]);
        await network.provider.send("evm_mine");
      }

      contractBalance = await testToken2.balanceOf(merkleDistributor2Address);
      expect(contractBalance).to.equal(ethers.utils.parseEther("0"));
    });

    it("Should revert if we try to create airdrop without approving the factory contract.", async () => {
      const currentTime = await time.latest();
      const startingTime = currentTime + 1000;
      const endingTime = currentTime + 4000;

      await expect(
        merkleDistributorFactory.createTokenAirdrop(
          testToken1Address,
          root,
          ethers.utils.parseEther("500"),
          true,
          startingTime,
          endingTime
        )
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });

    it("Should revert, when we try to claim token before starting the airdrop.", async () => {
      await testToken2.approve(
        merkleDistributorFactoryAddress,
        ethers.utils.parseEther("500")
      );

      const currentTime = await time.latest();
      const startingTime = currentTime + 1000;
      const endingTime = currentTime + 4000;

      const txResponse = await merkleDistributorFactory.createTokenAirdrop(
        testToken2Address,
        root,
        ethers.utils.parseEther("500"),
        true,
        startingTime,
        endingTime
      );
      const txReceipt = await txResponse.wait();
      const transferEvent = txReceipt.events;
      merkleDistributor2Address =
        transferEvent[transferEvent.length - 1].args[0];

      merkleDistributor2 = await MerkleDistributor.attach(
        merkleDistributor2Address
      );

      const proof = tree.getHexProof(leaves[0]);
      await expect(
        merkleDistributor2.claim(
          airdropData[0].index,
          airdropData[0].address,
          airdropData[0].amount,
          airdropData[0].timestamp,
          proof
        )
      ).to.be.revertedWith("MerkleDistributor: Airdrop have not started yet.");
    });

    it("Should revert, when we try to claim token after ending the airdrop.", async () => {
      await testToken2.approve(
        merkleDistributorFactoryAddress,
        ethers.utils.parseEther("500")
      );

      const currentTime = await time.latest();
      const startingTime = currentTime + 1000;
      const endingTime = currentTime + 4000;

      const txResponse = await merkleDistributorFactory.createTokenAirdrop(
        testToken2Address,
        root,
        ethers.utils.parseEther("500"),
        true,
        startingTime,
        endingTime
      );
      const txReceipt = await txResponse.wait();
      const transferEvent = txReceipt.events;
      merkleDistributor2Address =
        transferEvent[transferEvent.length - 1].args[0];

      merkleDistributor2 = await MerkleDistributor.attach(
        merkleDistributor2Address
      );

      await network.provider.send("evm_increaseTime", [4000]);
      await network.provider.send("evm_mine");

      const proof = tree.getHexProof(leaves[0]);
      await expect(
        merkleDistributor2.claim(
          airdropData[0].index,
          airdropData[0].address,
          airdropData[0].amount,
          airdropData[0].timestamp,
          proof
        )
      ).to.be.revertedWith("MerkleDistributor: Airdrop have ended.");
    });

    it("Should revert, when we try to claim with invalid timestamp.", async () => {
      await testToken2.approve(
        merkleDistributorFactoryAddress,
        ethers.utils.parseEther("500")
      );

      const currentTime = await time.latest();
      const startingTime = currentTime + 1000;
      const endingTime = currentTime + 4000;
      const claimingTime = currentTime + 5000;

      const txResponse = await merkleDistributorFactory.createTokenAirdrop(
        testToken2Address,
        root,
        ethers.utils.parseEther("500"),
        true,
        startingTime,
        endingTime
      );
      const txReceipt = await txResponse.wait();
      const transferEvent = txReceipt.events;
      merkleDistributor2Address =
        transferEvent[transferEvent.length - 1].args[0];

      merkleDistributor2 = await MerkleDistributor.attach(
        merkleDistributor2Address
      );

      await network.provider.send("evm_increaseTime", [2000]);
      await network.provider.send("evm_mine");

      const proof = tree.getHexProof(leaves[0]);
      await expect(
        merkleDistributor2.claim(
          airdropData[0].index,
          airdropData[0].address,
          airdropData[0].amount,
          claimingTime,
          proof
        )
      ).to.be.revertedWith("MerkleDistributor: Invalid timestamp.");
    });
  });
});
