# RSCPrepaymentUsd

## Contract Description


License: MIT

## Events info

### ControllerChanged event

```solidity
event ControllerChanged(address oldController, address newController);
```

### DistributeToken event

```solidity
event DistributeToken(address token, uint256 amount);
```

### DistributorChanged event

```solidity
event DistributorChanged(address distributor, bool isDistributor);
```

### Initialized event

```solidity
event Initialized(uint8 version);
```


Triggered when the contract has been initialized or reinitialized.

### NativeTokenPriceFeedSet event

```solidity
event NativeTokenPriceFeedSet(address oldNativeTokenPriceFeed, address newNativeTokenPriceFeed);
```

### OwnershipTransferred event

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

### SetRecipients event

```solidity
event SetRecipients(address[] recipients, uint256[] percentages);
```

### TokenPriceFeedSet event

```solidity
event TokenPriceFeedSet(address token, address priceFeed);
```

## Errors info

### ControllerAlreadyConfiguredError error

```solidity
error ControllerAlreadyConfiguredError();
```

### ImmutableControllerError error

```solidity
error ImmutableControllerError();
```

### InconsistentDataLengthError error

```solidity
error InconsistentDataLengthError();
```

### InvalidPercentageError error

```solidity
error InvalidPercentageError();
```

### InvestorAddressZeroError error

```solidity
error InvestorAddressZeroError();
```

### NullAddressRecipientError error

```solidity
error NullAddressRecipientError();
```

### OnlyControllerError error

```solidity
error OnlyControllerError();
```

### OnlyDistributorError error

```solidity
error OnlyDistributorError();
```

### RecipientAlreadyAddedError error

```solidity
error RecipientAlreadyAddedError();
```

### TokenMissingUsdPriceOracle error

```solidity
error TokenMissingUsdPriceOracle();
```

### TransferFailedError error

```solidity
error TransferFailedError();
```

## Functions info

### autoNativeTokenDistribution (0x7a904507)

```solidity
function autoNativeTokenDistribution() external view returns (bool);
```

### controller (0xf77c4791)

```solidity
function controller() external view returns (address);
```

### distributors (0xcc642784)

```solidity
function distributors(address) external view returns (bool);
```

### factory (0xc45a0155)

```solidity
function factory() external view returns (address);
```

### immutableController (0x6e4b769a)

```solidity
function immutableController() external view returns (bool);
```

### initialize (0xd0b91ef7)

```solidity
function initialize(
	tuple _settings,
	address _investor,
	uint256 _investedAmount,
	uint256 _interestRate,
	uint256 _residualInterestRate,
	address _nativeTokenUsdPriceFeed,
	address[] _initialRecipients,
	uint256[] _percentages
) external;
```


Constructor function, can be called only once


Parameters:

| Name                     | Type      | Description                                                               |
| :----------------------- | :-------- | :------------------------------------------------------------------------ |
| _settings                | tuple     | Contract settings, check InitContractSetting struct                       |
| _investor                | address   | Address who invested money and is gonna receive interested rates          |
| _investedAmount          | uint256   | Amount of invested money from investor                                    |
| _interestRate            | uint256   | Percentage how much more investor will receive upon his investment amount |
| _residualInterestRate    | uint256   | Percentage how much investor will get after his investment is fulfilled   |
| _nativeTokenUsdPriceFeed | address   | oracle address for native token / USD price                               |
| _initialRecipients       | address[] | Addresses to be added as a initial recipients                             |
| _percentages             | uint256[] | percentages for recipients                                                |

### interestRate (0x7c3a00fd)

```solidity
function interestRate() external view returns (uint256);
```

### investedAmount (0xeaab4597)

```solidity
function investedAmount() external view returns (uint256);
```

### investor (0x1e0018d6)

```solidity
function investor() external view returns (address);
```

### investorAmountToReceive (0xd271445a)

```solidity
function investorAmountToReceive() external view returns (uint256);
```

### investorReceivedAmount (0xcd073e07)

```solidity
function investorReceivedAmount() external view returns (uint256);
```

### minAutoDistributionAmount (0x478f425a)

```solidity
function minAutoDistributionAmount() external view returns (uint256);
```

### numberOfRecipients (0xee0e01c7)

```solidity
function numberOfRecipients() external view returns (uint256);
```


External function to return number of recipients

### owner (0x8da5cb5b)

```solidity
function owner() external view returns (address);
```


Returns the address of the current owner.

### platformFee (0x26232a2e)

```solidity
function platformFee() external view returns (uint256);
```

### recipients (0xd1bc76a1)

```solidity
function recipients(uint256) external view returns (address);
```

### recipientsPercentage (0x1558ab2f)

```solidity
function recipientsPercentage(address) external view returns (uint256);
```

### redistributeNativeToken (0x6194e63c)

```solidity
function redistributeNativeToken() external;
```


External function to redistribute NativeToken based on percentages assign to the recipients

### redistributeToken (0xf4d3bdec)

```solidity
function redistributeToken(address _token) external;
```


External function to redistribute ERC20 token based on percentages assign to the recipients


Parameters:

| Name   | Type    | Description                            |
| :----- | :------ | :------------------------------------- |
| _token | address | Address of the token to be distributed |

### renounceOwnership (0x715018a6)

```solidity
function renounceOwnership() external;
```


Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.

### residualInterestRate (0x936c1d86)

```solidity
function residualInterestRate() external view returns (uint256);
```

### setController (0x92eefe9b)

```solidity
function setController(address _controller) external;
```


External function to set controller address, if set to address(0), unable to change it


Parameters:

| Name        | Type    | Description               |
| :---------- | :------ | :------------------------ |
| _controller | address | address of new controller |

### setDistributor (0xd59ba0df)

```solidity
function setDistributor(address _distributor, bool _isDistributor) external;
```


External function to set distributor address


Parameters:

| Name           | Type    | Description                                            |
| :------------- | :------ | :----------------------------------------------------- |
| _distributor   | address | address of new distributor                             |
| _isDistributor | bool    | bool indicating whether address is / isn't distributor |

### setNativeTokenPriceFeed (0xc9b3c702)

```solidity
function setNativeTokenPriceFeed(address _priceFeed) external;
```


External function for setting price feed oracle for native token


Parameters:

| Name       | Type    | Description                                |
| :--------- | :------ | :----------------------------------------- |
| _priceFeed | address | address of USD price feed for native token |

### setRecipients (0xae373c1b)

```solidity
function setRecipients(address[] _newRecipients, uint256[] _percentages) external;
```


External function for setting recipients


Parameters:

| Name           | Type      | Description                    |
| :------------- | :-------- | :----------------------------- |
| _newRecipients | address[] | Addresses to be added          |
| _percentages   | uint256[] | new percentages for recipients |

### setTokenUsdPriceFeed (0xdf85477e)

```solidity
function setTokenUsdPriceFeed(address _token, address _priceFeed) external;
```


External function for setting price feed oracle for token


Parameters:

| Name       | Type    | Description                               |
| :--------- | :------ | :---------------------------------------- |
| _token     | address | address of token                          |
| _priceFeed | address | address of USD price feed for given token |

### transferOwnership (0xf2fde38b)

```solidity
function transferOwnership(address newOwner) external;
```


Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.