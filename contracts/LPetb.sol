// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LPetb is ERC20 {
    constructor () ERC20("ETB LP token", "ELP") {}

    function faucet(uint amount) external {
        _mint(msg.sender, amount);
    }
}