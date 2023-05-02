# BaseRSCPrepayment

## Contract Description


License: MIT

## Events info

### AutoNativeCurrencyDistribution event

```solidity
event AutoNativeCurrencyDistribution(bool newValue);
```


Emitted when `isAutoNativeCurrencyDistribution` is set.

### Controller event

```solidity
event Controller(address newController);
```


Emitted when new controller address is set.

### DistributeToken event

```solidity
event DistributeToken(address token, uint256 amount);
```


Emitted when token distribution is triggered.

### Distributor event

```solidity
event Distributor(address distributor, bool isDistributor);
```


Emitted when distributor status is set.

### ImmutableRecipients event

```solidity
event ImmutableRecipients(bool isImmutableRecipients);
```


Emitted when recipients set immutable.

### Initialized event

```solidity
event Initialized(uint8 version);
```


Triggered when the contract has been initialized or reinitialized.

### MinAutoDistributionAmount event

```solidity
event MinAutoDistributionAmount(uint256 newAmount);
```


Emitted when new `minAutoDistributionAmount` is set.

### OwnershipTransferred event

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

### SetRecipients event

```solidity
event SetRecipients(tuple[] recipients);
```


Emitted when recipients and their percentages are set.

## Errors info

### ImmutableRecipientsError error

```solidity
error ImmutableRecipientsError();
```

### InvalidPercentageError error

```solidity
error InvalidPercentageError(uint256);
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

### RenounceOwnershipForbidden error

```solidity
error RenounceOwnershipForbidden();
```

## Functions info

### BASIS_POINT (0xada5f642)

```solidity
function BASIS_POINT() external view returns (uint256);
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


Factory address.

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

### isAutoNativeCurrencyDistribution (0x0808e1c6)

```solidity
function isAutoNativeCurrencyDistribution() external view returns (bool);
```

### isImmutableController (0x4cad8b8b)

```solidity
function isImmutableController() external view returns (bool);
```

### isImmutableRecipients (0xeaf4598a)

```solidity
function isImmutableRecipients() external view returns (bool);
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


Array of the recipients.

### recipientsPercentage (0x1558ab2f)

```solidity
function recipientsPercentage(address) external view returns (uint256);
```


recipientAddress => recipientPercentage

### redistributeNativeCurrency (0x3d12394a)

```solidity
function redistributeNativeCurrency() external;
```


External function to redistribute NativeCurrency based on percentages assign to the recipients

### renounceOwnership (0x715018a6)

```solidity
function renounceOwnership() external view;
```


Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership is forbidden for RSC contract.

### residualInterestRate (0x936c1d86)

```solidity
function residualInterestRate() external view returns (uint256);
```

### setAutoNativeCurrencyDistribution (0x3d39e377)

```solidity
function setAutoNativeCurrencyDistribution(bool _isAutoNativeCurrencyDistribution) external;
```


External function for setting auto native currency distribution.


Parameters:

| Name                              | Type | Description                                                          |
| :-------------------------------- | :--- | :------------------------------------------------------------------- |
| _isAutoNativeCurrencyDistribution | bool | Bool switching whether auto native currency distribution is enabled. |

### setController (0x92eefe9b)

```solidity
function setController(address _controller) external;
```


External function to set controller address.


Parameters:

| Name        | Type    | Description                |
| :---------- | :------ | :------------------------- |
| _controller | address | Address of new controller. |

### setDistributor (0xd59ba0df)

```solidity
function setDistributor(address _distributor, bool _isDistributor) external;
```


External function to set distributor address.


Parameters:

| Name           | Type    | Description                                             |
| :------------- | :------ | :------------------------------------------------------ |
| _distributor   | address | Address of new distributor.                             |
| _isDistributor | bool    | Bool indicating whether address is / isn't distributor. |

### setImmutableRecipients (0x50a2f6c8)

```solidity
function setImmutableRecipients() external;
```


External function for setting immutable recipients to true.

### setMinAutoDistributionAmount (0xf432c79f)

```solidity
function setMinAutoDistributionAmount(uint256 _minAutoDistributionAmount) external;
```


External function for setting minimun auto distribution amount.


Parameters:

| Name                       | Type    | Description                      |
| :------------------------- | :------ | :------------------------------- |
| _minAutoDistributionAmount | uint256 | New minimum distribution amount. |

### setRecipients (0x84890ba3)

```solidity
function setRecipients(tuple[] _recipients) external;
```


External function for setting recipients.


Parameters:

| Name        | Type    | Description                                                             |
| :---------- | :------ | :---------------------------------------------------------------------- |
| _recipients | tuple[] | Array of `RecipientData` structs with recipient address and percentage. |

### setRecipientsExt (0x97bf53b9)

```solidity
function setRecipientsExt(tuple[] _recipients) external;
```


External function for setting immutable recipients.


Parameters:

| Name        | Type    | Description                                                             |
| :---------- | :------ | :---------------------------------------------------------------------- |
| _recipients | tuple[] | Array of `RecipientData` structs with recipient address and percentage. |

### transferOwnership (0xf2fde38b)

```solidity
function transferOwnership(address newOwner) external;
```


Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.
