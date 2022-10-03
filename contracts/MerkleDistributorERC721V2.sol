// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";

contract MerkleDistributorERC721V2 is ERC721 {
    bytes32 immutable public root;
    uint256 immutable public timestamp;

    constructor(
        string memory name_,
        string memory symbol_,
        bytes32 merkleroot_,
        uint256 timelock_
    ) ERC721(name_, symbol_)
    {
        root = merkleroot_;
        timestamp = timelock_;
    }

    function redeem(address account, uint256 tokenId, bytes32[] calldata proof)
    external
    {
        require(
            block.timestamp >= timestamp,
            "Merkle Distribution: Timelock have not expired."
        );
        require(
            _verify(_leaf(account, tokenId), proof),
            "Merkle Distribution: Invalid merkle proof"
        );
        _safeMint(account, tokenId);
    }

    function _leaf(address account, uint256 tokenId)
    internal pure returns (bytes32)
    {
        return keccak256(abi.encodePacked(tokenId, account));
    }

    function _verify(bytes32 leaf, bytes32[] memory proof)
    internal view returns (bool)
    {
        return MerkleProof.verify(proof, root, leaf);
    }
}