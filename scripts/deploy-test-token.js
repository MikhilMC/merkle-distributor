const hre = require("hardhat");

const main = async () => {
  console.log("Test Token deployment begining...");
  const TestERC20 = await hre.ethers.getContractFactory("TestERC20");
  const testERC20 = await TestERC20.deploy(
    "Sample Token",
    "SAMPLE",
    "500000000000000000000"
  );
  await testERC20.deployed();
  console.log(`Test Token deployed to ${testERC20.address}`);
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); // Calling the function to deploy the contract
