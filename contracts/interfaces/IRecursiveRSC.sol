// SPDX-License-Identifier: MIT

pragma solidity ^0.8.19;

interface IRecursiveRSC {
    function distributors(address _distributor) external returns (bool);

    function redistributeToken(address _token) external;

    function redistributeNativeCurrency() external;

    function isAutoNativeCurrencyDistribution() external returns (bool);
}
