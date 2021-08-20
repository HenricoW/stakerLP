// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./stETB.sol";

/*  
 * The Staker contract controls the emission of ETB tokens as staking reward. For 
 * every ETB staked, stETB is awarded to that user in a 1:1 ratio. This serves as
 * reminder of staking in the user's account and allows for future utility while 
 * staking.
 * Method:
 * The rewards are not claimed/sent with every new deposit. Instead, a user's 
 * rewards are only sent when a user claims/unstakes.
 * To keep rewards proportional and maintain the emission rate, we keep track of 
 * the amount of stakers and the time that this amount changes. Upon claiming or 
 * unstaking, the user's total stake is calculated and sent.
 * Option (using this way): reward only claimed when unstaking
 * Option: reward can be claimed without unstaking -> will need to update start 
 * start of staking block
 */
contract Staker is stETB, Ownable {
    // start, end and amount of tokens to relase over that period (Emission Era)
    uint public startBlock;
    uint public endBlock;
    uint public releaseAmount;
    IERC20 public ETBtoken;

    bool public isEmitting; // use to detect if new Emission Era can be set

    // STAKING STATUS:
    uint public lastCheckPt; // latest block where staker amount changed
    uint public stakerCount; // current number of stakers
    struct CheckPoint {
        uint blocknumber;
        uint stakerCount;
    }
    CheckPoint[] public checkPtRecord; // keeps track of evolution of checkpoint details
    uint public tokensReleased; // total number of tokens released since staking genisis

    // USER STATUS:
    // keep track of each user's stake amount change, with block number
    // struct UsrChkPt { blocknum; stakeAmt }
    // mapping( userAddr => UsrChkPt[] ) -> use this user mapping to iterate over checkPtRecord to calc stake reward

    // -----------------------------
    //      MAIN CONTRACT BODY:
    // -----------------------------
    constructor (address _ETBaddress) {
        ETBtoken = IERC20(_ETBaddress);
    }

    // create a new Emission Era - only owner
    // owner must have enough tokens to fund _releaseAmount
    function createEra(uint _startBlock, uint _endBlock, uint _releaseAmount) external onlyOwner returns(bool) {
        startBlock = _startBlock;
        endBlock = _endBlock;
        releaseAmount = _releaseAmount;

        return ETBtoken.transferFrom(msg.sender, address(this), _releaseAmount);
    }

    // user stake (deposit)

    // user claim (only rewards) -> OPTIONAL? -> @ least internal either way

    // user unstake (withdraw & claim)
}