# RSCPrepaymentFactory

## Contract Description


License: MIT

## Events info

### NewRSCPrepayment event

```solidity
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
```

### NewRSCPrepaymentUsd event

```solidity
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
```

### OwnershipTransferred event

```solidity
event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
```

### PlatformFee event

```solidity
event PlatformFee(uint256 newFee);
```

### PlatformWallet event

```solidity
event PlatformWallet(address newPlatformWallet);
```

## Errors info

### InvalidFeePercentage error

```solidity
error InvalidFeePercentage(uint256);
```

## Functions info

### BASIS_POINT (0xada5f642)

```solidity
function BASIS_POINT() external view returns (uint256);
```


Measurement unit 10000000 = 100%.

### VERSION (0xffa1ad74)

```solidity
function VERSION() external view returns (bytes32);
```


RSCPrepaymentFactory contract version.

### contractImplementation (0x9e72370b)

```solidity
function contractImplementation() external view returns (address);
```


RSCPrepayment implementation address.

### contractImplementationUsd (0x706310d8)

```solidity
function contractImplementationUsd() external view returns (address);
```


RSCPrepaymentUSD implementation address.

### createRSCPrepayment (0xaa137bf3)

```solidity
function createRSCPrepayment(tuple _data, bytes32 creationId) external returns (address);
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

### createRSCPrepaymentUsd (0x67cfdad0)

```solidity
function createRSCPrepaymentUsd(
	tuple _data,
	address nativeTokenUsdPriceFeed,
	bytes32 creationId
) external returns (address);
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


Current platform fee.

### platformWallet (0xfa2af9da)

```solidity
function platformWallet() external view returns (address);
```


Fee receiver address.

### predictDeterministicAddress (0xb2319b4d)

```solidity
function predictDeterministicAddress(
	tuple _data,
	address _deployer
) external view returns (address);
```


External function for creating clone proxy pointing to RSC Percentage.


Parameters:

| Name      | Type    | Description                                               |
| :-------- | :------ | :-------------------------------------------------------- |
| _data     | tuple   | RSC Create data used for hashing and getting random salt. |
| _deployer | address | Wallet address that want to create new RSC contract.      |

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

| Name | Type    | Description                                        |
| :--- | :------ | :------------------------------------------------- |
| _fee | uint256 | Percentage define platform fee 100% == BASIS_POINT |

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
