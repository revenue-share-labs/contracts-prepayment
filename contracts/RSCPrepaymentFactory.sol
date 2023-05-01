// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/Clones.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./BaseRSCPrepayment.sol";
import "./RSCPrepayment.sol";
import "./RSCPrepaymentUSD.sol";

// Throw when Fee Percentage is more than 100%
error InvalidFeePercentage();

contract RSCPrepaymentFactory is Ownable {
    /// Measurement unit 10000000 = 100%.
    uint256 public constant BASIS_POINT = 10000000;

    /// RSCPrepayment implementation address.
    RSCPrepayment public immutable contractImplementation;

    /// RSCPrepaymentUSD implementation address.
    RSCPrepaymentUsd public immutable contractImplementationUsd;

    /// RSCPrepaymentFactory contract version.
    bytes32 public constant VERSION = "1.0";

    /// Current platform fee.
    uint256 public platformFee;

    /// Fee receiver address.
    address payable public platformWallet;

    struct RSCPrepaymentCreateData {
        address controller;
        address[] distributors;
        bool isImmutableController;
        bool isAutoNativeCurrencyDistribution;
        uint256 minAutoDistributeAmount;
        address payable investor;
        uint256 investedAmount;
        uint256 interestRate;
        uint256 residualInterestRate;
        /// Initial array of recipients addresses.
        BaseRSCPrepayment.RecipientData[] recipients;
        IERC20[] supportedErc20addresses;
        address[] erc20PriceFeeds;
        bytes32 creationId;
    }

    event NewRSCPrepayment(
        address contractAddress,
        address controller,
        address[] distributors,
        bytes32 version,
        bool immutableController,
        bool isAutoNativeCurrencyDistribution,
        uint256 minAutoDistributeAmount,
        uint256 investedAmount,
        uint256 interestRate,
        uint256 residualInterestRate,
        bytes32 creationId
    );

    event NewRSCPrepaymentUsd(
        address contractAddress,
        address controller,
        address[] distributors,
        bytes32 version,
        bool immutableController,
        bool isAutoNativeCurrencyDistribution,
        uint256 minAutoDistributeAmount,
        uint256 investedAmount,
        uint256 interestRate,
        uint256 residualInterestRate,
        address nativeTokenUsdPriceFeed,
        bytes32 creationId
    );

    event PlatformFee(uint256 newFee);

    event PlatformWallet(address payable newPlatformWallet);

    constructor() {
        contractImplementation = new RSCPrepayment();
        contractImplementationUsd = new RSCPrepaymentUsd();
    }

    /**
     * @dev Internal function for getting semi-random salt for deterministicClone creation.
     * @param _data RSC Create data used for hashing and getting random salt.
     * @param _deployer Wallet address that want to create new RSC contract.
     */
    function _getSalt(
        RSCPrepaymentCreateData memory _data,
        address _deployer
    ) internal pure returns (bytes32) {
        bytes32 hash = keccak256(
            abi.encode(
                _data.controller,
                _data.distributors,
                _data.isImmutableController,
                _data.isAutoNativeCurrencyDistribution,
                _data.minAutoDistributeAmount,
                _data.investor,
                _data.investedAmount,
                _data.interestRate,
                _data.residualInterestRate,
                _data.recipients,
                _data.creationId,
                _deployer
            )
        );
        return hash;
    }

    /**
     * @dev External function for creating clone proxy pointing to RSC Percentage.
     * @param _data RSC Create data used for hashing and getting random salt.
     * @param _deployer Wallet address that want to create new RSC contract.
     */
    function predictDeterministicAddress(
        RSCPrepaymentCreateData memory _data,
        address _deployer
    ) external view returns (address) {
        bytes32 salt = _getSalt(_data, _deployer);
        address predictedAddress = Clones.predictDeterministicAddress(
            address(contractImplementation),
            salt
        );
        return predictedAddress;
    }

    /**
     * @dev Public function for creating clone proxy pointing to RSC Prepayment
     * @param _data Initial data for creating new RSC Prepayment native token contract
     * @return Address of new contract
     */
    function createRSCPrepayment(
        RSCPrepaymentCreateData memory _data
    ) external returns (address) {
        // check and register creationId
        bytes32 creationId = _data.creationId;
        address payable clone;
        if (creationId != bytes32(0)) {
            bytes32 salt = _getSalt(_data, msg.sender);
            clone = payable(
                Clones.cloneDeterministic(address(contractImplementation), salt)
            );
        } else {
            clone = payable(Clones.clone(address(contractImplementation)));
        }

        BaseRSCPrepayment.InitContractSetting memory contractSettings = BaseRSCPrepayment
            .InitContractSetting(
                msg.sender,
                _data.distributors,
                _data.controller,
                _data.isImmutableController,
                _data.isAutoNativeCurrencyDistribution,
                _data.minAutoDistributeAmount,
                platformFee,
                _data.supportedErc20addresses,
                _data.erc20PriceFeeds
            );

        RSCPrepayment(clone).initialize(
            contractSettings,
            _data.investor,
            _data.investedAmount,
            _data.interestRate,
            _data.residualInterestRate,
            _data.recipients
        );

        emit NewRSCPrepayment(
            clone,
            _data.controller,
            _data.distributors,
            VERSION,
            _data.isImmutableController,
            _data.isAutoNativeCurrencyDistribution,
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
        RSCPrepaymentCreateData memory _data,
        address nativeTokenUsdPriceFeed
    ) external returns (address) {
        // check and register creationId
        bytes32 creationId = _data.creationId;
        address payable clone;
        if (creationId != bytes32(0)) {
            bytes32 salt = _getSalt(_data, msg.sender);
            clone = payable(
                Clones.cloneDeterministic(address(contractImplementationUsd), salt)
            );
        } else {
            clone = payable(Clones.clone(address(contractImplementationUsd)));
        }

        BaseRSCPrepayment.InitContractSetting memory contractSettings = BaseRSCPrepayment
            .InitContractSetting(
                msg.sender,
                _data.distributors,
                _data.controller,
                _data.isImmutableController,
                _data.isAutoNativeCurrencyDistribution,
                _data.minAutoDistributeAmount,
                platformFee,
                _data.supportedErc20addresses,
                _data.erc20PriceFeeds
            );

        RSCPrepaymentUsd(clone).initialize(
            contractSettings,
            _data.investor,
            _data.investedAmount,
            _data.interestRate,
            _data.residualInterestRate,
            nativeTokenUsdPriceFeed,
            _data.recipients
        );

        emit NewRSCPrepaymentUsd(
            clone,
            _data.controller,
            _data.distributors,
            VERSION,
            _data.isImmutableController,
            _data.isAutoNativeCurrencyDistribution,
            _data.minAutoDistributeAmount,
            _data.investedAmount,
            _data.interestRate,
            _data.residualInterestRate,
            nativeTokenUsdPriceFeed,
            creationId
        );

        return clone;
    }

    /**
     * @dev Only Owner function for setting platform fee
     * @param _fee Percentage define platform fee 100% == BASIS_POINT
     */
    function setPlatformFee(uint256 _fee) external onlyOwner {
        if (_fee > BASIS_POINT) {
            revert InvalidFeePercentage();
        }
        emit PlatformFee(_fee);
        platformFee = _fee;
    }

    /**
     * @dev Only Owner function for setting platform fee
     * @param _platformWallet New native token wallet which will receive fees
     */
    function setPlatformWallet(address payable _platformWallet) external onlyOwner {
        emit PlatformWallet(_platformWallet);
        platformWallet = _platformWallet;
    }
}
