// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./MerkleDistributorV3.sol";

contract MerkleDistributionFactory is Ownable, ReentrancyGuard {
    event TokenAirdropCreated(
        address indexed airdropContractAddress,
        address indexed tokenAddress,
        bytes32 merkleTreeRoot,
        uint256 tokenAmount
    );

    constructor() {}

    function createTokenAirdrop(
        address _token,
        bytes32 _merkleRoot,
        uint256 _tokenAmount,
        bool _hasTimelock,
        uint256 _startingTime,
        uint256 _endingTime
    ) external nonReentrant {
        MerkleDistributorV3 airdrop;
        if (_hasTimelock) {
            airdrop = new MerkleDistributorV3(
                _token,
                _merkleRoot,
                true,
                _startingTime,
                _endingTime
            );
        } else {
            airdrop = new MerkleDistributorV3(_token, _merkleRoot, false, 0, 0);
        }
        
        IERC20(_token).transferFrom(msg.sender,address(airdrop), _tokenAmount);
        emit TokenAirdropCreated(
            address(airdrop),
            _token,
            _merkleRoot,
            _tokenAmount
        );
    }
}