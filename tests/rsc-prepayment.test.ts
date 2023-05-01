import { expect } from "chai";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import {
  RSCPrepayment,
  RSCPrepayment__factory,
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
  let rscPrepaymentContract: RSCPrepayment,
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
    immutableController: any,
    isAutoNativeCurrencyDistribution: any,
    minAutoDistributeAmount: any,
    investor: any,
    investedAmount: any,
    interestRate: any,
    residualInterestRate: any,
    initialRecipients: any,
    percentages: any,
    supportedErc20addresses: any,
    creationId: any
  ) {
    const tx = await rscPrepaymentFactory.createRSCPrepayment({
      controller: controller,
      distributors: distributors,
      immutableController: immutableController,
      isAutoNativeCurrencyDistribution: isAutoNativeCurrencyDistribution,
      minAutoDistributeAmount: minAutoDistributeAmount,
      investor: investor,
      investedAmount: investedAmount,
      interestRate: interestRate,
      residualInterestRate: residualInterestRate,
      initialRecipients: initialRecipients,
      percentages: percentages,
      supportedErc20addresses: supportedErc20addresses,
      erc20PriceFeeds: [ethPriceFeedMock.address],
      creationId: creationId,
    });

    let receipt = await tx.wait();
    const rscPrepaymentContractAddress = receipt.events?.[4].args?.[0];

    const RSCPrepaymentContract = await ethers.getContractFactory(
      "RSCPrepayment"
    );
    const rscPrepaymentContract = await RSCPrepaymentContract.attach(
      rscPrepaymentContractAddress
    );
    return rscPrepaymentContract;
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
    rscPrepaymentContract = await deployRSCPrepayment(
      owner.address,
      [owner.address],
      false,
      true,
      ethers.utils.parseEther("1"),
      investor.address,
      ethers.utils.parseEther("100"),
      BigInt(3000000),
      BigInt(500000),
      [alice.address],
      [10000000],
      [testToken.address],
      ethers.constants.HashZero
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
    expect(await rscPrepaymentContract.owner()).to.be.equal(owner.address);
    expect(await rscPrepaymentContract.distributors(owner.address)).to.be.true;
    expect(await rscPrepaymentContract.controller()).to.be.equal(owner.address);
    expect(await rscPrepaymentContract.numberOfRecipients()).to.be.equal(
      BigInt(1)
    );
    expect(await rscPrepaymentContract.platformFee()).to.be.equal(0);
    expect(await rscPrepaymentContract.investor()).to.be.equal(
      investor.address
    );
    expect(await rscPrepaymentContract.investedAmount()).to.be.equal(
      ethers.utils.parseEther("100")
    );
    expect(await rscPrepaymentContract.investorAmountToReceive()).to.be.equal(
      ethers.utils.parseEther("130")
    );
  });

  it("Should set recipients correctly", async () => {
    await expect(
      rscPrepaymentContract
        .connect(addr3)
        .setRecipients(
          [alice.address, addr3.address, addr4.address],
          [2000000, 5000000, 3000000]
        )
    ).to.be.revertedWithCustomError(
      rscPrepaymentContract,
      "OnlyControllerError"
    );

    await rscPrepaymentContract.setRecipients(
      [alice.address, addr3.address, addr4.address],
      [2000000, 5000000, 3000000]
    );

    expect(await rscPrepaymentContract.recipients(0)).to.be.equal(
      alice.address
    );
    expect(await rscPrepaymentContract.recipients(1)).to.be.equal(
      addr3.address
    );
    expect(await rscPrepaymentContract.recipients(2)).to.be.equal(
      addr4.address
    );
    expect(
      await rscPrepaymentContract.recipientsPercentage(alice.address)
    ).to.be.equal(2000000);
    expect(
      await rscPrepaymentContract.recipientsPercentage(addr3.address)
    ).to.be.equal(5000000);
    expect(
      await rscPrepaymentContract.recipientsPercentage(addr4.address)
    ).to.be.equal(3000000);
    expect(await rscPrepaymentContract.numberOfRecipients()).to.be.equal(3);

    await expect(
      rscPrepaymentContract.setRecipients(
        [alice.address, addr3.address, addr4.address],
        [2000000, 5000000, 2000000]
      )
    ).to.be.revertedWithCustomError(
      rscPrepaymentContract,
      "InvalidPercentageError"
    );

    await rscPrepaymentContract.setRecipients(
      [investor.address, addr4.address, addr3.address, alice.address],
      [2000000, 2000000, 3000000, 3000000]
    );

    expect(await rscPrepaymentContract.recipients(0)).to.be.equal(
      investor.address
    );
    expect(await rscPrepaymentContract.recipients(1)).to.be.equal(
      addr4.address
    );
    expect(await rscPrepaymentContract.recipients(2)).to.be.equal(
      addr3.address
    );
    expect(await rscPrepaymentContract.recipients(3)).to.be.equal(
      alice.address
    );
    expect(
      await rscPrepaymentContract.recipientsPercentage(investor.address)
    ).to.be.equal(2000000);
    expect(
      await rscPrepaymentContract.recipientsPercentage(addr4.address)
    ).to.be.equal(2000000);
    expect(
      await rscPrepaymentContract.recipientsPercentage(addr3.address)
    ).to.be.equal(3000000);
    expect(
      await rscPrepaymentContract.recipientsPercentage(alice.address)
    ).to.be.equal(3000000);
    expect(await rscPrepaymentContract.numberOfRecipients()).to.be.equal(4);

    await rscPrepaymentContract.setController(ethers.constants.AddressZero);

    await expect(
      rscPrepaymentContract.setRecipients(
        [alice.address, addr3.address, addr4.address],
        [2000000, 5000000, 3000000]
      )
    ).to.be.revertedWithCustomError(
      rscPrepaymentContract,
      "OnlyControllerError"
    );
  });

  it("NullAddressRecipientError()", async () => {
    await expect(
      rscPrepaymentContract.setRecipients(
        [alice.address, ethers.constants.AddressZero],
        [5000000, 5000000]
      )
    ).to.be.revertedWithCustomError(
      rscPrepaymentContract,
      "NullAddressRecipientError"
    );
  });

  it("RecipientAlreadyAddedError()", async () => {
    await expect(
      rscPrepaymentContract.setRecipients(
        [alice.address, alice.address],
        [5000000, 5000000]
      )
    ).to.be.revertedWithCustomError(
      rscPrepaymentContract,
      "RecipientAlreadyAddedError"
    );
  });

  it("ControllerAlreadyConfiguredError()", async () => {
    await rscPrepaymentContract.setController(alice.address);
    await expect(
      rscPrepaymentContract.setController(alice.address)
    ).to.be.revertedWithCustomError(
      rscPrepaymentContract,
      "ControllerAlreadyConfiguredError"
    );
  });

  it("InconsistentDataLengthError()", async () => {
    await expect(
      rscPrepaymentFactory.createRSCPrepayment({
        controller: bob.address,
        distributors: [bob.address],
        immutableController: true,
        isAutoNativeCurrencyDistribution: false,
        minAutoDistributeAmount: ethers.utils.parseEther("1"),
        investor: alice.address,
        investedAmount: ethers.utils.parseEther("100"),
        interestRate: BigInt(10),
        residualInterestRate: BigInt(5),
        initialRecipients: [alice.address],
        percentages: [10000000],
        supportedErc20addresses: [testToken.address, testToken.address],
        erc20PriceFeeds: [ethPriceFeedMock.address],
        creationId: ethers.constants.HashZero,
      })
    ).to.be.revertedWithCustomError(
      rscPrepaymentContract,
      "InconsistentDataLengthError"
    );

    await expect(
      rscPrepaymentContract.setRecipients(
        [alice.address, addr3.address],
        [2000000, 5000000, 3000000]
      )
    ).to.be.revertedWithCustomError(
      rscPrepaymentContract,
      "InconsistentDataLengthError"
    );

    await expect(
      rscPrepaymentContract.setRecipients(
        [alice.address, addr3.address, addr4.address],
        [2000000, 5000000]
      )
    ).to.be.revertedWithCustomError(
      rscPrepaymentContract,
      "InconsistentDataLengthError"
    );
  });

  it("TransferFailedError()", async () => {
    // With mock contract as investor
    let tx = await rscPrepaymentFactory.createRSCPrepayment({
      controller: owner.address,
      distributors: [owner.address],
      isImmutableController: true,
      isAutoNativeCurrencyDistribution: false,
      minAutoDistributeAmount: ethers.utils.parseEther("1"),
      investor: mockReceiver.address,
      investedAmount: ethers.utils.parseEther("10"),
      interestRate: BigInt(10),
      residualInterestRate: BigInt(5),
      initialRecipients: [alice.address],
      percentages: [10000000],
      supportedErc20addresses: [testToken.address],
      erc20PriceFeeds: [ethPriceFeedMock.address],
      creationId: ethers.constants.HashZero,
    });
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
    tx = await rscPrepaymentFactory.createRSCPrepayment({
      controller: owner.address,
      distributors: [owner.address],
      immutableController: true,
      isAutoNativeCurrencyDistribution: false,
      minAutoDistributeAmount: ethers.utils.parseEther("1"),
      investor: alice.address,
      investedAmount: ethers.utils.parseEther("100"),
      interestRate: BigInt(10),
      residualInterestRate: BigInt(5),
      initialRecipients: [alice.address],
      percentages: [10000000],
      supportedErc20addresses: [testToken.address],
      erc20PriceFeeds: [ethPriceFeedMock.address],
      creationId: ethers.constants.HashZero,
    });
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
    await rscPrepaymentContract.setRecipients(
      [alice.address, bob.address],
      [8000000, 2000000]
    );

    expect(await rscPrepaymentContract.numberOfRecipients()).to.be.equal(2);

    let aliceBalanceBefore = (
      await ethers.provider.getBalance(alice.address)
    ).toBigInt();
    let bobBalanceBefore = (
      await ethers.provider.getBalance(bob.address)
    ).toBigInt();
    let investorBalanceBefore = (
      await ethers.provider.getBalance(investor.address)
    ).toBigInt();

    let transactionHash = await owner.sendTransaction({
      to: rscPrepaymentContract.address,
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

    let transactionHash2 = await owner.sendTransaction({
      to: rscPrepaymentContract.address,
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

    let transactionHash3 = await owner.sendTransaction({
      to: rscPrepaymentContract.address,
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

    let transactionHash4 = await owner.sendTransaction({
      to: rscPrepaymentContract.address,
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
    await rscPrepaymentContract.setRecipients(
      [alice.address, bob.address],
      [8000000, 2000000]
    );

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
      to: rscPrepaymentContract.address,
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
      rscPrepaymentContract.address,
      ethers.utils.parseEther("1300000")
    );

    await rscPrepaymentContract.setRecipients(
      [alice.address, bob.address],
      [2000000, 8000000]
    );

    await rscPrepaymentContract.redistributeToken(testToken.address);
    expect(
      await testToken.balanceOf(rscPrepaymentContract.address)
    ).to.be.equal(0);
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
      rscPrepaymentContract.address,
      ethers.utils.parseEther("1000000")
    );

    await expect(
      rscPrepaymentContract.connect(addr3).redistributeToken(testToken.address)
    ).to.be.revertedWithCustomError(
      rscPrepaymentContract,
      "OnlyDistributorError"
    );

    await expect(
      rscPrepaymentContract.connect(addr3).setDistributor(addr3.address, true)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await rscPrepaymentContract.setDistributor(addr3.address, true);
    await rscPrepaymentContract
      .connect(addr3)
      .redistributeToken(testToken.address);

    expect(
      await testToken.balanceOf(rscPrepaymentContract.address)
    ).to.be.equal(0);
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
      rscPrepaymentContract.address,
      ethers.utils.parseEther("1300000")
    );
    await rscPrepaymentContract.setTokenNativeTokenPriceFeed(
      testToken.address,
      ethers.constants.AddressZero
    );
    await expect(
      rscPrepaymentContract.connect(addr3).redistributeToken(testToken.address)
    ).to.be.revertedWithCustomError(
      rscPrepaymentContract,
      "TokenMissingNativeTokenPriceOracle"
    );
  });

  it("Should initialize only once", async () => {
    await expect(
      rscPrepaymentContract.initialize(
        {
          owner: bob.address,
          controller: bob.address,
          _distributors: [bob.address],
          immutableController: true,
          isAutoNativeCurrencyDistribution: false,
          minAutoDistributionAmount: ethers.utils.parseEther("1"),
          platformFee: BigInt(0),
          factoryAddress: alice.address,
          supportedErc20addresses: [],
          erc20PriceFeeds: [],
        },
        alice.address,
        ethers.utils.parseEther("100"),
        BigInt(10),
        BigInt(5),
        [alice.address],
        [10000000]
      )
    ).to.be.revertedWith("Initializable: contract is already initialized");
  });

  it("Should transfer ownership correctly", async () => {
    await rscPrepaymentContract.transferOwnership(alice.address);
    expect(await rscPrepaymentContract.owner()).to.be.equal(alice.address);
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
      [alice.address],
      [10000000],
      [testToken.address],
      ethers.constants.HashZero
    );

    await expect(
      rscPrepaymentImmutableContract.setRecipients(
        [alice.address, bob.address],
        [2000000, 8000000]
      )
    ).to.be.revertedWithCustomError(
      rscPrepaymentImmutableContract,
      "OnlyControllerError"
    );

    await expect(
      rscPrepaymentImmutableContract.connect(bob).setController(bob.address)
    ).to.be.revertedWith("Ownable: caller is not the owner");
    await expect(
      rscPrepaymentImmutableContract.setController(alice.address)
    ).to.be.revertedWithCustomError(
      rscPrepaymentImmutableContract,
      "ImmutableControllerError"
    );
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
      [alice.address],
      [10000000],
      [testToken.address],
      ethers.constants.HashZero
    );

    const transactionHash = await owner.sendTransaction({
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

    const txFee = await rscPrepaymentFeeFactory.createRSCPrepayment({
      controller: owner.address,
      distributors: [owner.address],
      immutableController: false,
      isAutoNativeCurrencyDistribution: true,
      minAutoDistributeAmount: ethers.utils.parseEther("1"),
      investor: investor.address,
      investedAmount: ethers.utils.parseEther("100"),
      interestRate: BigInt("300"),
      residualInterestRate: BigInt("500"),
      initialRecipients: [alice.address],
      percentages: [10000000],
      supportedErc20addresses: [testToken.address],
      erc20PriceFeeds: [ethPriceFeedMock.address],
      creationId: ethers.constants.HashZero,
    });
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

    const transactionHash = await owner.sendTransaction({
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

    await rscPrepaymentCreationIdFactory.createRSCPrepayment({
      controller: owner.address,
      distributors: [owner.address],
      immutableController: false,
      isAutoNativeCurrencyDistribution: true,
      minAutoDistributeAmount: ethers.utils.parseEther("1"),
      investor: investor.address,
      investedAmount: ethers.utils.parseEther("100"),
      interestRate: BigInt("3000"),
      residualInterestRate: BigInt("500"),
      initialRecipients: [alice.address],
      percentages: [10000000],
      supportedErc20addresses: [testToken.address],
      erc20PriceFeeds: [ethPriceFeedMock.address],
      creationId: ethers.utils.formatBytes32String("test-creation-id-1"),
    });

    await rscPrepaymentCreationIdFactory.createRSCPrepayment({
      controller: owner.address,
      distributors: [owner.address],
      immutableController: false,
      isAutoNativeCurrencyDistribution: true,
      minAutoDistributeAmount: ethers.utils.parseEther("1"),
      investor: investor.address,
      investedAmount: ethers.utils.parseEther("100"),
      interestRate: BigInt("3000"),
      residualInterestRate: BigInt("500"),
      initialRecipients: [alice.address],
      percentages: [10000000],
      supportedErc20addresses: [testToken.address],
      erc20PriceFeeds: [ethPriceFeedMock.address],
      creationId: ethers.utils.formatBytes32String("test-creation-id-2"),
    });
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
      [rscPrepaymentContract.address],
      [10000000],
      [testToken.address],
      ethers.constants.HashZero
    );

    await testToken.transfer(
      rscPrepaymentContract.address,
      ethers.utils.parseEther("1000000")
    );
    await testToken.transfer(
      rscPrepaymentMain.address,
      ethers.utils.parseEther("1000000")
    );

    await rscPrepaymentContract.setDistributor(rscPrepaymentMain.address, true);
    await rscPrepaymentMain.redistributeToken(testToken.address);

    expect(await testToken.balanceOf(rscPrepaymentMain.address)).to.be.equal(0);
    expect(
      await testToken.balanceOf(rscPrepaymentContract.address)
    ).to.be.equal(0);
  });

  it("Should recursively erc20 split investor", async () => {
    const rscPrepaymentMain = await deployRSCPrepayment(
      ethers.constants.AddressZero,
      [owner.address],
      false,
      false,
      ethers.utils.parseEther("1"),
      rscPrepaymentContract.address,
      ethers.utils.parseEther("10"),
      BigInt(3000000),
      BigInt(500000),
      [alice.address],
      [10000000],
      [testToken.address],
      ethers.constants.HashZero
    );

    await testToken.transfer(
      rscPrepaymentContract.address,
      ethers.utils.parseEther("1000000")
    );
    await testToken.transfer(
      rscPrepaymentMain.address,
      ethers.utils.parseEther("1000000")
    );

    await rscPrepaymentContract.setDistributor(rscPrepaymentMain.address, true);
    await rscPrepaymentMain.redistributeToken(testToken.address);

    expect(await testToken.balanceOf(rscPrepaymentMain.address)).to.be.equal(0);
    expect(
      await testToken.balanceOf(rscPrepaymentContract.address)
    ).to.be.equal(0);
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
      [alice.address],
      [10000000],
      [testToken.address],
      ethers.constants.HashZero
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
      [rscPrepaymentSecond.address],
      [10000000],
      [testToken.address],
      ethers.constants.HashZero
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
