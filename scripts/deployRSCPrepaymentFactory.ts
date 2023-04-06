import { ethers } from "hardhat";

async function main() {

  const XLARSCPrepaymentFactory = await ethers.getContractFactory("XLARSCPrepaymentFactory");
  const xlaRSCPrepaymentFactory = await XLARSCPrepaymentFactory.deploy();
  await xlaRSCPrepaymentFactory.deployed();

  console.log("X.LA RSC Prepayment factory deployed to: ", xlaRSCPrepaymentFactory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
