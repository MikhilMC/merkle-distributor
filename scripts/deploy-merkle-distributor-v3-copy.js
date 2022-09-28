const hre = require("hardhat");

const main = async () => {
  console.log("Merkle Distributor deployment begining...");
  const MerkleDistributor = await hre.ethers.getContractFactory(
    "MerkleDistributorV3"
  );
  const merkleDistributor = await MerkleDistributor.deploy(
    "0xA6b80C432279F6d495B52d6bFa9Bf622c935dFB3",
    "0xdd4be6cb38e3e62d68608387255fb66832ded2494d4453c46137098259a1ed18",
    false,
    "0",
    "0"
  );
  await merkleDistributor.deployed();
  console.log(
    `Merkle Distributor V3 was deployed to ${merkleDistributor.address}.`
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); // Calling the function to deploy the contract
