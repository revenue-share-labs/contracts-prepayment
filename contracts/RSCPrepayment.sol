// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "./BaseRSCPrepayment.sol";

// Throws when trying to fetch native token price for token without oracle
error TokenMissingNativeTokenPriceOracle();

contract RSCPrepayment is BaseRSCPrepayment {
    using SafeERC20 for IERC20;

    mapping(address => address) tokenNativeTokenPriceFeeds;
    event TokenPriceFeedSet(address token, address priceFeed);

    /**
     * @dev Constructor function, can be called only once
     * @param _settings Contract settings, check InitContractSetting struct
     * @param _investor Address who invested money and is gonna receive interested rates
     * @param _investedAmount Amount of invested money from investor
     * @param _interestRate Percentage how much more investor will receive upon his investment amount
     * @param _residualInterestRate Percentage how much investor will get after his investment is fulfilled
     * @param _initialRecipients Addresses to be added as a initial recipients
     * @param _percentages percentages for recipients
     */
    function initialize(
        InitContractSetting memory _settings,
        address payable _investor,
        uint256 _investedAmount,
        uint256 _interestRate,
        uint256 _residualInterestRate,
        address payable[] memory _initialRecipients,
        uint256[] memory _percentages
    ) public initializer {
        // Contract settings
        controller = _settings.controller;

        uint256 distributorsLength = _settings._distributors.length;
        for (uint256 i = 0; i < distributorsLength; ) {
            distributors[_settings._distributors[i]] = true;
            unchecked {
                i++;
            }
        }

        isImmutableController = _settings.isImmutableController;
        isAutoNativeCurrencyDistribution = _settings.isAutoNativeCurrencyDistribution;
        minAutoDistributionAmount = _settings.minAutoDistributionAmount;
        factory = IFeeFactory(msg.sender);
        platformFee = _settings.platformFee;
        _transferOwnership(_settings.owner);
        uint256 supportedErc20Length = _settings.supportedErc20addresses.length;
        if (supportedErc20Length != _settings.erc20PriceFeeds.length) {
            revert InconsistentDataLengthError();
        }
        for (uint256 i = 0; i < supportedErc20Length; ) {
            _setTokenNativeTokenPriceFeed(
                _settings.supportedErc20addresses[i],
                _settings.erc20PriceFeeds[i]
            );
            unchecked {
                i++;
            }
        }

        // Investor setting
        if (_investor == address(0)) {
            revert InvestorAddressZeroError();
        }
        investor = _investor;
        investedAmount = _investedAmount;
        interestRate = _interestRate;

        if (_residualInterestRate > BASIS_POINT) {
            revert InvalidPercentageError();
        }

        residualInterestRate = _residualInterestRate;
        investorAmountToReceive =
            _investedAmount +
            (_investedAmount / BASIS_POINT) *
            interestRate;

        // Recipients settings
        _setRecipients(_initialRecipients, _percentages);
    }

    /**
     * @notice Internal function to redistribute native currency based on percentages assign to the recipients
     * @param _valueToDistribute Native currency amount to be distribute
     */
    function _redistributeNativeCurrency(uint256 _valueToDistribute) internal override {
        uint256 fee = ((_valueToDistribute * platformFee) / BASIS_POINT);
        _valueToDistribute -= fee;

        address payable platformWallet = factory.platformWallet();
        if (fee != 0 && platformWallet != address(0)) {
            (bool success, ) = platformWallet.call{ value: fee }("");
            if (success == false) {
                revert TransferFailedError();
            }
        }

        // Distribute to investor
        uint256 investorRemainingAmount = investorAmountToReceive -
            investorReceivedAmount;
        uint256 amountToDistribute;
        if (investorRemainingAmount == 0) {
            // Investor was already fulfilled and is now receiving residualInterestRate
            uint256 investorInterest = (_valueToDistribute / BASIS_POINT) *
                residualInterestRate;
            amountToDistribute = _valueToDistribute - investorInterest;
            (bool success, ) = payable(investor).call{ value: investorInterest }("");
            if (success == false) {
                revert TransferFailedError();
            }
            _recursiveNativeCurrencyDistribution(investor);
        } else {
            // Investor was not yet fully fulfill, we first fulfill him, and then distribute share to recipients
            if (_valueToDistribute <= investorRemainingAmount) {
                investorReceivedAmount += _valueToDistribute;
                // We can send whole msg.value to investor
                (bool success, ) = payable(investor).call{ value: _valueToDistribute }(
                    ""
                );
                if (success == false) {
                    revert TransferFailedError();
                }
                _recursiveNativeCurrencyDistribution(investor);
                return;
            } else {
                // msg.value is more than investor will receive, so we send him his part and redistribute the rest
                uint256 investorInterestBonus = ((_valueToDistribute -
                    investorRemainingAmount) / BASIS_POINT) * residualInterestRate;
                investorReceivedAmount += investorRemainingAmount;
                (bool success, ) = payable(investor).call{
                    value: investorRemainingAmount + investorInterestBonus
                }("");
                if (success == false) {
                    revert TransferFailedError();
                }
                amountToDistribute =
                    _valueToDistribute -
                    investorRemainingAmount -
                    investorInterestBonus;
                _recursiveNativeCurrencyDistribution(investor);
            }
        }

        // Distribute to recipients
        uint256 recipientsLength = recipients.length;
        for (uint256 i = 0; i < recipientsLength; ) {
            address payable recipient = recipients[i];
            uint256 percentage = recipientsPercentage[recipient];
            uint256 amountToReceive = (amountToDistribute * percentage) / BASIS_POINT;
            (bool success, ) = payable(recipient).call{ value: amountToReceive }("");
            if (success == false) {
                revert TransferFailedError();
            }
            _recursiveNativeCurrencyDistribution(recipient);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice External function to redistribute ERC20 token based on percentages assign to the recipients
     * @param _token Address of the ERC20 token to be distribute
     */
    function redistributeToken(address _token) external onlyDistributor {
        IERC20 erc20Token = IERC20(_token);
        uint256 contractBalance = erc20Token.balanceOf(address(this));

        // Platform Fee
        if (platformFee > 0) {
            uint256 fee = (contractBalance * platformFee) / BASIS_POINT;
            contractBalance -= fee;
            address payable platformWallet = factory.platformWallet();
            erc20Token.safeTransfer(platformWallet, fee);
        }

        // Distribute to investor
        uint256 investorRemainingAmount = investorAmountToReceive -
            investorReceivedAmount;
        uint256 investorRemainingAmountToken = _convertNativeTokenToToken(
            _token,
            investorRemainingAmount
        );

        uint256 amountToDistribute;

        if (investorRemainingAmount == 0) {
            // Investor was already fulfilled and is now receiving residualInterestRate
            uint256 investorInterest = (contractBalance / BASIS_POINT) *
                residualInterestRate;
            amountToDistribute = contractBalance - investorInterest;
            erc20Token.safeTransfer(investor, investorInterest);
            _recursiveERC20Distribution(investor, _token);
        } else {
            // Investor was not yet fully fulfill, we first fulfill him, and then distribute share to recipients
            if (contractBalance <= investorRemainingAmountToken) {
                // We can send whole contract erc20 balance to investor
                investorReceivedAmount += _convertTokenToNativeToken(
                    _token,
                    contractBalance
                );
                erc20Token.safeTransfer(investor, contractBalance);
                emit DistributeToken(_token, contractBalance);
                _recursiveERC20Distribution(investor, _token);
                return;
            } else {
                // contractBalance is more than investor will receive, so we send him his part and redistribute the rest
                uint256 investorInterestBonus = ((contractBalance -
                    investorRemainingAmountToken) / BASIS_POINT) * residualInterestRate;
                investorReceivedAmount += investorRemainingAmount;
                erc20Token.safeTransfer(
                    investor,
                    investorRemainingAmountToken + investorInterestBonus
                );
                _recursiveERC20Distribution(investor, _token);
                amountToDistribute =
                    contractBalance -
                    investorRemainingAmountToken -
                    investorInterestBonus;
            }
        }

        // Distribute to recipients
        uint256 recipientsLength = recipients.length;
        for (uint256 i = 0; i < recipientsLength; ) {
            address payable recipient = recipients[i];
            uint256 percentage = recipientsPercentage[recipient];
            uint256 amountToReceive = (amountToDistribute / BASIS_POINT) * percentage;
            erc20Token.safeTransfer(recipient, amountToReceive);
            _recursiveERC20Distribution(recipient, _token);
            unchecked {
                i++;
            }
        }
        emit DistributeToken(_token, contractBalance);
    }

    /**
     * @notice internal function that returns erc20/nativeToken price from external oracle
     * @param _token Address of the token
     */
    function _getTokenNativeTokenPrice(address _token) private view returns (uint256) {
        address tokenOracleAddress = tokenNativeTokenPriceFeeds[_token];
        if (tokenOracleAddress == address(0)) {
            revert TokenMissingNativeTokenPriceOracle();
        }
        AggregatorV3Interface tokenNativeTokenPriceFeed = AggregatorV3Interface(
            tokenOracleAddress
        );
        (, int256 price, , , ) = tokenNativeTokenPriceFeed.latestRoundData();
        return uint256(price);
    }

    /**
     * @notice Internal function to convert token value to native token value
     * @param _token token address
     * @param _tokenValue Token value to be converted to USD
     */
    function _convertTokenToNativeToken(
        address _token,
        uint256 _tokenValue
    ) internal view returns (uint256) {
        return (_getTokenNativeTokenPrice(_token) * _tokenValue) / 1e18;
    }

    /**
     * @notice Internal function to convert NativeToken value to token value
     * @param _token token address
     * @param _nativeTokenValue NativeToken value to be converted
     */
    function _convertNativeTokenToToken(
        address _token,
        uint256 _nativeTokenValue
    ) internal view returns (uint256) {
        return
            (((_nativeTokenValue * 1e25) / _getTokenNativeTokenPrice(_token)) * 1e25) /
            1e32;
    }

    /**
     * @notice External function for setting price feed oracle for token
     * @param _token address of token
     * @param _priceFeed address of native token price feed for given token
     */
    function setTokenNativeTokenPriceFeed(
        address _token,
        address _priceFeed
    ) external onlyOwner {
        _setTokenNativeTokenPriceFeed(_token, _priceFeed);
    }

    /**
     * @notice internal function for setting price feed oracle for token
     * @param _token address of token
     * @param _priceFeed address of native Token price feed for given token
     */
    function _setTokenNativeTokenPriceFeed(address _token, address _priceFeed) internal {
        tokenNativeTokenPriceFeeds[_token] = _priceFeed;
        emit TokenPriceFeedSet(_token, _priceFeed);
    }
}
