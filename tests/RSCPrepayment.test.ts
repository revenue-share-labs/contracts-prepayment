import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  RSCPrepayment,
  RSCPrepaymentFactory,
  RSCPrepaymentFactory__factory,
  TestToken,
  TestToken__factory,
  MockReceiver,
  MockReceiver__factory,
  EthPriceFeedMock__factory,
  EthPriceFeedMock,
} from "../typechain-types";
import { snapshot } from "./utils";

describe(" RSC Prepayment tests", function () {
  let rscPrepayment: RSCPrepayment,
    rscPrepaymentFactory: RSCPrepaymentFactory,
    testToken: TestToken,
    ethPriceFeedMock: EthPriceFeedMock,
    mockReceiver: MockReceiver,
    owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    investor: SignerWithAddress,
    addr3: SignerWithAddress,
    addr4: SignerWithAddress,
    addrs: SignerWithAddress[],
    snapId: string;

  async function deployRSCPrepayment(
    controller: any,
    distributors: any,
    isImmutableController: any,
    isAutoNativeCurrencyDistribution: any,
    minAutoDistributeAmount: any,
    investor: any,
    investedAmount: any,
    interestRate: any,
    residualInterestRate: any,
    recipients: any,
    tokens: any
  ) {
    const tx = await rscPrepaymentFactory.createRSCPrepayment(
      {
        controller,
        distributors,
        isImmutableController,
        isAutoNativeCurrencyDistribution,
        minAutoDistributeAmount,
        investor,
        investedAmount,
        interestRate,
        residualInterestRate,
        recipients,
        tokens,
        contractId: ethers.constants.HashZero,
      },
      ethers.constants.HashZero
    );

    let receipt = await tx.wait();
    const rscPrepaymentContractAddress = receipt.events?.[4].args?.[0];

    const RSCPrepaymentContract = await ethers.getContractFactory(
      "RSCPrepayment"
    );
    const rscPrepayment = await RSCPrepaymentContract.attach(
      rscPrepaymentContractAddress
    );
    return rscPrepayment;
  }

  before(async () => {
    [owner, alice, bob, addr3, addr4, investor, ...addrs] =
      await ethers.getSigners();
    testToken = await new TestToken__factory(owner).deploy(
      "TestToken",
      "TTT",
      100000000
    );
    ethPriceFeedMock = await new EthPriceFeedMock__factory(owner).deploy();
    rscPrepaymentFactory = await new RSCPrepaymentFactory__factory(
      owner
    ).deploy();
    rscPrepayment = await deployRSCPrepayment(
      owner.address,
      [owner.address],
      false,
      true,
      ethers.utils.parseEther("1"),
      investor.address,
      ethers.utils.parseEther("100"),
      BigInt(3000000),
      BigInt(500000),
      [{ addrs: alice.address, percentage: 10000000 }],
      [
        {
          tokenAddress: testToken.address,
          tokenPriceFeed: ethPriceFeedMock.address,
        },
      ]
    );
    mockReceiver = await new MockReceiver__factory(owner).deploy();
  });

  beforeEach(async () => {
    snapId = await snapshot.take();
  });

  afterEach(async () => {
    await snapshot.restore(snapId);
  });

  it("Should set base attrs correctly", async () => {
    expect(await rscPrepayment.owner()).to.be.equal(owner.address);
    expect(await rscPrepayment.distributors(owner.address)).to.be.true;
    expect(await rscPrepayment.controller()).to.be.equal(owner.address);
    expect(await rscPrepayment.numberOfRecipients()).to.be.equal(BigInt(1));
    expect(await rscPrepayment.platformFee()).to.be.equal(0);
    expect(await rscPrepayment.investor()).to.be.equal(investor.address);
    expect(await rscPrepayment.investedAmount()).to.be.equal(
      ethers.utils.parseEther("100")
    );
    expect(await rscPrepayment.investorAmountToReceive()).to.be.equal(
      ethers.utils.parseEther("130")
    );
  });

  it("Should set recipients correctly", async () => {
    await expect(
      rscPrepayment.connect(addr3).setRecipients([
        { addrs: alice.address, percentage: 2000000 },
        { addrs: addr3.address, percentage: 5000000 },
        { addrs: addr4.address, percentage: 3000000 },
      ])
    ).to.be.revertedWithCustomError(rscPrepayment, "OnlyControllerError");

    await rscPrepayment.setRecipients([
      { addrs: alice.address, percentage: 2000000 },
      { addrs: addr3.address, percentage: 5000000 },
      { addrs: addr4.address, percentage: 3000000 },
    ]);

    expect(await rscPrepayment.recipients(0)).to.be.equal(alice.address);
    expect(await rscPrepayment.recipients(1)).to.be.equal(addr3.address);
    expect(await rscPrepayment.recipients(2)).to.be.equal(addr4.address);
    expect(await rscPrepayment.recipientsPercentage(alice.address)).to.be.equal(
      2000000
    );
    expect(await rscPrepayment.recipientsPercentage(addr3.address)).to.be.equal(
      5000000
    );
    expect(await rscPrepayment.recipientsPercentage(addr4.address)).to.be.equal(
      3000000
    );
    expect(await rscPrepayment.numberOfRecipients()).to.be.equal(3);

    await expect(
      rscPrepayment.setRecipients([
        { addrs: alice.address, percentage: 2000000 },
        { addrs: addr3.address, percentage: 5000000 },
        { addrs: addr4.address, percentage: 2000000 },
      ])
    ).to.be.revertedWithCustomError(rscPrepayment, "InvalidPercentageError");

    await rscPrepayment.setRecipients([
      { addrs: investor.address, percentage: 2000000 },
      { addrs: addr4.address, percentage: 2000000 },
      { addrs: addr3.address, percentage: 3000000 },
      { addrs: alice.address, percentage: 3000000 },
    ]);

    expect(await rscPrepayment.recipients(0)).to.be.equal(investor.address);
    expect(await rscPrepayment.recipients(1)).to.be.equal(addr4.address);
    expect(await rscPrepayment.recipients(2)).to.be.equal(addr3.address);
    expect(await rscPrepayment.recipients(3)).to.be.equal(alice.address);
    expect(
      await rscPrepayment.recipientsPercentage(investor.address)
    ).to.be.equal(2000000);
    expect(await rscPrepayment.recipientsPercentage(addr4.address)).to.be.equal(
      2000000
    );
    expect(await rscPrepayment.recipientsPercentage(addr3.address)).to.be.equal(
      3000000
    );
    expect(await rscPrepayment.recipientsPercentage(alice.address)).to.be.equal(
      3000000
    );
    expect(await rscPrepayment.numberOfRecipients()).to.be.equal(4);

    await rscPrepayment.setController(ethers.constants.AddressZero);

    await expect(
      rscPrepayment.setRecipients([
        { addrs: alice.address, percentage: 2000000 },
        { addrs: addr3.address, percentage: 5000000 },
        { addrs: addr4.address, percentage: 3000000 },
      ])
    ).to.be.revertedWithCustomError(rscPrepayment, "OnlyControllerError");
  });

  it("NullAddressRecipientError()", async () => {
    await expect(
      rscPrepayment.setRecipients([
        { addrs: alice.address, percentage: 5000000 },
        { addrs: ethers.constants.AddressZero, percentage: 5000000 },
      ])
    ).to.be.revertedWithCustomError(rscPrepayment, "NullAddressRecipientError");
  });

  it("RecipientAlreadyAddedError()", async () => {
    await expect(
      rscPrepayment.setRecipients([
        { addrs: alice.address, percentage: 5000000 },
        { addrs: alice.address, percentage: 5000000 },
      ])
    ).to.be.revertedWithCustomError(
      rscPrepayment,
      "RecipientAlreadyAddedError"
    );
  });

  it("TransferFailedError()", async () => {
    // With mock contract as investor
    let tx = await rscPrepaymentFactory.createRSCPrepayment(
      {
        controller: owner.address,
        distributors: [owner.address],
        isImmutableController: true,
        isAutoNativeCurrencyDistribution: false,
        minAutoDistributeAmount: ethers.utils.parseEther("1"),
        investor: mockReceiver.address,
        investedAmount: ethers.utils.parseEther("10"),
        interestRate: BigInt(10),
        residualInterestRate: BigInt(5),
        recipients: [{ addrs: alice.address, percentage: 10000000 }],
        tokens: [
          {
            tokenAddress: testToken.address,
            tokenPriceFeed: ethPriceFeedMock.address,
          },
        ],
        contractId: ethers.constants.HashZero,
      },
      ethers.constants.HashZero
    );
    let receipt = await tx.wait();
    let revenueShareContractAddress = receipt.events?.[4].args?.[0];
    let RevenueShareContract = await ethers.getContractFactory("RSCPrepayment");
    let rscPrepayment = await RevenueShareContract.attach(
      revenueShareContractAddress
    );
    await owner.sendTransaction({
      to: rscPrepayment.address,
      value: ethers.utils.parseEther("10"),
    });
    await expect(
      rscPrepayment.redistributeNativeCurrency()
    ).to.be.revertedWithCustomError(rscPrepayment, "TransferFailedError");

    // With mock contract as platform wallet
    await rscPrepaymentFactory.setPlatformFee(2000000);
    await rscPrepaymentFactory.setPlatformWallet(mockReceiver.address);
    expect(await rscPrepaymentFactory.platformWallet()).to.be.equal(
      mockReceiver.address
    );
    tx = await rscPrepaymentFactory.createRSCPrepayment(
      {
        controller: owner.address,
        distributors: [owner.address],
        isImmutableController: true,
        isAutoNativeCurrencyDistribution: false,
        minAutoDistributeAmount: ethers.utils.parseEther("1"),
        investor: alice.address,
        investedAmount: ethers.utils.parseEther("100"),
        interestRate: BigInt(10),
        residualInterestRate: BigInt(5),
        recipients: [{ addrs: alice.address, percentage: 10000000 }],
        tokens: [
          {
            tokenAddress: testToken.address,
            tokenPriceFeed: ethPriceFeedMock.address,
          },
        ],
        contractId: ethers.constants.HashZero,
      },
      ethers.constants.HashZero
    );
    receipt = await tx.wait();
    revenueShareContractAddress = receipt.events?.[4].args?.[0];
    RevenueShareContract = await ethers.getContractFactory("RSCPrepayment");
    const rscPrepaymentFee = await RevenueShareContract.attach(
      revenueShareContractAddress
    );
    expect(await rscPrepaymentFee.platformFee()).to.be.equal(2000000);
    await owner.sendTransaction({
      to: rscPrepaymentFee.address,
      value: ethers.utils.parseEther("50"),
    });
    await expect(
      rscPrepaymentFee.redistributeNativeCurrency()
    ).to.be.revertedWithCustomError(rscPrepaymentFee, "TransferFailedError");
  });

  it("Should redistribute eth correctly", async () => {
    await rscPrepayment.setRecipients([
      { addrs: alice.address, percentage: 8000000 },
      { addrs: bob.address, percentage: 2000000 },
    ]);

    expect(await rscPrepayment.numberOfRecipients()).to.be.equal(2);

    let aliceBalanceBefore = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();
    let bobBalanceBefore = (
      await ethers.provider.getBalance(bob.address)
    ).toBigInt();
    let investorBalanceBefore = (
      await ethers.provider.getBalance(investor.address)
    ).toBigInt();

    await owner.sendTransaction({
      to: rscPrepayment.address,
      value: ethers.utils.parseEther("50"),
    });

    let aliceBalanceAfter = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();
    let bobBalanceAfter = (
      await ethers.provider.getBalance(bob.address)
    ).toBigInt();
    let investorBalanceAfter = (
      await ethers.provider.getBalance(investor.address)
    ).toBigInt();

    expect(aliceBalanceAfter).to.be.equal(aliceBalanceBefore);
    expect(bobBalanceAfter).to.be.equal(bobBalanceBefore);
    expect(investorBalanceAfter).to.be.equal(
      investorBalanceBefore + ethers.utils.parseEther("50").toBigInt()
    );

    await owner.sendTransaction({
      to: rscPrepayment.address,
      value: ethers.utils.parseEther("50"),
    });

    let aliceBalanceAfter2 = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();
    let bobBalanceAfter2 = (
      await ethers.provider.getBalance(bob.address)
    ).toBigInt();
    let investorBalanceAfter2 = (
      await ethers.provider.getBalance(investor.address)
    ).toBigInt();

    expect(aliceBalanceAfter2).to.be.equal(aliceBalanceAfter);
    expect(bobBalanceAfter2).to.be.equal(bobBalanceAfter);
    expect(investorBalanceAfter2).to.be.equal(
      investorBalanceAfter + ethers.utils.parseEther("50").toBigInt()
    );

    await owner.sendTransaction({
      to: rscPrepayment.address,
      value: ethers.utils.parseEther("50"),
    });

    let aliceBalanceAfter3 = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();
    let bobBalanceAfter3 = (
      await ethers.provider.getBalance(bob.address)
    ).toBigInt();
    let investorBalanceAfter3 = (
      await ethers.provider.getBalance(investor.address)
    ).toBigInt();

    expect(aliceBalanceAfter3).to.be.equal(
      aliceBalanceAfter2 + ethers.utils.parseEther("15.2").toBigInt()
    );
    expect(bobBalanceAfter3).to.be.equal(
      bobBalanceAfter2 + ethers.utils.parseEther("3.8").toBigInt()
    );
    expect(investorBalanceAfter3).to.be.equal(
      investorBalanceAfter2 + ethers.utils.parseEther("31").toBigInt()
    );

    await owner.sendTransaction({
      to: rscPrepayment.address,
      value: ethers.utils.parseEther("50"),
    });

    let aliceBalanceAfter4 = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();
    let bobBalanceAfter4 = (
      await ethers.provider.getBalance(bob.address)
    ).toBigInt();
    let investorBalanceAfter4 = (
      await ethers.provider.getBalance(investor.address)
    ).toBigInt();

    expect(aliceBalanceAfter4).to.be.equal(
      aliceBalanceAfter3 + ethers.utils.parseEther("38").toBigInt()
    );
    expect(bobBalanceAfter4).to.be.equal(
      bobBalanceAfter3 + ethers.utils.parseEther("9.5").toBigInt()
    );
    expect(investorBalanceAfter4).to.be.equal(
      investorBalanceAfter3 + ethers.utils.parseEther("2.5").toBigInt()
    );
  });

  it("Should redistribute ETH correctly via receive", async () => {
    await rscPrepayment.setRecipients([
      { addrs: alice.address, percentage: 8000000 },
      { addrs: bob.address, percentage: 2000000 },
    ]);

    const aliceBalanceBefore = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();
    const bobBalanceBefore = (
      await ethers.provider.getBalance(bob.address)
    ).toBigInt();
    const investorBalanceBefore = (
      await ethers.provider.getBalance(investor.address)
    ).toBigInt();

    await owner.sendTransaction({
      to: rscPrepayment.address,
      value: ethers.utils.parseEther("50"),
    });

    const aliceBalanceAfter = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();
    const bobBalanceAfter = (
      await ethers.provider.getBalance(bob.address)
    ).toBigInt();
    const investorBalanceAfter = (
      await ethers.provider.getBalance(investor.address)
    ).toBigInt();

    expect(aliceBalanceAfter).to.be.equal(aliceBalanceBefore);
    expect(bobBalanceAfter).to.be.equal(bobBalanceBefore);
    expect(investorBalanceAfter).to.be.equal(
      investorBalanceBefore + ethers.utils.parseEther("50").toBigInt()
    );
  });

  it("Should redistribute ERC20 token", async () => {
    await testToken.transfer(
      rscPrepayment.address,
      ethers.utils.parseEther("1300000")
    );

    await rscPrepayment.setRecipients([
      { addrs: alice.address, percentage: 2000000 },
      { addrs: bob.address, percentage: 8000000 },
    ]);

    await rscPrepayment.redistributeToken(testToken.address);
    expect(await testToken.balanceOf(rscPrepayment.address)).to.be.equal(0);
    expect(await testToken.balanceOf(alice.address)).to.be.equal(
      ethers.utils.parseEther("0")
    );
    expect(await testToken.balanceOf(bob.address)).to.be.equal(
      ethers.utils.parseEther("0")
    );
    expect(await testToken.balanceOf(investor.address)).to.be.equal(
      ethers.utils.parseEther("1300000")
    );

    await testToken.transfer(
      rscPrepayment.address,
      ethers.utils.parseEther("1000000")
    );

    await expect(
      rscPrepayment.connect(addr3).redistributeToken(testToken.address)
    ).to.be.revertedWithCustomError(rscPrepayment, "OnlyDistributorError");

    await expect(
      rscPrepayment.connect(addr3).setDistributor(addr3.address, true)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await rscPrepayment.setDistributor(addr3.address, true);
    await rscPrepayment.connect(addr3).redistributeToken(testToken.address);

    expect(await testToken.balanceOf(rscPrepayment.address)).to.be.equal(0);
    expect(await testToken.balanceOf(alice.address)).to.be.equal(
      ethers.utils.parseEther("190000")
    );
    expect(await testToken.balanceOf(bob.address)).to.be.equal(
      ethers.utils.parseEther("760000")
    );
    expect(await testToken.balanceOf(investor.address)).to.be.equal(
      ethers.utils.parseEther("1350000")
    );

    await testToken.transfer(
      rscPrepayment.address,
      ethers.utils.parseEther("1300000")
    );
    await rscPrepayment.setTokenNativeTokenPriceFeed(
      testToken.address,
      ethers.constants.AddressZero
    );
    await expect(
      rscPrepayment.connect(addr3).redistributeToken(testToken.address)
    ).to.be.revertedWithCustomError(
      rscPrepayment,
      "TokenMissingNativeTokenPriceOracle"
    );
  });

  it("Should initialize only once", async () => {
    await expect(
      rscPrepayment.initialize(
        {
          owner: bob.address,
          controller: bob.address,
          _distributors: [bob.address],
          isImmutableController: true,
          isAutoNativeCurrencyDistribution: false,
          minAutoDistributionAmount: ethers.utils.parseEther("1"),
          platformFee: BigInt(0),
          tokens: [],
        },
        alice.address,
        ethers.utils.parseEther("100"),
        BigInt(10),
        BigInt(5),
        [{ addrs: alice.address, percentage: 10000000 }]
      )
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it("Should transfer ownership correctly", async () => {
    await rscPrepayment.transferOwnership(alice.address);
    expect(await rscPrepayment.owner()).to.be.equal(alice.address);
  });

  it("Should deploy and create immutable contract", async () => {
    const rscPrepaymentImmutableContract = await deployRSCPrepayment(
      ethers.constants.AddressZero,
      [owner.address],
      true,
      true,
      ethers.utils.parseEther("1"),
      investor.address,
      ethers.utils.parseEther("100"),
      BigInt(3000000),
      BigInt(500000),
      [{ addrs: alice.address, percentage: 10000000 }],
      [
        {
          tokenAddress: testToken.address,
          tokenPriceFeed: ethPriceFeedMock.address,
        },
      ]
    );

    await expect(
      rscPrepaymentImmutableContract.setRecipients([
        { addrs: alice.address, percentage: 2000000 },
        { addrs: bob.address, percentage: 8000000 },
      ])
    ).to.be.revertedWithCustomError(
      rscPrepaymentImmutableContract,
      "OnlyControllerError"
    );

    await expect(
      rscPrepaymentImmutableContract.connect(bob).setController(bob.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Should create manual distribution split", async () => {
    const rscPrepaymentManualDistribution = await deployRSCPrepayment(
      ethers.constants.AddressZero,
      [owner.address],
      false,
      false,
      ethers.utils.parseEther("1"),
      investor.address,
      ethers.utils.parseEther("100"),
      BigInt(3000000),
      BigInt(500000),
      [{ addrs: alice.address, percentage: 10000000 }],
      [
        {
          tokenAddress: testToken.address,
          tokenPriceFeed: ethPriceFeedMock.address,
        },
      ]
    );

    await owner.sendTransaction({
      to: rscPrepaymentManualDistribution.address,
      value: ethers.utils.parseEther("50"),
    });

    const contractBalance = (
      await ethers.provider.getBalance(rscPrepaymentManualDistribution.address)
    ).toBigInt();
    expect(contractBalance).to.be.equal(ethers.utils.parseEther("50"));

    await expect(
      rscPrepaymentManualDistribution
        .connect(addr3)
        .redistributeNativeCurrency()
    ).to.be.revertedWithCustomError(
      rscPrepaymentManualDistribution,
      "OnlyDistributorError"
    );

    const investorBalanceBefore = (
      await ethers.provider.getBalance(investor.address)
    ).toBigInt();
    await rscPrepaymentManualDistribution.redistributeNativeCurrency();

    const contractBalance2 = (
      await ethers.provider.getBalance(rscPrepaymentManualDistribution.address)
    ).toBigInt();
    expect(contractBalance2).to.be.equal(0);

    const investorBalanceAfter = (
      await ethers.provider.getBalance(investor.address)
    ).toBigInt();
    expect(investorBalanceAfter).to.be.equal(
      investorBalanceBefore + ethers.utils.parseEther("50").toBigInt()
    );
  });

  it("Should work with fees correctly", async () => {
    const RSCPrepaymentFeeFactory = await ethers.getContractFactory(
      "RSCPrepaymentFactory"
    );
    const rscPrepaymentFeeFactory = await RSCPrepaymentFeeFactory.deploy();
    await rscPrepaymentFeeFactory.deployed();

    await expect(
      rscPrepaymentFeeFactory.setPlatformFee(BigInt(10000001))
    ).to.be.revertedWithCustomError(
      rscPrepaymentFeeFactory,
      "InvalidFeePercentage"
    );

    await expect(
      rscPrepaymentFeeFactory.connect(alice).setPlatformFee(BigInt(1))
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(
      rscPrepaymentFeeFactory.connect(alice).setPlatformWallet(addr4.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await rscPrepaymentFeeFactory.setPlatformFee(BigInt(5000000));
    await rscPrepaymentFeeFactory.setPlatformWallet(addr4.address);

    await expect(
      rscPrepaymentFeeFactory.connect(alice).setPlatformWallet(bob.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    const platformWallet = addr4.address;
    expect(await rscPrepaymentFeeFactory.platformWallet()).to.be.equal(
      platformWallet
    );
    expect(await rscPrepaymentFeeFactory.platformFee()).to.be.equal(
      BigInt(5000000)
    );

    const txFee = await rscPrepaymentFeeFactory.createRSCPrepayment(
      {
        controller: owner.address,
        distributors: [owner.address],
        isImmutableController: false,
        isAutoNativeCurrencyDistribution: true,
        minAutoDistributeAmount: ethers.utils.parseEther("1"),
        investor: investor.address,
        investedAmount: ethers.utils.parseEther("100"),
        interestRate: BigInt("300"),
        residualInterestRate: BigInt("500"),
        recipients: [{ addrs: alice.address, percentage: 10000000 }],
        tokens: [
          {
            tokenAddress: testToken.address,
            tokenPriceFeed: ethPriceFeedMock.address,
          },
        ],
        contractId: ethers.constants.HashZero,
      },
      ethers.constants.HashZero
    );
    let receipt = await txFee.wait();
    const revenueShareContractAddress = receipt.events?.[4].args?.[0];
    const RevenueShareContract = await ethers.getContractFactory(
      "RSCPrepayment"
    );
    const RSCFeePrepayment = await RevenueShareContract.attach(
      revenueShareContractAddress
    );

    const platformWalletBalanceBefore = (
      await ethers.provider.getBalance(platformWallet)
    ).toBigInt();
    const investorBalanceBefore = (
      await ethers.provider.getBalance(investor.address)
    ).toBigInt();

    await owner.sendTransaction({
      to: RSCFeePrepayment.address,
      value: ethers.utils.parseEther("50"),
    });

    const platformWalletBalanceAfter = (
      await ethers.provider.getBalance(platformWallet)
    ).toBigInt();
    const investorBalanceAfter = (
      await ethers.provider.getBalance(investor.address)
    ).toBigInt();

    expect(platformWalletBalanceAfter).to.be.equal(
      platformWalletBalanceBefore + ethers.utils.parseEther("25").toBigInt()
    );
    expect(investorBalanceAfter).to.be.equal(
      investorBalanceBefore + ethers.utils.parseEther("25").toBigInt()
    );

    await testToken.transfer(
      RSCFeePrepayment.address,
      ethers.utils.parseEther("100")
    );
    await RSCFeePrepayment.redistributeToken(testToken.address);

    expect(await testToken.balanceOf(platformWallet)).to.be.equal(
      ethers.utils.parseEther("50")
    );
    expect(await testToken.balanceOf(RSCFeePrepayment.address)).to.be.equal(0);
    expect(await testToken.balanceOf(investor.address)).to.be.equal(
      ethers.utils.parseEther("50")
    );
    expect(await testToken.balanceOf(alice.address)).to.be.equal(
      ethers.utils.parseEther("0")
    );
  });

  it("Should work with creation ID correctly", async () => {
    const RSCPrepaymentCreationIdFactory = await ethers.getContractFactory(
      "RSCPrepaymentFactory"
    );
    const rscPrepaymentCreationIdFactory =
      await RSCPrepaymentCreationIdFactory.deploy();
    await rscPrepaymentCreationIdFactory.deployed();

    const EthPriceFeedMock = await ethers.getContractFactory(
      "EthPriceFeedMock"
    );
    const ethPriceFeedMock = await EthPriceFeedMock.deploy();
    await ethPriceFeedMock.deployed();

    await rscPrepaymentCreationIdFactory.createRSCPrepayment(
      {
        controller: owner.address,
        distributors: [owner.address],
        isImmutableController: false,
        isAutoNativeCurrencyDistribution: true,
        minAutoDistributeAmount: ethers.utils.parseEther("1"),
        investor: investor.address,
        investedAmount: ethers.utils.parseEther("100"),
        interestRate: BigInt("3000"),
        residualInterestRate: BigInt("500"),
        recipients: [{ addrs: alice.address, percentage: 10000000 }],
        tokens: [
          {
            tokenAddress: testToken.address,
            tokenPriceFeed: ethPriceFeedMock.address,
          },
        ],
        contractId: ethers.constants.HashZero,
      },
      ethers.utils.formatBytes32String("test-creation-id-1")
    );

    await rscPrepaymentCreationIdFactory.createRSCPrepayment(
      {
        controller: owner.address,
        distributors: [owner.address],
        isImmutableController: false,
        isAutoNativeCurrencyDistribution: true,
        minAutoDistributeAmount: ethers.utils.parseEther("1"),
        investor: investor.address,
        investedAmount: ethers.utils.parseEther("100"),
        interestRate: BigInt("3000"),
        residualInterestRate: BigInt("500"),
        recipients: [{ addrs: alice.address, percentage: 10000000 }],
        tokens: [
          {
            tokenAddress: testToken.address,
            tokenPriceFeed: ethPriceFeedMock.address,
          },
        ],
        contractId: ethers.constants.HashZero,
      },
      ethers.utils.formatBytes32String("test-creation-id-1")
    );
  });

  it("Should recursively erc20 split recipient", async () => {
    const rscPrepaymentMain = await deployRSCPrepayment(
      ethers.constants.AddressZero,
      [owner.address],
      false,
      false,
      ethers.utils.parseEther("1"),
      investor.address,
      ethers.utils.parseEther("10"),
      BigInt(3000),
      BigInt(500),
      [{ addrs: rscPrepayment.address, percentage: 10000000 }],
      [
        {
          tokenAddress: testToken.address,
          tokenPriceFeed: ethPriceFeedMock.address,
        },
      ]
    );

    await testToken.transfer(
      rscPrepayment.address,
      ethers.utils.parseEther("1000000")
    );
    await testToken.transfer(
      rscPrepaymentMain.address,
      ethers.utils.parseEther("1000000")
    );

    await rscPrepayment.setDistributor(rscPrepaymentMain.address, true);
    await rscPrepaymentMain.redistributeToken(testToken.address);

    expect(await testToken.balanceOf(rscPrepaymentMain.address)).to.be.equal(0);
    expect(await testToken.balanceOf(rscPrepayment.address)).to.be.equal(0);
  });

  it("Should recursively erc20 split investor", async () => {
    const rscPrepaymentMain = await deployRSCPrepayment(
      ethers.constants.AddressZero,
      [owner.address],
      false,
      false,
      ethers.utils.parseEther("1"),
      rscPrepayment.address,
      ethers.utils.parseEther("10"),
      BigInt(3000000),
      BigInt(500000),
      [{ addrs: alice.address, percentage: 10000000 }],
      [
        {
          tokenAddress: testToken.address,
          tokenPriceFeed: ethPriceFeedMock.address,
        },
      ]
    );

    await testToken.transfer(
      rscPrepayment.address,
      ethers.utils.parseEther("1000000")
    );
    await testToken.transfer(
      rscPrepaymentMain.address,
      ethers.utils.parseEther("1000000")
    );

    await rscPrepayment.setDistributor(rscPrepaymentMain.address, true);
    await rscPrepaymentMain.redistributeToken(testToken.address);

    expect(await testToken.balanceOf(rscPrepaymentMain.address)).to.be.equal(0);
    expect(await testToken.balanceOf(rscPrepayment.address)).to.be.equal(0);
  });

  it("Should recursively split ETH", async () => {
    const rscPrepaymentSecond = await deployRSCPrepayment(
      ethers.constants.AddressZero,
      [owner.address],
      false,
      true,
      ethers.utils.parseEther("1"),
      investor.address,
      ethers.utils.parseEther("10"),
      BigInt(3000000),
      BigInt(500000),
      [{ addrs: alice.address, percentage: 10000000 }],
      [
        {
          tokenAddress: testToken.address,
          tokenPriceFeed: ethPriceFeedMock.address,
        },
      ]
    );

    const rscPrepaymentMain = await deployRSCPrepayment(
      ethers.constants.AddressZero,
      [owner.address],
      false,
      false,
      ethers.utils.parseEther("1"),
      investor.address,
      ethers.utils.parseEther("10"),
      BigInt(3000000),
      BigInt(50000),
      [{ addrs: rscPrepaymentSecond.address, percentage: 10000000 }],
      [
        {
          tokenAddress: testToken.address,
          tokenPriceFeed: ethPriceFeedMock.address,
        },
      ]
    );

    await owner.sendTransaction({
      to: rscPrepaymentMain.address,
      value: ethers.utils.parseEther("50"),
    });
    await owner.sendTransaction({
      to: rscPrepaymentSecond.address,
      value: ethers.utils.parseEther("50"),
    });

    await rscPrepaymentSecond.setDistributor(rscPrepaymentMain.address, true);
    await rscPrepaymentMain.redistributeNativeCurrency();

    expect(
      await ethers.provider.getBalance(rscPrepaymentMain.address)
    ).to.be.equal(0);
    expect(
      await ethers.provider.getBalance(rscPrepaymentSecond.address)
    ).to.be.equal(0);
  });
});
