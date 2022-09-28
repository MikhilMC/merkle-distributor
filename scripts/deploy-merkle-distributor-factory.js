const hre = require("hardhat");

const main = async () => {
  console.log("Merkle Distributor Factory deployment begining...");
  const MerkleDistributorFactory = await hre.ethers.getContractFactory(
    "MerkleDistributionFactory"
  );
  const merkleDistributorFactory = await MerkleDistributorFactory.deploy();
  await merkleDistributorFactory.deployed();
  console.log(
    `Merkle Distributor Factory was deployed to ${merkleDistributorFactory.address}.`
  );
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); // Calling the function to deploy the contract
