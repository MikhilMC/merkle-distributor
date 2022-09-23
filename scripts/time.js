const hre = require("hardhat");

const main = async () => {
  const blockNumber = await hre.ethers.provider.getBlockNumber();
  console.log(`Current block number: ${blockNumber}.`);
  const block = await hre.ethers.provider.getBlock(blockNumber);
  console.log(`Current block timestamp: ${block.timestamp}.`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); // Calling the function to deploy the contract
