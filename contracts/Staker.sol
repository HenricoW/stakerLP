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
    uint public durationInDays;
    uint public startTime;          // when 1st stake is made
    uint public endTime;            // will be calculated
    uint public releaseAmount;
    IERC20 public LPtoken;
    IERC20 public ETBtoken;

    enum EmissionStates { NOT_STARTED, INITIALIZED, ERA_ACTIVE, ERA_ENDED }
    EmissionStates emissionStatus = EmissionStates.NOT_STARTED;

    uint public rewardInterval = 24 hours; // reward calculations will not be per block but per block interval

    // STAKING STATUS:
    uint public lastCheckPt;        // the last time staked amount changed
    uint public totalStaked;        // latest total staked in contract
    uint public tokensClaimed;      // total number of reward tokens claimed since staking genisis
    struct CheckPoint {
        uint blocktime;             // block time at START of new reward interval
        uint totalStaked;           // cumulative stake as at this reward interval
    }
    CheckPoint[] public checkPtRecord; // keeps track of evolution of checkpoints, one per reward interval

    // USER STATUS: keep track of each user's stake amount change, with block time
    struct UsrChkPt {
        uint mainChkPtIndex;        // index of main CheckPoint[] array where change happened
        uint totUsrStake;           // cumulative user stake as at this check point
    }
    struct UserState { 
        UsrChkPt[] userRecord;      // track record of all stake changes (stake & unstake)
        uint idxOfLastClaim;        // index of main CheckPoint[] array where latest reward was calculated: prevents iterating from start every time
        uint latestRemainingReward; // remainder of accumulated reward left if last claim was partial claim: prevents iterating from start every time
    }
    mapping( address => UserState ) public stateOfUsers; // -> use this mapping to iterate over [checkPtRecord] to calc stake reward (and optionally update latest total stake reward)

    // EVENTS:
    event EmissionStarted(uint indexed startTime, uint endTime, uint releaseAmount);

    // -----------------------------
    //      MAIN CONTRACT BODY:
    // -----------------------------
    constructor (address _lpTokenETB, address _ETBtoken, uint rewardInterval_hours) {
        LPtoken = IERC20(_lpTokenETB);
        ETBtoken = IERC20(_ETBtoken);
        if(rewardInterval_hours != 0) rewardInterval = rewardInterval_hours;
    }

    // create a new Emission Era - only owner
    // owner must have enough tokens to fund _releaseAmount
    function createEra(uint _durationInBlocks, uint _releaseAmount) external onlyOwner {
        require(emissionStatus == EmissionStates.NOT_STARTED || emissionStatus == EmissionStates.ERA_ENDED, "Staker#createEra: Emission Era currently in progress");
        require(_releaseAmount > 0, "Staker#createEra: Release amount cannot be zero");
        require(_durationInBlocks > 0, "Staker#createEra: Block duration cannot be zero");
        bool txSuccess = ETBtoken.transferFrom(msg.sender, address(this), _releaseAmount);
        require(txSuccess, "Staker#createEra: ETB token transfer failed");

        // durationInBlocks = _durationInBlocks;
        // releaseAmount = _releaseAmount;
        // emissionStatus = EmissionStates.INITIALIZED;
    }

    // Users stake (deposit) ETB LP tokens
    function stake(uint _LPamount) external {
        require(emissionStatus == EmissionStates.INITIALIZED || emissionStatus == EmissionStates.ERA_ACTIVE, "Staker#stake: Emission Era has not started");
        require(_LPamount > 0, "Staker#stake: LP amount cannot be zero");
        bool txSuccess = LPtoken.transferFrom(msg.sender, address(this), _LPamount);
        require(txSuccess, "Staker#stake: ETB token transfer failed");

        // 1st staker starts the emission process (prevents [reward / 0] later in logic)
        if(emissionStatus == EmissionStates.INITIALIZED) {
            emissionStatus == EmissionStates.ERA_ACTIVE;
            // startBlock = block.number;
            // endBlock = startBlock + durationInBlocks;

            // emit EmissionStarted(startBlock, endBlock, releaseAmount);
        }
        
        // // staking state update
        // totalStaked += _LPamount;
        // CheckPoint memory chkPt = CheckPoint(block.number, totalStaked);
        // checkPtRecord.push(chkPt);

        // // user state update
        // UsrChkPt memory usrChkPt = UsrChkPt((checkPtRecord.length - 1), _LPamount);
        // stateOfUsers[msg.sender].userRecord.push(usrChkPt);
    }

    // OPTIONAL? user claim (only rewards) -> @ least internal either way

    // user unstake (withdraw & claim)

    // NO stETB WILL BE ISSUED, SO NO NEED: take care of the cases for user transfers
}