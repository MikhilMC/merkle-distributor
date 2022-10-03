const hre = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const ACCOUNTS = [
  "0xA2cF0CA69441D12f680F41757707bAB420D6F5fF",
  "0x54E0dE7cC765dBE2a0D026da1700448Aab5AbB43",
  "0x9ca91064881626f37a382B04b1f81dB3a7a38D51",
  "0xe93F9B84d6F7fCf0c05f769655040c6157cE07D1",
];

const main = async () => {
  const leaves = ACCOUNTS.map((account, index) => {
    return hre.ethers.utils.solidityKeccak256(
      ["uint256", "address"],
      [index, account]
    );
  });
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getHexRoot();

  console.log(`Root of Merkle tree is ${root}.`);

  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.log(`Current block number: ${blockNumber}.`);
  const block = await hre.ethers.provider.getBlock(blockNumber);
  console.log(`Current block timestamp: ${block.timestamp}.`);
  const timelockTimestamp = block.timestamp + 2000;
  console.log(`Expected timelock: ${timelockTimestamp}.`);

  console.log("Merkle Distributor for ERC721 tokens deployment begining...");
  const MerkleDistributorERC721V2 = await hre.ethers.getContractFactory(
    "MerkleDistributorERC721V2"
  );
  const merkleDistributorERC721V2 = await MerkleDistributorERC721V2.deploy(
    "Test NFT 2",
    "TNFT2",
    root,
    timelockTimestamp
  );
  await merkleDistributorERC721V2.deployed();
  console.log(
    `Merkle Distributor for ERC721 tokens V2 was deployed to ${merkleDistributorERC721V2.address}.`
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); // Calling the function to deploy the contract
