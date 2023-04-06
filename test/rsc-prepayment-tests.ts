import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";
import {extendEnvironment} from "hardhat/config";
const { constants } = require('@openzeppelin/test-helpers');
export { deployRSCPrepayment };


async function deployRSCPrepayment(
    controller: any,
    distributors: any,
    immutableController: any,
    autoNativeTokenDistribution: any,
    minAutoDistributeAmount: any,
    investor: any,
    investedAmount: any,
    interestRate: any,
    residualInterestRate: any,
    initialRecipients: any,
    percentages: any,
    supportedErc20addresses: any,
    creationId: any,
) {
    const RSCPrepaymentFactory = await ethers.getContractFactory("XLARSCPrepaymentFactory");
    const rscPrepaymentFactory = await RSCPrepaymentFactory.deploy();
    await rscPrepaymentFactory.deployed();

    const EthPriceFeedMock = await ethers.getContractFactory("EthPriceFeedMock");
    const ethPriceFeedMock = await EthPriceFeedMock.deploy();
    await ethPriceFeedMock.deployed();

    const tx = await rscPrepaymentFactory.createRSCPrepayment(
        {
          controller: controller,
          distributors: distributors,
          immutableController: immutableController,
          autoNativeTokenDistribution: autoNativeTokenDistribution,
          minAutoDistributeAmount: minAutoDistributeAmount,
          investor: investor,
          investedAmount: investedAmount,
          interestRate: interestRate,
          residualInterestRate: residualInterestRate,
          initialRecipients: initialRecipients,
          percentages: percentages,
          supportedErc20addresses: supportedErc20addresses,
          erc20PriceFeeds: [ethPriceFeedMock.address, ],
          creationId: creationId
        }
    );

    let receipt = await tx.wait();
    const rscPrepaymentContractAddress = receipt.events?.[4].args?.[0];

    const RSCPrepaymentContract = await ethers.getContractFactory("XLARSCPrepayment");
    const rscPrepaymentContract = await RSCPrepaymentContract.attach(rscPrepaymentContractAddress);
    return rscPrepaymentContract;
}


describe("XLA RSC Prepayment tests", function () {
  let rscPrepaymentContract: any;
  let TestToken: any;
  let testToken: any;

  let owner: any;
  let addr1: any;
  let addr2: any;
  let addr3: any;
  let addr4: any;
  let investor: any;
  let addrs: any;

  beforeEach(async () => {
    [owner, addr1, addr2, addr3, addr4, investor, ...addrs] = await ethers.getSigners();

    TestToken = await ethers.getContractFactory("TestToken");
    testToken = await TestToken.deploy("TestToken", "TTT", 100000000);
    await testToken.deployed();

    rscPrepaymentContract = await deployRSCPrepayment(
        owner.address,
        [owner.address, ],
        false,
        true,
        ethers.utils.parseEther("1"),
        investor.address,
        ethers.utils.parseEther("100"),
        BigInt(3000000),
        BigInt(500000),
        [addr1.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );
  });

  it("Should set base attrs correctly", async () => {
    expect(await rscPrepaymentContract.owner()).to.be.equal(owner.address);
    expect(await rscPrepaymentContract.distributors(owner.address)).to.be.true;
    expect(await rscPrepaymentContract.controller()).to.be.equal(owner.address);
    expect(await rscPrepaymentContract.numberOfRecipients()).to.be.equal(BigInt(1));
    expect(await rscPrepaymentContract.platformFee()).to.be.equal(0);
    expect(await rscPrepaymentContract.investor()).to.be.equal(investor.address);
    expect(await rscPrepaymentContract.investedAmount()).to.be.equal(ethers.utils.parseEther("100"));
    expect(await rscPrepaymentContract.investorAmountToReceive()).to.be.equal(ethers.utils.parseEther("130"));
  });

  it("Should set recipients correctly", async() => {
    await expect(
        rscPrepaymentContract.connect(addr3).setRecipients(
          [addr1.address, addr3.address, addr4.address],
          [2000000, 5000000, 3000000],
        )
    ).to.be.revertedWithCustomError(rscPrepaymentContract, "OnlyControllerError");

    await rscPrepaymentContract.setRecipients(
        [addr1.address, addr3.address, addr4.address],
        [2000000, 5000000, 3000000],
    );

    expect(await rscPrepaymentContract.recipients(0)).to.be.equal(addr1.address);
    expect(await rscPrepaymentContract.recipients(1)).to.be.equal(addr3.address);
    expect(await rscPrepaymentContract.recipients(2)).to.be.equal(addr4.address);
    expect(await rscPrepaymentContract.recipientsPercentage(addr1.address)).to.be.equal(2000000);
    expect(await rscPrepaymentContract.recipientsPercentage(addr3.address)).to.be.equal(5000000);
    expect(await rscPrepaymentContract.recipientsPercentage(addr4.address)).to.be.equal(3000000);
    expect(await rscPrepaymentContract.numberOfRecipients()).to.be.equal(3);

    await expect(
        rscPrepaymentContract.setRecipients(
          [addr1.address, addr3.address, addr4.address],
          [2000000, 5000000, 2000000],
        )
    ).to.be.revertedWithCustomError(rscPrepaymentContract, "InvalidPercentageError");

    await rscPrepaymentContract.setRecipients(
        [investor.address, addr4.address, addr3.address, addr1.address],
        [2000000, 2000000, 3000000, 3000000],
    );

    expect(await rscPrepaymentContract.recipients(0)).to.be.equal(investor.address);
    expect(await rscPrepaymentContract.recipients(1)).to.be.equal(addr4.address);
    expect(await rscPrepaymentContract.recipients(2)).to.be.equal(addr3.address);
    expect(await rscPrepaymentContract.recipients(3)).to.be.equal(addr1.address);
    expect(await rscPrepaymentContract.recipientsPercentage(investor.address)).to.be.equal(2000000);
    expect(await rscPrepaymentContract.recipientsPercentage(addr4.address)).to.be.equal(2000000);
    expect(await rscPrepaymentContract.recipientsPercentage(addr3.address)).to.be.equal(3000000);
    expect(await rscPrepaymentContract.recipientsPercentage(addr1.address)).to.be.equal(3000000);
    expect(await rscPrepaymentContract.numberOfRecipients()).to.be.equal(4);

    await rscPrepaymentContract.setController(constants.ZERO_ADDRESS);

    await expect(
        rscPrepaymentContract.setRecipients(
          [addr1.address, addr3.address, addr4.address],
          [2000000, 5000000, 3000000],
        )
    ).to.be.revertedWithCustomError(rscPrepaymentContract, "OnlyControllerError");
  });

  it("Should redistribute eth correctly", async() => {
    await rscPrepaymentContract.setRecipients(
        [addr1.address, addr2.address, ],
        [8000000, 2000000, ],
    );

    expect(await rscPrepaymentContract.numberOfRecipients()).to.be.equal(2);

    let addr1BalanceBefore = (await ethers.provider.getBalance(addr1.address)).toBigInt();
    let addr2BalanceBefore = (await ethers.provider.getBalance(addr2.address)).toBigInt();
    let investorBalanceBefore = (await ethers.provider.getBalance(investor.address)).toBigInt();

    let transactionHash = await owner.sendTransaction({
      to: rscPrepaymentContract.address,
      value: ethers.utils.parseEther("50"),
    });

    let addr1BalanceAfter = (await ethers.provider.getBalance(addr1.address)).toBigInt();
    let addr2BalanceAfter = (await ethers.provider.getBalance(addr2.address)).toBigInt();
    let investorBalanceAfter = (await ethers.provider.getBalance(investor.address)).toBigInt();

    expect(addr1BalanceAfter).to.be.equal(addr1BalanceBefore);
    expect(addr2BalanceAfter).to.be.equal(addr2BalanceBefore);
    expect(investorBalanceAfter).to.be.equal(
        investorBalanceBefore + ethers.utils.parseEther("50").toBigInt()
    )

    let transactionHash2 = await owner.sendTransaction({
      to: rscPrepaymentContract.address,
      value: ethers.utils.parseEther("50"),
    });

    let addr1BalanceAfter2 = (await ethers.provider.getBalance(addr1.address)).toBigInt();
    let addr2BalanceAfter2 = (await ethers.provider.getBalance(addr2.address)).toBigInt();
    let investorBalanceAfter2 = (await ethers.provider.getBalance(investor.address)).toBigInt();

    expect(addr1BalanceAfter2).to.be.equal(addr1BalanceAfter);
    expect(addr2BalanceAfter2).to.be.equal(addr2BalanceAfter);
    expect(investorBalanceAfter2).to.be.equal(
        investorBalanceAfter + ethers.utils.parseEther("50").toBigInt()
    )

    let transactionHash3 = await owner.sendTransaction({
      to: rscPrepaymentContract.address,
      value: ethers.utils.parseEther("50"),
    });

    let addr1BalanceAfter3 = (await ethers.provider.getBalance(addr1.address)).toBigInt();
    let addr2BalanceAfter3 = (await ethers.provider.getBalance(addr2.address)).toBigInt();
    let investorBalanceAfter3 = (await ethers.provider.getBalance(investor.address)).toBigInt();

    expect(addr1BalanceAfter3).to.be.equal(addr1BalanceAfter2 + ethers.utils.parseEther("15.2").toBigInt());
    expect(addr2BalanceAfter3).to.be.equal(addr2BalanceAfter2 + ethers.utils.parseEther("3.8").toBigInt());
    expect(investorBalanceAfter3).to.be.equal(
        investorBalanceAfter2 + ethers.utils.parseEther("31").toBigInt()
    )

    let transactionHash4 = await owner.sendTransaction({
      to: rscPrepaymentContract.address,
      value: ethers.utils.parseEther("50"),
    });

    let addr1BalanceAfter4 = (await ethers.provider.getBalance(addr1.address)).toBigInt();
    let addr2BalanceAfter4 = (await ethers.provider.getBalance(addr2.address)).toBigInt();
    let investorBalanceAfter4 = (await ethers.provider.getBalance(investor.address)).toBigInt();

    expect(addr1BalanceAfter4).to.be.equal(addr1BalanceAfter3 + ethers.utils.parseEther("38").toBigInt());
    expect(addr2BalanceAfter4).to.be.equal(addr2BalanceAfter3 + ethers.utils.parseEther("9.5").toBigInt());
    expect(investorBalanceAfter4).to.be.equal(
        investorBalanceAfter3 + ethers.utils.parseEther("2.5").toBigInt()
    )
  });

  it("Should redistribute ERC20 token", async() => {
    await testToken.transfer(rscPrepaymentContract.address, ethers.utils.parseEther("1300000"))

    await rscPrepaymentContract.setRecipients(
        [addr1.address, addr2.address, ],
        [2000000, 8000000, ],
    );

    await rscPrepaymentContract.redistributeToken(testToken.address)
    expect(await testToken.balanceOf(rscPrepaymentContract.address)).to.be.equal(0);
    expect(await testToken.balanceOf(addr1.address)).to.be.equal(ethers.utils.parseEther("0"));
    expect(await testToken.balanceOf(addr2.address)).to.be.equal(ethers.utils.parseEther("0"));
    expect(await testToken.balanceOf(investor.address)).to.be.equal(ethers.utils.parseEther("1300000"));

    await testToken.transfer(rscPrepaymentContract.address, ethers.utils.parseEther("1000000"))

    await expect(
        rscPrepaymentContract.connect(addr3).redistributeToken(testToken.address)
    ).to.be.revertedWithCustomError(rscPrepaymentContract, "OnlyDistributorError");

    await expect(
        rscPrepaymentContract.connect(addr3).setDistributor(addr3.address, true)
    ).to.be.revertedWith("Ownable: caller is not the owner");

    await rscPrepaymentContract.setDistributor(addr3.address, true)
    await rscPrepaymentContract.connect(addr3).redistributeToken(testToken.address)

    expect(await testToken.balanceOf(rscPrepaymentContract.address)).to.be.equal(0);
    expect(await testToken.balanceOf(addr1.address)).to.be.equal(ethers.utils.parseEther("190000"));
    expect(await testToken.balanceOf(addr2.address)).to.be.equal(ethers.utils.parseEther("760000"));
    expect(await testToken.balanceOf(investor.address)).to.be.equal(ethers.utils.parseEther("1350000"));

    await testToken.transfer(rscPrepaymentContract.address, ethers.utils.parseEther("1300000"))
    await rscPrepaymentContract.setTokenNativeTokenPriceFeed(testToken.address, constants.ZERO_ADDRESS);
    await expect(
        rscPrepaymentContract.connect(addr3).redistributeToken(testToken.address)
    ).to.be.revertedWithCustomError(rscPrepaymentContract, "TokenMissingNativeTokenPriceOracle")
  });

  it("Should initialize only once", async() => {
    await expect(
        rscPrepaymentContract.initialize(
            {
              owner: addr2.address,
              controller: addr2.address,
              _distributors: [addr2.address, ],
              immutableController: true,
              autoNativeTokenDistribution: false,
              minAutoDistributionAmount: ethers.utils.parseEther("1"),
              platformFee: BigInt(0),
              factoryAddress: addr1.address,
              supportedErc20addresses: [],
              erc20PriceFeeds: []
            },
            addr1.address,
            ethers.utils.parseEther("100"),
            BigInt(10),
            BigInt(5),
            [addr1.address, ],
            [10000000, ],
        )
    ).to.be.revertedWith(
        "Initializable: contract is already initialized"
    )
  });

  it("Should transfer ownership correctly", async() => {
    await rscPrepaymentContract.transferOwnership(addr1.address);
    expect(await rscPrepaymentContract.owner()).to.be.equal(addr1.address);
  });

  it("Should deploy and create immutable contract", async() => {
    const rscPrepaymentImmutableContract = await deployRSCPrepayment(
        constants.ZERO_ADDRESS,
        [owner.address, ],
        true,
        true,
        ethers.utils.parseEther("1"),
        investor.address,
        ethers.utils.parseEther("100"),
        BigInt(3000000),
        BigInt(500000),
        [addr1.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );

    await expect(rscPrepaymentImmutableContract.setRecipients(
        [addr1.address, addr2.address, ],
        [2000000, 8000000, ],
    )).to.be.revertedWithCustomError(rscPrepaymentImmutableContract, "OnlyControllerError");

    await expect(rscPrepaymentImmutableContract.connect(addr2).setController(addr2.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
    );
    await expect(
        rscPrepaymentImmutableContract.setController(addr1.address)
    ).to.be.revertedWithCustomError(rscPrepaymentImmutableContract, "ImmutableControllerError");
  });

  it("Should create manual distribution split", async() => {
    const rscPrepaymentManualDistribution = await deployRSCPrepayment(
        constants.ZERO_ADDRESS,
        [owner.address, ],
        false,
        false,
        ethers.utils.parseEther("1"),
        investor.address,
        ethers.utils.parseEther("100"),
        BigInt(3000000),
        BigInt(500000),
        [addr1.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );


    const transactionHash = await owner.sendTransaction({
      to: rscPrepaymentManualDistribution.address,
      value: ethers.utils.parseEther("50"),
    });

    const contractBalance = (await ethers.provider.getBalance(rscPrepaymentManualDistribution.address)).toBigInt();
    expect(contractBalance).to.be.equal(ethers.utils.parseEther("50"));

    await expect(
        rscPrepaymentManualDistribution.connect(addr3).redistributeNativeToken()
    ).to.be.revertedWithCustomError(rscPrepaymentManualDistribution, "OnlyDistributorError");

    const investorBalanceBefore = (await ethers.provider.getBalance(investor.address)).toBigInt();
    await rscPrepaymentManualDistribution.redistributeNativeToken()

    const contractBalance2 = (await ethers.provider.getBalance(rscPrepaymentManualDistribution.address)).toBigInt();
    expect(contractBalance2).to.be.equal(0);

    const investorBalanceAfter = (await ethers.provider.getBalance(investor.address)).toBigInt();
    expect(investorBalanceAfter).to.be.equal(investorBalanceBefore + ethers.utils.parseEther("50").toBigInt());
  });

  it("Should work with fees Correctly", async() => {
    const RSCPrepaymentFeeFactory = await ethers.getContractFactory("XLARSCPrepaymentFactory");
    const rscPrepaymentFeeFactory = await RSCPrepaymentFeeFactory.deploy();
    await rscPrepaymentFeeFactory.deployed();

     await expect(
        rscPrepaymentFeeFactory.setPlatformFee(BigInt(10000001))
     ).to.be.revertedWithCustomError(rscPrepaymentFeeFactory, "InvalidFeePercentage");

    await expect(
        rscPrepaymentFeeFactory.connect(addr1).setPlatformFee(BigInt(1))
    ).to.be.revertedWith(
        "Ownable: caller is not the owner"
    )
    await expect(
        rscPrepaymentFeeFactory.connect(addr1).setPlatformWallet(addr4.address)
    ).to.be.revertedWith(
        "Ownable: caller is not the owner"
    )

    await rscPrepaymentFeeFactory.setPlatformFee(BigInt(5000000));
    await rscPrepaymentFeeFactory.setPlatformWallet(addr4.address);

    await expect(
        rscPrepaymentFeeFactory.connect(addr1).setPlatformWallet(addr2.address)
    ).to.be.revertedWith(
        "Ownable: caller is not the owner"
    )

    const platformWallet = addr4.address;
    expect(await rscPrepaymentFeeFactory.platformWallet()).to.be.equal(platformWallet);
    expect(await rscPrepaymentFeeFactory.platformFee()).to.be.equal(BigInt(5000000));

    const EthPriceFeedMock = await ethers.getContractFactory("EthPriceFeedMock");
    const ethPriceFeedMock = await EthPriceFeedMock.deploy();
    await ethPriceFeedMock.deployed();

    const txFee = await rscPrepaymentFeeFactory.createRSCPrepayment(
        {
          controller: owner.address,
          distributors: [owner.address, ],
          immutableController: false,
          autoNativeTokenDistribution: true,
          minAutoDistributeAmount: ethers.utils.parseEther("1"),
          investor: investor.address,
          investedAmount: ethers.utils.parseEther("100"),
          interestRate: BigInt("3000"),
          residualInterestRate: BigInt("500"),
          initialRecipients: [addr1.address, ],
          percentages: [10000000, ],
          supportedErc20addresses: [testToken.address, ],
          erc20PriceFeeds: [ethPriceFeedMock.address, ],
          creationId: constants.ZERO_BYTES32
        }
    );

    let receipt = await txFee.wait();
    const revenueShareContractAddress = receipt.events?.[4].args?.[0];
    const XLARevenueShareContract = await ethers.getContractFactory("XLARSCPrepayment");
    const xlaRSCFeePrepayment = await XLARevenueShareContract.attach(revenueShareContractAddress);

    const platformWalletBalanceBefore = (await ethers.provider.getBalance(platformWallet)).toBigInt()
    const investorBalanceBefore = (await ethers.provider.getBalance(investor.address)).toBigInt()

    const transactionHash = await owner.sendTransaction({
      to: xlaRSCFeePrepayment.address,
      value: ethers.utils.parseEther("50"),
    });

    const platformWalletBalanceAfter = (await ethers.provider.getBalance(platformWallet)).toBigInt()
    const investorBalanceAfter = (await ethers.provider.getBalance(investor.address)).toBigInt()

    expect(platformWalletBalanceAfter).to.be.equal(
        platformWalletBalanceBefore + ethers.utils.parseEther("25").toBigInt()
    );
    expect(investorBalanceAfter).to.be.equal(
        investorBalanceBefore + ethers.utils.parseEther("25").toBigInt()
    );

    await testToken.transfer(xlaRSCFeePrepayment.address, ethers.utils.parseEther("1000000"))

    await xlaRSCFeePrepayment.redistributeToken(testToken.address)

    expect(await testToken.balanceOf(platformWallet)).to.be.equal(ethers.utils.parseEther("500000"))
    expect(await testToken.balanceOf(xlaRSCFeePrepayment.address)).to.be.equal(0)
    expect(await testToken.balanceOf(investor.address)).to.be.equal(ethers.utils.parseEther("500000"))
    expect(await testToken.balanceOf(addr1.address)).to.be.equal(ethers.utils.parseEther("0"))
  });

  it("Should work with creation ID correctly", async() => {
    const XLARSCPrepaymentCreationIdFactory = await ethers.getContractFactory("XLARSCPrepaymentFactory");
    const xlaRSCPrepaymentCreationIdFactory = await XLARSCPrepaymentCreationIdFactory.deploy();
    await xlaRSCPrepaymentCreationIdFactory.deployed();

    const EthPriceFeedMock = await ethers.getContractFactory("EthPriceFeedMock");
    const ethPriceFeedMock = await EthPriceFeedMock.deploy();
    await ethPriceFeedMock.deployed();

    await xlaRSCPrepaymentCreationIdFactory.createRSCPrepayment(
        {
          controller: owner.address,
          distributors: [owner.address, ],
          immutableController: false,
          autoNativeTokenDistribution: true,
          minAutoDistributeAmount: ethers.utils.parseEther("1"),
          investor: investor.address,
          investedAmount: ethers.utils.parseEther("100"),
          interestRate: BigInt("3000"),
          residualInterestRate: BigInt("500"),
          initialRecipients: [addr1.address, ],
          percentages: [10000000, ],
          supportedErc20addresses: [testToken.address, ],
          erc20PriceFeeds: [ethPriceFeedMock.address, ],
          creationId: ethers.utils.formatBytes32String("test-creation-id-1")
        }
    );

    await expect(xlaRSCPrepaymentCreationIdFactory.createRSCPrepayment(
        {
          controller: owner.address,
          distributors: [owner.address, ],
          immutableController: false,
          autoNativeTokenDistribution: true,
          minAutoDistributeAmount: ethers.utils.parseEther("1"),
          investor: investor.address,
          investedAmount: ethers.utils.parseEther("100"),
          interestRate: BigInt("3000"),
          residualInterestRate: BigInt("500"),
          initialRecipients: [addr1.address, ],
          percentages: [10000000, ],
          supportedErc20addresses: [testToken.address, ],
          erc20PriceFeeds: [ethPriceFeedMock.address, ],
          creationId: ethers.utils.formatBytes32String("test-creation-id-1")
        }
    )).to.be.revertedWithCustomError(xlaRSCPrepaymentCreationIdFactory, "CreationIdAlreadyProcessed");

    await xlaRSCPrepaymentCreationIdFactory.createRSCPrepayment(
        {
          controller: owner.address,
          distributors: [owner.address, ],
          immutableController: false,
          autoNativeTokenDistribution: true,
          minAutoDistributeAmount: ethers.utils.parseEther("1"),
          investor: investor.address,
          investedAmount: ethers.utils.parseEther("100"),
          interestRate: BigInt("3000"),
          residualInterestRate: BigInt("500"),
          initialRecipients: [addr1.address, ],
          percentages: [10000000, ],
          supportedErc20addresses: [testToken.address, ],
          erc20PriceFeeds: [ethPriceFeedMock.address, ],
          creationId: ethers.utils.formatBytes32String("test-creation-id-2")
        }
    );
  });

  it("Should recursively erc20 split recipient", async() => {
    const rscPrepaymentMain = await deployRSCPrepayment(
        constants.ZERO_ADDRESS,
        [owner.address, ],
        false,
        false,
        ethers.utils.parseEther("1"),
        investor.address,
        ethers.utils.parseEther("10"),
        BigInt(3000),
        BigInt(500),
        [rscPrepaymentContract.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );

    await testToken.transfer(rscPrepaymentContract.address, ethers.utils.parseEther("1000000"));
    await testToken.transfer(rscPrepaymentMain.address, ethers.utils.parseEther("1000000"));

    await rscPrepaymentContract.setDistributor(rscPrepaymentMain.address, true);
    await rscPrepaymentMain.redistributeToken(testToken.address);

    expect(await testToken.balanceOf(rscPrepaymentMain.address)).to.be.equal(0);
    expect(await testToken.balanceOf(rscPrepaymentContract.address)).to.be.equal(0);
  });

  it("Should recursively erc20 split investor", async() => {
    const rscPrepaymentMain = await deployRSCPrepayment(
        constants.ZERO_ADDRESS,
        [owner.address, ],
        false,
        false,
        ethers.utils.parseEther("1"),
        rscPrepaymentContract.address,
        ethers.utils.parseEther("10"),
        BigInt(3000000),
        BigInt(500000),
        [addr1.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );

    await testToken.transfer(rscPrepaymentContract.address, ethers.utils.parseEther("1000000"));
    await testToken.transfer(rscPrepaymentMain.address, ethers.utils.parseEther("1000000"));

    await rscPrepaymentContract.setDistributor(rscPrepaymentMain.address, true);
    await rscPrepaymentMain.redistributeToken(testToken.address);

    expect(await testToken.balanceOf(rscPrepaymentMain.address)).to.be.equal(0);
    expect(await testToken.balanceOf(rscPrepaymentContract.address)).to.be.equal(0);
  });

  it("Should recursively split ETH", async() => {
      const rscPrepaymentSecond = await deployRSCPrepayment(
        constants.ZERO_ADDRESS,
        [owner.address, ],
        false,
        false,
        ethers.utils.parseEther("1"),
        investor.address,
        ethers.utils.parseEther("10"),
        BigInt(3000000),
        BigInt(500000),
        [addr1.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
    );

    const rscPrepaymentMain = await deployRSCPrepayment(
        constants.ZERO_ADDRESS,
        [owner.address, ],
        false,
        false,
        ethers.utils.parseEther("1"),
        investor.address,
        ethers.utils.parseEther("10"),
        BigInt(3000000),
        BigInt(50000),
        [rscPrepaymentSecond.address, ],
        [10000000, ],
        [testToken.address, ],
        constants.ZERO_BYTES32
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
    await rscPrepaymentMain.redistributeNativeToken();

    expect(await ethers.provider.getBalance(rscPrepaymentMain.address)).to.be.equal(0);
    expect(await ethers.provider.getBalance(rscPrepaymentSecond.address)).to.be.equal(0);
  });

});
