import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  RSCPrepaymentFactory,
  RSCPrepaymentFactory__factory,
} from "../typechain-types";
import { snapshot } from "./utils";

describe("RSCPrepaymentFactory", () => {
  let rscPrepaymentFactory: RSCPrepaymentFactory,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    snapId: string;

  before(async () => {
    [owner, alice] = await ethers.getSigners();
    rscPrepaymentFactory = await new RSCPrepaymentFactory__factory(
      owner
    ).deploy();
  });

  beforeEach(async () => {
    snapId = await snapshot.take();
  });

  afterEach(async () => {
    await snapshot.restore(snapId);
  });

  describe("Deployment", () => {
    it("Should set the correct owner of the contract", async () => {
      expect(await rscPrepaymentFactory.owner()).to.be.equal(owner.address);
    });

    it("Should deploy RSC Prepayment Implementation", async () => {
      expect(await rscPrepaymentFactory.contractImplementation()).not.to.be
        .empty;
    });
  });

  describe("Ownership", () => {
    it("Only owner can renounce ownership", async () => {
      await expect(
        rscPrepaymentFactory.connect(alice).renounceOwnership()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Only owner can transfer ownership", async () => {
      await expect(
        rscPrepaymentFactory.connect(alice).transferOwnership(alice.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Predict deterministic address", () => {
    it("Predicts address correctly", async () => {
      const AbiCoder = new ethers.utils.AbiCoder();
      const salt = ethers.utils.keccak256(
        AbiCoder.encode(
          [
            "address",
            "address[]",
            "bool",
            "bool",
            "uint256",
            "address",
            "uint256",
            "uint256",
            "uint256",
            "tuple(address addrs, uint256 percentage)[]",
            "bytes32",
            "address",
          ],
          [
            owner.address,
            [owner.address],
            false,
            true,
            1500000,
            owner.address,
            1500000,
            1500000,
            1500000,
            [{ addrs: owner.address, percentage: 10000000 }],
            ethers.constants.HashZero,
            owner.address,
          ]
        )
      );

      const creationCode = [
        "0x3d602d80600a3d3981f3363d3d373d3d3d363d73",
        (await rscPrepaymentFactory.contractImplementation())
          .replace(/0x/, "")
          .toLowerCase(),
        "5af43d82803e903d91602b57fd5bf3",
      ].join("");

      const create2Addr = ethers.utils.getCreate2Address(
        rscPrepaymentFactory.address,
        salt,
        ethers.utils.keccak256(creationCode)
      );

      expect(
        await rscPrepaymentFactory.predictDeterministicAddress(
          {
            controller: owner.address,
            distributors: [owner.address],
            isImmutableController: false,
            isAutoNativeCurrencyDistribution: true,
            minAutoDistributeAmount: 1500000,
            investor: owner.address,
            investedAmount: 1500000,
            interestRate: 1500000,
            residualInterestRate: 1500000,
            recipients: [{ addrs: owner.address, percentage: 10000000 }],
            tokens: [
              {
                tokenAddress: ethers.constants.AddressZero,
                tokenPriceFeed: ethers.constants.AddressZero,
              },
            ],
            contractId: ethers.constants.HashZero,
          },
          owner.address
        )
      ).to.be.equal(create2Addr);
    });
  });
});
