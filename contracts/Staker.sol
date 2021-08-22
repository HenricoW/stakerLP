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
    uint public durationInDays;
    uint public startTime;          // when 1st stake is made
    uint public endTime;            // will be calculated
    uint public releaseAmount;
    IERC20 public LPtoken;
    IERC20 public ETBtoken;

    enum EmissionStates { NOT_STARTED, INITIALIZED, ERA_ACTIVE, ERA_ENDED }
    EmissionStates emissionStatus = EmissionStates.NOT_STARTED;

    uint public rewardInterval = 24 hours; // reward calculations will not be per block but per block interval

    // STAKING STATE:
    uint public lastCheckPt;        // the last time staked amount changed
    uint public totalStaked;        // latest total staked in contract
    uint public tokensClaimed;      // total number of reward tokens claimed since staking genisis
    uint public intervalStake;      // total staked during current interval
    uint public intervalStart;      // start time of current interval
    
    struct CheckPoint {
        uint blocktime;             // block time at START of new reward interval
        uint totalStaked;           // cumulative stake as at this reward interval
    }
    CheckPoint[] public checkPtRecord; // keeps track of evolution of checkpoints, one per reward interval

    // USER STATE: keep track of each user's stake amount change, with block time
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
    /**
     * @notice Configures the staking contract
     * @param rewardInterval_hours Set to 0 to have default of 24 hrs
     */
    constructor (address _lpTokenETB, address _ETBtoken, uint rewardInterval_hours) {
        LPtoken = IERC20(_lpTokenETB);
        ETBtoken = IERC20(_ETBtoken);
        if(rewardInterval_hours != 0) rewardInterval = rewardInterval_hours;
    }

    /**
     * @notice Create a new Emission Era - only owner
     * @param _durationInDays Specify number of days over which [_releaseAmount] should be released
     */
    function createEra(uint _durationInDays, uint _releaseAmount) external onlyOwner {
        require(emissionStatus == EmissionStates.NOT_STARTED || emissionStatus == EmissionStates.ERA_ENDED, "Staker#createEra: Emission Era currently in progress");
        require(_durationInDays > 0, "Staker#createEra: Block duration cannot be zero");
        require(_releaseAmount > 0, "Staker#createEra: Release amount cannot be zero");
        bool txSuccess = ETBtoken.transferFrom(msg.sender, address(this), _releaseAmount);
        require(txSuccess, "Staker#createEra: ETB token transfer failed");

        durationInDays = _durationInDays *  1 days;
        releaseAmount = _releaseAmount;
        emissionStatus = EmissionStates.INITIALIZED;
    }

    /**
     * @notice Stake (deposit) ETB LP tokens
     * @param _LPamount The amount of LP tokens (not ETB tokens) to stake
     */
    function stake(uint _LPamount) external {
        require(emissionStatus == EmissionStates.INITIALIZED || emissionStatus == EmissionStates.ERA_ACTIVE, "Staker#stake: Emission Era has not started");
        require(_LPamount > 0, "Staker#stake: LP amount cannot be zero");
        bool txSuccess = LPtoken.transferFrom(msg.sender, address(this), _LPamount);
        require(txSuccess, "Staker#stake: ETB token transfer failed");

        // 1st staker starts the emission process (prevents [reward / 0] later in logic)
        if(emissionStatus == EmissionStates.INITIALIZED) {
            emissionStatus == EmissionStates.ERA_ACTIVE;
            startTime = block.timestamp;
            endTime = startTime + durationInDays;
            intervalStart = block.timestamp;

            emit EmissionStarted(startTime, endTime, releaseAmount);
        }
        
        // STAKING STATE UPDATE
        // check if in same interval
        if(block.timestamp < (intervalStart + rewardInterval)) {
            intervalStake += _LPamount;
        } else {
            // this block should happen once per new interval
            // add the latest state of the last interval as a check point
            CheckPoint memory newChkPt = CheckPoint(intervalStart, totalStaked);    // NB: DO THIS AT UNSTAKE & CLAIM FN'S AS WELL TO ENSURE CHECK POINTS ARE UP TO DATE
            checkPtRecord.push(newChkPt);                                           // NB: DO THIS AT UNSTAKE & CLAIM FN'S AS WELL TO ENSURE CHECK POINTS ARE UP TO DATE
            
            // set params for new interval
            uint noIntervals = (block.timestamp - intervalStart) / rewardInterval;  // no of intervals since last interval
            intervalStart += noIntervals * rewardInterval;                          // works even if done a few hours/days after last interval
            intervalStake = _LPamount;                                              // reset interval stake add this user's stake
        }

        totalStaked += _LPamount;

        // USER STATE UPDATE
        UsrChkPt[] memory userRecord = stateOfUsers[msg.sender].userRecord;
        uint idx = checkPtRecord.length > 0 ? checkPtRecord.length - 1 : 0;         // index of current main check point
        uint usrIdx = userRecord.length > 0 ? userRecord.length - 1 : 0;            // index of last item in user check point
        uint userStake = userRecord[usrIdx].totUsrStake;                            // get latest user stake total

        UsrChkPt memory usrChkPt = UsrChkPt(idx, userStake + _LPamount);
        stateOfUsers[msg.sender].userRecord.push(usrChkPt);
    }

    // OPTIONAL? user claim (only rewards) -> @ least internal either way

    // user unstake (withdraw & claim)

    // NO stETB WILL BE ISSUED, SO NO NEED: take care of the cases for user transfers
}