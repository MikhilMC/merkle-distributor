// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
// import "./MerkleProof.sol";
import "./interfaces/IMerkleDistributorV3.sol";
// import "hardhat/console.sol";

contract MerkleDistributorV3 is IMerkleDistributorV3 {
    string public constant description = "Merkle Distributor contract with individual timestamp";
    address public immutable override token;
    bytes32 public immutable override merkleRoot;

    // This is a packed array of booleans.
    mapping(uint256 => uint256) private claimedBitMap;

    constructor(address token_, bytes32 merkleRoot_) {
        token = token_;
        merkleRoot = merkleRoot_;
    }

    function isClaimed(uint256 index) public view override returns (bool) {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        uint256 claimedWord = claimedBitMap[claimedWordIndex];
        uint256 mask = (1 << claimedBitIndex);
        return claimedWord & mask == mask;
    }

    function _setClaimed(uint256 index) private {
        uint256 claimedWordIndex = index / 256;
        uint256 claimedBitIndex = index % 256;
        claimedBitMap[claimedWordIndex] = claimedBitMap[claimedWordIndex] | (1 << claimedBitIndex);
    }

    function claim(
        uint256 index,
        address account,
        uint256 amount,
        uint256 timestamp,
        bytes32[] calldata merkleProof
    ) external override {
        require(!isClaimed(index), 'MerkleDistributor: Drop already claimed.');

        // Checking whether timestamp have expired, and token is available for claiming
        require(timestamp <= block.timestamp, 'MerkleDistributor: Timestamp have not expired.');

        // Verify the merkle proof.
        bytes32 node = keccak256(abi.encodePacked(index, account, amount, timestamp));
        require(MerkleProof.verify(merkleProof, merkleRoot, node), 'MerkleDistributor: Invalid proof.');

        // Mark it claimed and send the token.
        _setClaimed(index);
        require(IERC20(token).transfer(account, amount), 'MerkleDistributor: Transfer failed.');

        emit Claimed(index, account, amount);
    }
}
