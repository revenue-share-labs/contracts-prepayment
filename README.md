# XLA Revenue Share Smart Contract - Prepayment

This repository contains solidity smart contracts + tests for XLA RSC Prepayment created by BlockCzech L&B

This smart contract is designed to distribute funds to the investor and recipients based on predetermined percentages.
The contract will first distribute funds to investors up to an invested amount + interest rate,
then distribute the remaining funds to recipients according to the percentage.

## Deployment

### testing - polygon

```
X.LA RSC Prepayment factory deployed to: 0x9990879a5552edbE719a7c72593aD59d718bCF03
```

#### production - polygon

```
X.LA RSC Prepayment factory deployed to:
```

## Running locally

This repository is standard hardhat repository. Use the following commands to test / deploy RSC Prepayment Factory locally.

```shell
npx hardhat test
npx hardhat node
npx hardhat run scripts/deployRSCPrepaymentFactory.ts
```
