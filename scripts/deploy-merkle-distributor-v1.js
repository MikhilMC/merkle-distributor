const hre = require("hardhat");
const { MerkleTree } = require("merkletreejs");
const keccak256 = require("keccak256");

const ACCOUNTS = [
  "0xA2cF0CA69441D12f680F41757707bAB420D6F5fF",
  "0x54E0dE7cC765dBE2a0D026da1700448Aab5AbB43",
  "0x9ca91064881626f37a382B04b1f81dB3a7a38D51",
  "0xe93F9B84d6F7fCf0c05f769655040c6157cE07D1",
];

const buf2Hex = (x) => "0x" + x.toString("hex");

const main = async () => {
  console.log("Test Token 1 deployment begining...");
  const TestERC20 = await hre.ethers.getContractFactory("TestERC20");
  const testERC20 = await TestERC20.deploy(
    "Test Token 1",
    "TT1",
    "200000000000000000000"
  );
  await testERC20.deployed();
  console.log(`Test Token 1 deployed to ${testERC20.address}.`);

  const leaves = ACCOUNTS.map((account, index) => {
    return hre.ethers.utils.solidityKeccak256(
      ["uint256", "address", "uint256"],
      [index, account, hre.ethers.utils.parseEther("50")]
    );
  });
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const root = tree.getRoot();
  const hexRoot = buf2Hex(root);

  console.log(`Root of Merkle tree is ${hexRoot}.`);

  console.log("Merkle Distributor deployment begining...");
  const MerkleDistributor = await hre.ethers.getContractFactory(
    "MerkleDistributorV1"
  );
  const merkleDistributor = await MerkleDistributor.deploy(
    testERC20.address,
    hexRoot
  );
  await merkleDistributor.deployed();
  console.log(
    `Merkle Distributor V1 was deployed to ${merkleDistributor.address}.`
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); // Calling the function to deploy the contract
