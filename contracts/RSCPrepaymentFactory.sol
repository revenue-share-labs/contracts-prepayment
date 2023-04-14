// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "contracts/BaseRSCPrepayment.sol";
import "contracts/RSCPrepayment.sol";
import "contracts/RSCPrepaymentUSD.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Throw when Fee Percentage is more than 100%
error InvalidFeePercentage();

// Throw when creationId was already created
error CreationIdAlreadyProcessed();

contract RSCPrepaymentFactory is Ownable {
    address payable public immutable contractImplementation;
    address payable public immutable contractImplementationUsd;

    uint256 constant version = 1;
    uint256 public platformFee;
    address payable public platformWallet;

    // creationId unique ID for each contract creation TX, it prevents users to submit tx twice
    mapping(bytes32 => bool) public processedCreationIds;

    struct RSCCreateData {
        address controller;
        address[] distributors;
        bool immutableController;
        bool autoNativeTokenDistribution;
        uint256 minAutoDistributeAmount;
        address payable investor;
        uint256 investedAmount;
        uint256 interestRate;
        uint256 residualInterestRate;
        address payable[] initialRecipients;
        uint256[] percentages;
        address[] supportedErc20addresses;
        address[] erc20PriceFeeds;
        bytes32 creationId;
    }

    struct RSCCreateUsdData {
        address controller;
        address[] distributors;
        bool immutableController;
        bool autoNativeTokenDistribution;
        uint256 minAutoDistributeAmount;
        address payable investor;
        uint256 investedAmount;
        uint256 interestRate;
        uint256 residualInterestRate;
        address nativeTokenUsdPriceFeed;
        address payable[] initialRecipients;
        uint256[] percentages;
        address[] supportedErc20addresses;
        address[] erc20PriceFeeds;
        bytes32 creationId;
    }

    event RSCPrepaymentCreated(
        address contractAddress,
        address controller,
        address[] distributors,
        uint256 version,
        bool immutableController,
        bool autoNativeTokenDistribution,
        uint256 minAutoDistributeAmount,
        uint256 investedAmount,
        uint256 interestRate,
        uint256 residualInterestRate,
        bytes32 creationId
    );

    event RSCPrepaymentUsdCreated(
        address contractAddress,
        address controller,
        address[] distributors,
        uint256 version,
        bool immutableController,
        bool autoNativeTokenDistribution,
        uint256 minAutoDistributeAmount,
        uint256 investedAmount,
        uint256 interestRate,
        uint256 residualInterestRate,
        address nativeTokenUsdPriceFeed,
        bytes32 creationId
    );

    event PlatformFeeChanged(uint256 oldFee, uint256 newFee);

    event PlatformWalletChanged(
        address payable oldPlatformWallet,
        address payable newPlatformWallet
    );

    constructor() {
        contractImplementation = payable(new RSCPrepayment());
        contractImplementationUsd = payable(new RSCPrepaymentUsd());
    }

    /**
     * @dev Public function for creating clone proxy pointing to RSC Prepayment
     * @param _data Initial data for creating new RSC Prepayment native token contract
     * @return Address of new contract
     */
    function createRSCPrepayment(RSCCreateData memory _data) external returns (address) {
        // check and register creationId
        bytes32 creationId = _data.creationId;
        if (creationId != bytes32(0)) {
            bool processed = processedCreationIds[creationId];
            if (processed) {
                revert CreationIdAlreadyProcessed();
            } else {
                processedCreationIds[creationId] = true;
            }
        }

        address payable clone = payable(Clones.clone(contractImplementation));

        BaseRSCPrepayment.InitContractSetting memory contractSettings = BaseRSCPrepayment
            .InitContractSetting(
                msg.sender,
                _data.distributors,
                _data.controller,
                _data.immutableController,
                _data.autoNativeTokenDistribution,
                _data.minAutoDistributeAmount,
                platformFee,
                address(this),
                _data.supportedErc20addresses,
                _data.erc20PriceFeeds
            );

        RSCPrepayment(clone).initialize(
            contractSettings,
            _data.investor,
            _data.investedAmount,
            _data.interestRate,
            _data.residualInterestRate,
            _data.initialRecipients,
            _data.percentages
        );

        emit RSCPrepaymentCreated(
            clone,
            _data.controller,
            _data.distributors,
            version,
            _data.immutableController,
            _data.autoNativeTokenDistribution,
            _data.minAutoDistributeAmount,
            _data.investedAmount,
            _data.interestRate,
            _data.residualInterestRate,
            creationId
        );

        return clone;
    }

    /**
     * @dev Public function for creating clone proxy pointing to RSC Prepayment USD
     * @param _data Initial data for creating new RSC Prepayment USD contract
     * @return Address of new contract
     */
    function createRSCPrepaymentUsd(
        RSCCreateUsdData memory _data
    ) external returns (address) {
        // check and register creationId
        bytes32 creationId = _data.creationId;
        if (creationId != bytes32(0)) {
            bool processed = processedCreationIds[creationId];
            if (processed) {
                revert CreationIdAlreadyProcessed();
            } else {
                processedCreationIds[creationId] = true;
            }
        }

        address payable clone = payable(Clones.clone(contractImplementationUsd));

        BaseRSCPrepayment.InitContractSetting memory contractSettings = BaseRSCPrepayment
            .InitContractSetting(
                msg.sender,
                _data.distributors,
                _data.controller,
                _data.immutableController,
                _data.autoNativeTokenDistribution,
                _data.minAutoDistributeAmount,
                platformFee,
                address(this),
                _data.supportedErc20addresses,
                _data.erc20PriceFeeds
            );

        RSCPrepaymentUsd(clone).initialize(
            contractSettings,
            _data.investor,
            _data.investedAmount,
            _data.interestRate,
            _data.residualInterestRate,
            _data.nativeTokenUsdPriceFeed,
            _data.initialRecipients,
            _data.percentages
        );

        emit RSCPrepaymentUsdCreated(
            clone,
            _data.controller,
            _data.distributors,
            version,
            _data.immutableController,
            _data.autoNativeTokenDistribution,
            _data.minAutoDistributeAmount,
            _data.investedAmount,
            _data.interestRate,
            _data.residualInterestRate,
            _data.nativeTokenUsdPriceFeed,
            creationId
        );

        return clone;
    }

    /**
     * @dev Only Owner function for setting platform fee
     * @param _fee Percentage define platform fee 100% == 10000000
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        if (_fee > 10000000) {
            revert InvalidFeePercentage();
        }
        emit PlatformFeeChanged(platformFee, _fee);
        platformFee = _fee;
    }

    /**
     * @dev Only Owner function for setting platform fee
     * @param _platformWallet New native token wallet which will receive fees
     */
    function setPlatformWallet(address payable _platformWallet) external onlyOwner {
        emit PlatformWalletChanged(platformWallet, _platformWallet);
        platformWallet = _platformWallet;
    }
}
