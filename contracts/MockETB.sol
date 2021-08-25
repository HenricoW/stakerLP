// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockETB is ERC20 {
    constructor () ERC20("Mock ETB", "mETB") {
        _mint(msg.sender, 10000 ether);
    }
}