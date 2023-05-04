// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "./interfaces/IFeeFactory.sol";
import "./interfaces/IRecursiveRSC.sol";

// Throw when sender is not distributor
error OnlyDistributorError();

// Throw when sender is not controller
error OnlyControllerError();

// Throw when transaction fails
error TransferFailedError();

// Throw when submitted recipient with address(0)
error NullAddressRecipientError();

// Throw if recipient is already in contract
error RecipientAlreadyAddedError();

// Throw when arrays are submit without same length
error InconsistentDataLengthError();

// Throw when sum of percentage is not 100%
error InvalidPercentageError(uint256);

// Throw when distributor address is same as submit one
error ControllerAlreadyConfiguredError();

// Throw when change is triggered for immutable controller
error ImmutableControllerError();

// Throw when investor address is 0
error InvestorAddressZeroError();

// Throw when change is triggered for immutable recipients
error ImmutableRecipientsError();

// Throw when renounce ownership is called
error RenounceOwnershipForbidden();

abstract contract BaseRSCPrepayment is OwnableUpgradeable {
    uint256 public constant BASIS_POINT = 10000000;

    mapping(address => bool) public distributors;
    address public controller;
    bool public isImmutableRecipients;
    bool public isImmutableController;
    bool public isAutoNativeCurrencyDistribution;
    uint256 public minAutoDistributionAmount;
    uint256 public platformFee;

    uint256 public interestRate;
    uint256 public residualInterestRate;

    address payable public investor;
    uint256 public investedAmount;
    uint256 public investorAmountToReceive;
    uint256 public investorReceivedAmount;

    /// Factory address.
    IFeeFactory public factory;

    /// Array of the recipients.
    address payable[] public recipients;

    /// recipientAddress => recipientPercentage
    mapping(address => uint256) public recipientsPercentage;

    /// Contains recipient address and their percentage in rev share.
    struct RecipientData {
        address payable addrs;
        uint256 percentage;
    }

    /// Contains recipient address and their percentage in rev share.
    struct TokenData {
        IERC20 tokenAddress;
        address tokenPriceFeed;
    }

    struct InitContractSetting {
        address owner;
        address[] _distributors;
        address controller;
        bool isImmutableController;
        bool isAutoNativeCurrencyDistribution;
        uint256 minAutoDistributionAmount;
        uint256 platformFee;
        TokenData[] tokens;
    }

    /// Emitted when recipients and their percentages are set.
    event SetRecipients(RecipientData[] recipients);

    /// Emitted when token distribution is triggered.
    event DistributeToken(IERC20 token, uint256 amount);

    /// Emitted when distributor status is set.
    event Distributor(address distributor, bool isDistributor);

    /// Emitted when new controller address is set.
    event Controller(address newController);

    /// Emitted when new `minAutoDistributionAmount` is set.
    event MinAutoDistributionAmount(uint256 newAmount);

    /// Emitted when `isAutoNativeCurrencyDistribution` is set.
    event AutoNativeCurrencyDistribution(bool newValue);

    /// Emitted when recipients set immutable.
    event ImmutableRecipients(bool isImmutableRecipients);

    /**
     * @dev Throws if sender is not distributor
     */
    modifier onlyDistributor() {
        if (!distributors[msg.sender]) {
            revert OnlyDistributorError();
        }
        _;
    }

    /**
     * @dev Checks whether sender is controller
     */
    modifier onlyController() {
        if (msg.sender != controller) {
            revert OnlyControllerError();
        }
        _;
    }

    receive() external payable {
        // Check whether automatic eth distribution is enabled
        // and that contractBalance is native currency enough to automatic distribution
        uint256 contractBalance = address(this).balance;
        if (
            isAutoNativeCurrencyDistribution &&
            contractBalance >= minAutoDistributionAmount
        ) {
            _redistributeNativeCurrency(contractBalance);
        }
    }

    /**
     * @notice External function to return number of recipients
     */
    function numberOfRecipients() external view returns (uint256) {
        return recipients.length;
    }

    /**
     * @notice Internal function to redistribute native currency based on percentages assign to the recipients
     * @param _valueToDistribute Native currency amount to be distribute
     */
    function _redistributeNativeCurrency(uint256 _valueToDistribute) internal virtual {}

    /**
     * @notice External function to redistribute NativeCurrency based on percentages assign to the recipients
     */
    function redistributeNativeCurrency() external onlyDistributor {
        _redistributeNativeCurrency(address(this).balance);
    }

    /**
     * @notice Internal function for adding recipient to revenue share
     * @param _recipient Recipient address
     * @param _percentage Recipient percentage
     */
    function _addRecipient(address payable _recipient, uint256 _percentage) internal {
        if (_recipient == address(0)) {
            revert NullAddressRecipientError();
        }
        if (recipientsPercentage[_recipient] != 0) {
            revert RecipientAlreadyAddedError();
        }
        recipients.push(_recipient);
        recipientsPercentage[_recipient] = _percentage;
    }

    /**
     * @notice function for removing all recipients
     */
    function _removeAll() internal {
        uint256 recipientsLength = recipients.length;

        if (recipientsLength == 0) {
            return;
        }

        for (uint256 i = 0; i < recipientsLength; ) {
            address recipient = recipients[i];
            recipientsPercentage[recipient] = 0;
            unchecked {
                i++;
            }
        }
        delete recipients;
    }

    /**
     * @notice Internal function for setting recipients.
     * @param _recipients Array of `RecipientData` structs with recipient address and percentage.
     */
    function _setRecipients(RecipientData[] calldata _recipients) internal {
        if (isImmutableRecipients) {
            revert ImmutableRecipientsError();
        }

        _removeAll();

        uint256 percentageSum;
        uint256 newRecipientsLength = _recipients.length;
        for (uint256 i = 0; i < newRecipientsLength; ) {
            uint256 percentage = _recipients[i].percentage;
            _addRecipient(_recipients[i].addrs, percentage);
            percentageSum += percentage;
            unchecked {
                i++;
            }
        }

        if (percentageSum != BASIS_POINT) {
            revert InvalidPercentageError(percentageSum);
        }

        emit SetRecipients(_recipients);
    }

    /**
     * @notice External function for setting recipients.
     * @param _recipients Array of `RecipientData` structs with recipient address and percentage.
     */
    function setRecipients(RecipientData[] calldata _recipients) public onlyController {
        _setRecipients(_recipients);
    }

    /**
     * @notice External function for setting immutable recipients.
     * @param _recipients Array of `RecipientData` structs with recipient address and percentage.
     */
    function setRecipientsExt(
        RecipientData[] calldata _recipients
    ) public onlyController {
        _setRecipients(_recipients);
        _setImmutableRecipients();
    }

    /**
     * @notice External function to set distributor address.
     * @param _distributor Address of new distributor.
     * @param _isDistributor Bool indicating whether address is / isn't distributor.
     */
    function setDistributor(
        address _distributor,
        bool _isDistributor
    ) external onlyOwner {
        bool isDistributor = distributors[_distributor];
        if (isDistributor != _isDistributor) {
            emit Distributor(_distributor, _isDistributor);
            distributors[_distributor] = _isDistributor;
        }
    }

    /**
     * @notice External function to set controller address.
     * @param _controller Address of new controller.
     */
    function setController(address _controller) external onlyOwner {
        if (controller != _controller) {
            emit Controller(_controller);
            controller = _controller;
        }
    }

    /**
     * @notice Internal function to check whether recipient should be recursively distributed
     * @param _recipient Address of recipient to recursively distribute
     * @param _token Token to be distributed
     */
    function _recursiveERC20Distribution(address _recipient, IERC20 _token) internal {
        // Handle Recursive token distribution
        IRecursiveRSC recursiveRecipient = IRecursiveRSC(_recipient);

        // Wallets have size 0 and contracts > 0. This way we can distinguish them.
        uint256 recipientSize;
        assembly {
            recipientSize := extcodesize(_recipient)
        }
        if (recipientSize > 0) {
            // Validate this contract is distributor in child recipient
            try recursiveRecipient.distributors(address(this)) returns (
                bool isBranchDistributor
            ) {
                if (isBranchDistributor) {
                    recursiveRecipient.redistributeToken(_token);
                }
            } catch {
                return;
            } // unable to recursively distribute
        }
    }

    /**
     * @notice Internal function to check whether recipient should be recursively distributed
     * @param _recipient Address of recipient to recursively distribute
     */
    function _recursiveNativeCurrencyDistribution(address _recipient) internal {
        // Handle Recursive currency distribution
        IRecursiveRSC recursiveRecipient = IRecursiveRSC(_recipient);

        // Wallets have size 0 and contracts > 0. This way we can distinguish them.
        uint256 recipientSize;
        assembly {
            recipientSize := extcodesize(_recipient)
        }
        if (recipientSize > 0) {
            // Check whether child recipient have autoNativeCurrencyDistribution set to true,
            // if yes currency will be recursively distributed automatically
            try recursiveRecipient.isAutoNativeCurrencyDistribution() returns (
                bool childAutoNativeCurrencyDistribution
            ) {
                if (childAutoNativeCurrencyDistribution == true) {
                    return;
                }
            } catch {
                return;
            }

            // Validate this contract is distributor in child recipient
            try recursiveRecipient.distributors(address(this)) returns (
                bool isBranchDistributor
            ) {
                if (isBranchDistributor) {
                    recursiveRecipient.redistributeNativeCurrency();
                }
            } catch {
                return;
            } // unable to recursively distribute
        }
    }

    /**
     * @notice Internal function for setting immutable recipients to true.
     */
    function _setImmutableRecipients() internal {
        if (!isImmutableRecipients) {
            emit ImmutableRecipients(true);
            isImmutableRecipients = true;
        }
    }

    /**
     * @notice External function for setting immutable recipients to true.
     */
    function setImmutableRecipients() external onlyOwner {
        if (isImmutableRecipients) {
            revert ImmutableRecipientsError();
        }

        _setImmutableRecipients();
    }

    /**
     * @notice External function for setting auto native currency distribution.
     * @param _isAutoNativeCurrencyDistribution Bool switching whether auto native currency distribution is enabled.
     */
    function setAutoNativeCurrencyDistribution(
        bool _isAutoNativeCurrencyDistribution
    ) external onlyOwner {
        if (isAutoNativeCurrencyDistribution != _isAutoNativeCurrencyDistribution) {
            emit AutoNativeCurrencyDistribution(_isAutoNativeCurrencyDistribution);
            isAutoNativeCurrencyDistribution = _isAutoNativeCurrencyDistribution;
        }
    }

    /**
     * @notice External function for setting minimun auto distribution amount.
     * @param _minAutoDistributionAmount New minimum distribution amount.
     */
    function setMinAutoDistributionAmount(
        uint256 _minAutoDistributionAmount
    ) external onlyOwner {
        if (minAutoDistributionAmount != _minAutoDistributionAmount) {
            emit MinAutoDistributionAmount(_minAutoDistributionAmount);
            minAutoDistributionAmount = _minAutoDistributionAmount;
        }
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership is forbidden for RSC contract.
     */
    function renounceOwnership() public view override onlyOwner {
        revert RenounceOwnershipForbidden();
    }
}
