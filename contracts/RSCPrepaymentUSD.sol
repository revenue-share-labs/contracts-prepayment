// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "./BaseRSCPrepayment.sol";

// Throws when trying to fetch USD price for token without oracle
error TokenMissingUsdPriceOracle();

contract RSCPrepaymentUsd is Initializable, BaseRSCPrepayment {
    using SafeERC20 for IERC20;

    mapping(IERC20 => address) tokenUsdPriceFeeds;
    AggregatorV3Interface internal nativeTokenUsdPriceFeed;

    event TokenPriceFeedSet(IERC20 token, address priceFeed);
    event NativeTokenPriceFeedSet(address newNativeTokenPriceFeed);

    /**
     * @dev Constructor function, can be called only once
     * @param _settings Contract settings, check InitContractSetting struct
     * @param _investor Address who invested money and is gonna receive interested rates
     * @param _investedAmount Amount of invested money from investor
     * @param _interestRate Percentage how much more investor will receive upon his investment amount
     * @param _residualInterestRate Percentage how much investor will get after his investment is fulfilled
     * @param _nativeTokenUsdPriceFeed oracle address for native token / USD price
     * @param _recipients Array of `RecipientData` structs with recipient address and percentage.
     */
    function initialize(
        InitContractSetting memory _settings,
        address payable _investor,
        uint256 _investedAmount,
        uint256 _interestRate,
        uint256 _residualInterestRate,
        address _nativeTokenUsdPriceFeed,
        BaseRSCPrepayment.RecipientData[] calldata _recipients
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
        nativeTokenUsdPriceFeed = AggregatorV3Interface(_nativeTokenUsdPriceFeed);
        _transferOwnership(_settings.owner);

        uint256 supportedErc20Length = _settings.tokens.length;
        for (uint256 i = 0; i < supportedErc20Length; ) {
            _setTokenUsdPriceFeed(
                _settings.tokens[i].tokenAddress,
                _settings.tokens[i].tokenPriceFeed
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
        residualInterestRate = _residualInterestRate;
        investorAmountToReceive =
            _investedAmount +
            (_investedAmount * interestRate) /
            BASIS_POINT;

        // Recipients settings
        _setRecipients(_recipients);
    }

    /**
     * @notice Internal function to redistribute native token based on percentages assign to the recipients
     * @param _valueToDistribute native token amount to be distribute
     */
    function _redistributeNativeCurrency(uint256 _valueToDistribute) internal override {
        // Platform Fee
        if (platformFee > 0) {
            uint256 fee = (_valueToDistribute * platformFee) / BASIS_POINT;
            _valueToDistribute -= fee;
            address payable platformWallet = factory.platformWallet();
            (bool success, ) = platformWallet.call{ value: fee }("");
            if (!success) {
                revert TransferFailedError();
            }
        }

        // Distribute to investor
        uint256 investorRemainingAmount = investorAmountToReceive -
            investorReceivedAmount;
        uint256 investorRemainingAmountNativeToken = _convertUsdToNativeToken(
            investorRemainingAmount
        );
        uint256 amountToDistribute;

        if (investorRemainingAmount == 0) {
            // Investor was already fulfilled and is not receiving residualInterestRate
            uint256 investorInterest = (_valueToDistribute * residualInterestRate) /
                BASIS_POINT;
            amountToDistribute = _valueToDistribute - investorInterest;
            (bool success, ) = payable(investor).call{ value: investorInterest }("");
            if (!success) {
                revert TransferFailedError();
            }
            _recursiveNativeCurrencyDistribution(investor);
        } else {
            // Investor was not yet fully fulfill, we first fulfill him, and then distribute share to recipients
            if (_valueToDistribute <= investorRemainingAmountNativeToken) {
                investorReceivedAmount += _convertNativeTokenToUsd(_valueToDistribute);
                // We can send whole _valueToDistribute to investor
                (bool success, ) = payable(investor).call{ value: _valueToDistribute }(
                    ""
                );
                if (!success) {
                    revert TransferFailedError();
                }
                _recursiveNativeCurrencyDistribution(investor);
                return;
            } else {
                // msg.value is more than investor will receive, so we send him his part and redistribute the rest
                uint256 investorInterestBonus = ((_valueToDistribute -
                    investorRemainingAmountNativeToken) * residualInterestRate) /
                    BASIS_POINT;

                investorReceivedAmount += investorRemainingAmount;
                (bool success, ) = payable(investor).call{
                    value: investorRemainingAmountNativeToken + investorInterestBonus
                }("");
                if (!success) {
                    revert TransferFailedError();
                }
                _recursiveNativeCurrencyDistribution(investor);
                amountToDistribute =
                    _valueToDistribute -
                    investorRemainingAmountNativeToken -
                    investorInterestBonus;
            }
        }

        uint256 recipientsLength = recipients.length;
        for (uint256 i = 0; i < recipientsLength; ) {
            address payable recipient = recipients[i];
            uint256 percentage = recipientsPercentage[recipient];
            uint256 amountToReceive = (amountToDistribute * percentage) / BASIS_POINT;
            (bool success, ) = payable(recipient).call{ value: amountToReceive }("");
            if (!success) {
                revert TransferFailedError();
            }
            _recursiveNativeCurrencyDistribution(recipient);
            unchecked {
                i++;
            }
        }
    }

    /**
     * @notice Internal function to convert native currency value to Usd value
     * @param _nativeTokenValue Native currency value to be converted
     */
    function _convertNativeTokenToUsd(
        uint256 _nativeTokenValue
    ) internal view returns (uint256) {
        return (_getNativeTokenUsdPrice() * _nativeTokenValue) / 1e18;
    }

    /**
     * @notice Internal function to convert USD value to native token value
     * @param _usdValue Usd value to be converted
     */
    function _convertUsdToNativeToken(uint256 _usdValue) internal view returns (uint256) {
        return (((_usdValue * 1e25) / _getNativeTokenUsdPrice()) * 1e25) / 1e32;
    }

    /**
     * @notice Internal function to convert Token value to Usd value
     * @param _token token address
     * @param _tokenValue Token value to be converted to USD
     */
    function _convertTokenToUsd(
        IERC20 _token,
        uint256 _tokenValue
    ) internal view returns (uint256) {
        return (_getTokenUsdPrice(_token) * _tokenValue) / 1e18;
    }

    /**
     * @notice Internal function to convert USD value to native token value
     * @param _token token address
     * @param _usdValue Usd value to be converted
     */
    function _convertUsdToToken(
        IERC20 _token,
        uint256 _usdValue
    ) internal view returns (uint256) {
        return (((_usdValue * 1e25) / _getTokenUsdPrice(_token)) * 1e25) / 1e32;
    }

    /**
     * @notice internal function that returns  NativeToken/usd price from external oracle
     */
    function _getNativeTokenUsdPrice() private view returns (uint256) {
        (, int256 price, , , ) = nativeTokenUsdPriceFeed.latestRoundData();
        return uint256(price * 1e10);
    }

    /**
     * @notice internal function that returns erc20/usd price from external oracle
     * @param _token Address of the token
     */
    function _getTokenUsdPrice(IERC20 _token) private view returns (uint256) {
        address tokenOracleAddress = tokenUsdPriceFeeds[_token];
        if (tokenOracleAddress == address(0)) {
            revert TokenMissingUsdPriceOracle();
        }
        AggregatorV3Interface tokenUsdPriceFeed = AggregatorV3Interface(
            tokenOracleAddress
        );
        (, int256 price, , , ) = tokenUsdPriceFeed.latestRoundData();
        return uint256(price * 1e10);
    }

    /**
     * @notice External function to redistribute ERC20 token based on percentages assign to the recipients
     * @param _token Address of the token to be distributed
     */
    function redistributeToken(IERC20 _token) external onlyDistributor {
        uint256 contractBalance = _token.balanceOf(address(this));
        if (contractBalance == 0) {
            return;
        }

        // Platform Fee
        if (platformFee > 0) {
            uint256 fee = (contractBalance * platformFee) / BASIS_POINT;
            contractBalance -= fee;
            address payable platformWallet = factory.platformWallet();
            _token.safeTransfer(platformWallet, fee);
        }

        // Distribute to investor
        uint256 investorRemainingAmount = investorAmountToReceive -
            investorReceivedAmount;
        uint256 investorRemainingAmountToken = _convertUsdToToken(
            _token,
            investorRemainingAmount
        );

        uint256 amountToDistribute;

        if (investorRemainingAmount == 0) {
            // Investor was already fulfilled and is now receiving residualInterestRate
            uint256 investorInterest = (contractBalance * residualInterestRate) /
                BASIS_POINT;
            amountToDistribute = contractBalance - investorInterest;
            _token.safeTransfer(investor, investorInterest);
            _recursiveERC20Distribution(investor, _token);
        } else {
            // Investor was not yet fully fulfill, we first fulfill him, and then distribute share to recipients
            if (contractBalance <= investorRemainingAmountToken) {
                investorReceivedAmount += _convertTokenToUsd(_token, contractBalance);
                // We can send whole contract erc20 balance to investor
                _token.safeTransfer(investor, contractBalance);
                emit DistributeToken(_token, contractBalance);
                _recursiveERC20Distribution(investor, _token);
                return;
            } else {
                // contractBalance is more than investor will receive, so we send him his part and redistribute the rest
                uint256 investorInterestBonus = ((contractBalance -
                    investorRemainingAmountToken) * residualInterestRate) / BASIS_POINT;
                investorReceivedAmount += investorRemainingAmount;
                _token.safeTransfer(
                    investor,
                    investorRemainingAmountToken + investorInterestBonus
                );
                amountToDistribute =
                    contractBalance -
                    investorRemainingAmountToken -
                    investorInterestBonus;
                _recursiveERC20Distribution(investor, _token);
            }
        }

        // Distribute to recipients
        uint256 recipientsLength = recipients.length;
        for (uint256 i = 0; i < recipientsLength; ) {
            address payable recipient = recipients[i];
            uint256 percentage = recipientsPercentage[recipient];
            uint256 amountToReceive = (amountToDistribute * percentage) / BASIS_POINT;
            _token.safeTransfer(recipient, amountToReceive);
            _recursiveERC20Distribution(recipient, _token);
            unchecked {
                i++;
            }
        }
        emit DistributeToken(_token, contractBalance);
    }

    /**
     * @notice External function for setting price feed oracle for token
     * @param _token address of token
     * @param _priceFeed address of USD price feed for given token
     */
    function setTokenUsdPriceFeed(IERC20 _token, address _priceFeed) external onlyOwner {
        _setTokenUsdPriceFeed(_token, _priceFeed);
    }

    /**
     * @notice Internal function for setting price feed oracle for token
     * @param _token address of token
     * @param _priceFeed address of USD price feed for given token
     */
    function _setTokenUsdPriceFeed(IERC20 _token, address _priceFeed) internal {
        tokenUsdPriceFeeds[_token] = _priceFeed;
        emit TokenPriceFeedSet(_token, _priceFeed);
    }

    /**
     * @notice External function for setting price feed oracle for native token
     * @param _priceFeed address of USD price feed for native token
     */
    function setNativeTokenPriceFeed(address _priceFeed) external onlyOwner {
        emit NativeTokenPriceFeedSet(_priceFeed);
        nativeTokenUsdPriceFeed = AggregatorV3Interface(_priceFeed);
    }
}
