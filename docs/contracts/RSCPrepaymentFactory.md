# RSCPrepaymentFactory

## Contract Description


License: MIT

## Events info

### OwnershipTransferred event

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

### PlatformFeeChanged event

```solidity
event PlatformFeeChanged(uint256 oldFee, uint256 newFee);
```

### PlatformWalletChanged event

```solidity
event PlatformWalletChanged(address oldPlatformWallet, address newPlatformWallet);
```

### RSCPrepaymentCreated event

```solidity
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
```

### RSCPrepaymentUsdCreated event

```solidity
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
```

## Errors info

### CreationIdAlreadyProcessed error

```solidity
error CreationIdAlreadyProcessed();
```

### InvalidFeePercentage error

```solidity
error InvalidFeePercentage();
```

## Functions info

### contractImplementation (0x9e72370b)

```solidity
function contractImplementation() external view returns (address);
```

### contractImplementationUsd (0x706310d8)

```solidity
function contractImplementationUsd() external view returns (address);
```

### createRSCPrepayment (0x9fa56e14)

```solidity
function createRSCPrepayment(tuple _data) external returns (address);
```


Public function for creating clone proxy pointing to RSC Prepayment


Parameters:

| Name  | Type  | Description                                                        |
| :---- | :---- | :----------------------------------------------------------------- |
| _data | tuple | Initial data for creating new RSC Prepayment native token contract |


Return values:

| Name | Type    | Description             |
| :--- | :------ | :---------------------- |
| _0   | address | Address of new contract |

### createRSCPrepaymentUsd (0xc0fffb71)

```solidity
function createRSCPrepaymentUsd(tuple _data) external returns (address);
```


Public function for creating clone proxy pointing to RSC Prepayment USD


Parameters:

| Name  | Type  | Description                                               |
| :---- | :---- | :-------------------------------------------------------- |
| _data | tuple | Initial data for creating new RSC Prepayment USD contract |


Return values:

| Name | Type    | Description             |
| :--- | :------ | :---------------------- |
| _0   | address | Address of new contract |

### owner (0x8da5cb5b)

```solidity
function owner() external view returns (address);
```


Returns the address of the current owner.

### platformFee (0x26232a2e)

```solidity
function platformFee() external view returns (uint256);
```

### platformWallet (0xfa2af9da)

```solidity
function platformWallet() external view returns (address);
```

### processedCreationIds (0x194a2e3b)

```solidity
function processedCreationIds(bytes32) external view returns (bool);
```

### renounceOwnership (0x715018a6)

```solidity
function renounceOwnership() external;
```


Leaves the contract without owner. It will not be possible to call `onlyOwner` functions anymore. Can only be called by the current owner. NOTE: Renouncing ownership will leave the contract without an owner, thereby removing any functionality that is only available to the owner.

### setPlatformFee (0x12e8e2c3)

```solidity
function setPlatformFee(uint256 _fee) external;
```


Only Owner function for setting platform fee


Parameters:

| Name | Type    | Description                                     |
| :--- | :------ | :---------------------------------------------- |
| _fee | uint256 | Percentage define platform fee 100% == 10000000 |

### setPlatformWallet (0x8831e9cf)

```solidity
function setPlatformWallet(address _platformWallet) external;
```


Only Owner function for setting platform fee


Parameters:

| Name            | Type    | Description                                     |
| :-------------- | :------ | :---------------------------------------------- |
| _platformWallet | address | New native token wallet which will receive fees |

### transferOwnership (0xf2fde38b)

```solidity
function transferOwnership(address newOwner) external;
```


Transfers ownership of the contract to a new account (`newOwner`). Can only be called by the current owner.
