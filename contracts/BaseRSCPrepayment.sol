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
error InvalidPercentageError();

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

// Throw when amount to distribute is less than 10000000
error TooLowBalanceToRedistribute();

abstract contract BaseRSCPrepayment is OwnableUpgradeable {
    mapping(address => bool) public distributors;
    address public controller;
    bool public isImmutableRecipients;
    bool public immutableController;
    bool public isAutoNativeCurrencyDistribution;
    uint256 public minAutoDistributionAmount;
    uint256 public platformFee;
    IFeeFactory public factory;

    uint256 public interestRate;
    uint256 public residualInterestRate;

    address payable public investor;
    uint256 public investedAmount;
    uint256 public investorAmountToReceive;
    uint256 public investorReceivedAmount;

    address payable[] public recipients;
    mapping(address => uint256) public recipientsPercentage;

    struct InitContractSetting {
        address owner;
        address[] _distributors;
        address controller;
        bool immutableController;
        bool isAutoNativeCurrencyDistribution;
        uint256 minAutoDistributionAmount;
        uint256 platformFee;
        address factoryAddress;
        address[] supportedErc20addresses;
        address[] erc20PriceFeeds;
    }

    event SetRecipients(address payable[] recipients, uint256[] percentages);
    event DistributeToken(address token, uint256 amount);
    event DistributorChanged(address distributor, bool isDistributor);
    event ControllerChanged(address oldController, address newController);
    event MinAutoDistributionAmountChanged(uint256 oldAmount, uint256 newAmount);
    event AutoNativeCurrencyDistributionChanged(bool oldValue, bool newValue);
    event ImmutableRecipients(bool isImmutableRecipients);

    /**
     * @dev Throws if sender is not distributor
     */
    modifier onlyDistributor() {
        if (distributors[msg.sender] == false) {
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

    fallback() external payable {
        // Check whether automatic native currency distribution is enabled
        // and that contractBalance is high enough to automatic distribution
        uint256 contractBalance = address(this).balance;
        if (isAutoNativeCurrencyDistribution && contractBalance >= minAutoDistributionAmount) {
            _redistributeNativeCurrency(contractBalance);
        }
    }

    receive() external payable {
        // Check whether automatic eth distribution is enabled
        // and that contractBalance is native currency enough to automatic distribution
        uint256 contractBalance = address(this).balance;
        if (isAutoNativeCurrencyDistribution && contractBalance >= minAutoDistributionAmount) {
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
     * @notice Internal function to check whether percentages are equal to 100%
     * @return valid boolean indicating whether sum of percentage == 100%
     */
    function _percentageIsValid() internal view returns (bool valid) {
        uint256 recipientsLength = recipients.length;
        uint256 percentageSum;

        for (uint256 i = 0; i < recipientsLength; ) {
            address recipient = recipients[i];
            percentageSum += recipientsPercentage[recipient];
            unchecked {
                i++;
            }
        }

        return percentageSum == 10000000;
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
     * @notice Internal function to set recipients in one TX
     * @param _newRecipients Addresses to be added as a new recipients
     * @param _percentages new percentages for recipients
     */
    function _setRecipients(
        address payable[] memory _newRecipients,
        uint256[] memory _percentages
    ) internal {
        uint256 newRecipientsLength = _newRecipients.length;
        if (newRecipientsLength != _percentages.length) {
            revert InconsistentDataLengthError();
        }

        _removeAll();

        for (uint256 i = 0; i < newRecipientsLength; ) {
            _addRecipient(_newRecipients[i], _percentages[i]);
            unchecked {
                i++;
            }
        }

        if (_percentageIsValid() == false) {
            revert InvalidPercentageError();
        }
        emit SetRecipients(_newRecipients, _percentages);
    }

    /**
     * @notice External function for setting recipients
     * @param _newRecipients Addresses to be added
     * @param _percentages new percentages for recipients
     */
    function setRecipients(
        address payable[] memory _newRecipients,
        uint256[] memory _percentages
    ) public onlyController {
        _setRecipients(_newRecipients, _percentages);
    }

    /**
     * @notice External function to set distributor address
     * @param _distributor address of new distributor
     * @param _isDistributor bool indicating whether address is / isn't distributor
     */
    function setDistributor(
        address _distributor,
        bool _isDistributor
    ) external onlyOwner {
        emit DistributorChanged(_distributor, _isDistributor);
        distributors[_distributor] = _isDistributor;
    }

    /**
     * @notice External function to set controller address, if set to address(0), unable to change it
     * @param _controller address of new controller
     */
    function setController(address _controller) external onlyOwner {
        if (controller == address(0) || immutableController) {
            revert ImmutableControllerError();
        }
        if (_controller == controller) {
            revert ControllerAlreadyConfiguredError();
        }
        emit ControllerChanged(controller, _controller);
        controller = _controller;
    }

    /**
     * @notice Internal function to check whether recipient should be recursively distributed
     * @param _recipient Address of recipient to recursively distribute
     * @param _token Token to be distributed
     */
    function _recursiveERC20Distribution(address _recipient, address _token) internal {
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
     * @notice Internal function for setting immutable recipients to true
     */
    function _setImmutableRecipients() internal {
        emit ImmutableRecipients(true);
        isImmutableRecipients = true;
    }

    /**
     * @notice External function for setting immutable recipients to true
     */
    function setImmutableRecipients() external onlyOwner {
        if (isImmutableRecipients) {
            revert ImmutableRecipientsError();
        }

        _setImmutableRecipients();
    }

    /**
     * @notice External function for setting auto native currency distribution
     * @param _isAutoNativeCurrencyDistribution Bool switching whether auto native currency distribution is enabled
     */
    function setAutoNativeCurrencyDistribution(
        bool _isAutoNativeCurrencyDistribution
    ) external onlyOwner {
        emit AutoNativeCurrencyDistributionChanged(
            isAutoNativeCurrencyDistribution,
            _isAutoNativeCurrencyDistribution
        );
        isAutoNativeCurrencyDistribution = _isAutoNativeCurrencyDistribution;
    }

    /**
     * @notice External function for setting minimun auto distribution amount
     * @param _minAutoDistributionAmount New minimum distribution amount
     */
    function setMinAutoDistributionAmount(
        uint256 _minAutoDistributionAmount
    ) external onlyOwner {
        emit MinAutoDistributionAmountChanged(
            minAutoDistributionAmount,
            _minAutoDistributionAmount
        );
        minAutoDistributionAmount = _minAutoDistributionAmount;
    }

    /**
     * @dev Leaves the contract without owner. It will not be possible to call
     * `onlyOwner` functions anymore. Can only be called by the current owner.
     *
     * NOTE: Renouncing ownership will is forbidden for RSC contract
     */
    function renounceOwnership() public view override onlyOwner {
        revert RenounceOwnershipForbidden();
    }
}
