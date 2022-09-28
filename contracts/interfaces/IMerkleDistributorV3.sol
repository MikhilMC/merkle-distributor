// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0;

// Allows anyone to claim a token if they exist in a merkle root.
interface IMerkleDistributorV3 {
    // Returns the description about the contract
    function description() external view returns (string memory);
    // Returns the address of the token distributed by this contract.
    function token() external view returns (address);
    // Returns the status whether contract timelock is available or not.
    function hasTimelock() external view returns (bool);
    // Returns the starting of contract timelock.
    function startingTime() external view returns (uint256);
    // Returns the ending of contract timelock.
    function endingTime() external view returns (uint256);
    // Returns the merkle root of the merkle tree containing account balances available to claim.
    function merkleRoot() external view returns (bytes32);
    // Returns true if the index has been marked claimed.
    function isClaimed(uint256 index) external view returns (bool);
    // Claim the given amount of the token to the given address. Reverts if the inputs are invalid.
    function claim(uint256 index, address account, uint256 amount, uint256 timestamp, bytes32[] calldata merkleProof) external;

    // This event is triggered whenever a call to #claim succeeds.
    event Claimed(uint256 index, address account, uint256 amount);
}