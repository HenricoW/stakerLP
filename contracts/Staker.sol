// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/*  
 * The Staker contract controls the emission of ETB tokens as staking reward. 
 * Method:
 * The rewards are not claimed/sent with every new deposit. Instead, a user's 
 * rewards are only sent when a user claims/unstakes.
 * To keep rewards proportional and maintain the emission rate, we keep track of 
 * the total stake and the time that this amount changes. Upon claiming or 
 * unstaking, the user's total stake is calculated and sent.
 * Option (using this way): reward only claimed when unstaking
 * Option: reward can be claimed without unstaking -> will need to update start 
 * start of staking block
 */
contract Staker is Ownable {
    // start, end and amount of tokens to relase over that period (Emission Era)
    uint public durationInBlocks;
    uint public startBlock; // when admin initiates rewards
    uint public endBlock;   // will be calculated
    uint public releaseAmount;
    IERC20 public LPtoken;

    bool public isEmitting; // use to detect if new Emission Era can be set
    // could replace with enum EmissionStatus { notStarted, Initialized, EraActive, EraEnded }

    // STAKING STATUS:
    uint public lastCheckPt; // latest block where staked amount changed
    uint public totalStaked; // current total staked amount
    struct CheckPoint {
        uint blocknumber;
        uint totalStaked;
    }
    CheckPoint[] public checkPtRecord; // keeps track of evolution of checkpoint details
    uint public tokensClaimed; // total number of reward tokens claimed since staking genisis

    // USER STATUS:
    // keep track of each user's stake amount change, with block number
    struct UsrChkPt { uint blocknum; uint stakeAmt; } // user stake amount track record
    struct RewardStatus { uint calcultadAt; uint rewardTotal; } // latest user reward calculation -> OPTIONS: could calc at every new stake chg OR only at unstake
    struct UserStatus { UsrChkPt[] userRecord; RewardStatus userRewStatus; }
    mapping( address => UserStatus[] ) public stateOfUsers; // -> use this mapping to iterate over [checkPtRecord] to calc stake reward (and optionally update latest total stake reward)

    // -----------------------------
    //      MAIN CONTRACT BODY:
    // -----------------------------
    constructor (address _ETBaddress) {
        LPtoken = IERC20(_ETBaddress);
    }

    // create a new Emission Era - only owner
    // owner must have enough tokens to fund _releaseAmount
    // OPTION: could change to createEra(_durationInBlocks, _releaseAmount) AND a startEra() function !!
    function createEra(uint _startBlock, uint _endBlock, uint _releaseAmount) external onlyOwner returns(bool) {
        startBlock = _startBlock;
        endBlock = _endBlock;
        releaseAmount = _releaseAmount;

        return LPtoken.transferFrom(msg.sender, address(this), _releaseAmount);
    }

    // user stake (deposit)

    // OPTIONAL? user claim (only rewards) -> @ least internal either way

    // user unstake (withdraw & claim)

    // NO stETB WILL BE ISSUED, SO NO NEED: take care of the cases for user transfers
}