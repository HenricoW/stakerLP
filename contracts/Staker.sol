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
    uint public eraDuration;
    uint public startTime;          // when 1st stake is made
    uint public endTime;            // will be calculated
    uint public releaseAmount;
    IERC20 public LPtoken;
    IERC20 public ETBtoken;

    enum EmissionStates { NOT_STARTED, INITIALIZED, ERA_ACTIVE, ERA_ENDED }
    EmissionStates emissionStatus = EmissionStates.NOT_STARTED;

    uint public rewardInterval = 24 hours; // reward calculations will not be per block but per block interval
    uint public intervalReward;

    // STAKING STATE:
    uint public lastCheckPt;        // the last time staked amount changed
    uint public totalStaked;        // latest total staked in contract
    uint public tokensClaimed;      // total number of reward tokens claimed since staking genisis
    uint public intervalStart;      // start time of current interval
    
    struct CheckPoint {
        uint blocktime;             // block time at START of new reward interval
        uint totalStaked;           // cumulative stake as at this reward interval
        uint intervalsToNext;       // number of intervals to the next check point: for long periods of inactivity
    }
    CheckPoint[] public checkPtRecord; // keeps track of evolution of checkpoints, one per reward interval

    // USER STATE: keep track of each user's stake amount change, with block time
    struct UsrChkPt {
        uint mainChkPtIndex;        // index of main CheckPoint[] array where change happened
        uint totUsrStake;           // cumulative user stake as at this check point
    }
    struct UserState { 
        UsrChkPt[] userRecord;      // track record of all stake changes (stake & unstake)
        uint idxOfLastClaim_ChkPt;  // index of main CheckPoint[] array where latest reward was calculated: prevents iterating from start every time
        uint idxOfLastClaim_Usr;    // index of user UsrChkPt[] array where latest reward was calculated: prevents iterating from start every time
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
     */
    constructor (address _lpTokenETB, address _ETBtoken) {
        LPtoken = IERC20(_lpTokenETB);
        ETBtoken = IERC20(_ETBtoken);
    }

    /**
     * @notice Create a new Emission Era - only owner
     * @param _durationInDays Specify number of days over which [_releaseAmount] should be released
     * @param rewardInterval_hours Set to 0 to have default of 24 hrs
     */
    function createEra(uint _durationInDays, uint _releaseAmount, uint rewardInterval_hours) external onlyOwner {
        require(emissionStatus == EmissionStates.NOT_STARTED || emissionStatus == EmissionStates.ERA_ENDED, "Staker#createEra: Emission Era currently in progress");
        require(_durationInDays > 1, "Staker#createEra: Block duration must be greater than 1 day");
        if(rewardInterval_hours > 24) {
            revert("Staker#createEra: Reward interval must be < 1 day");
        } else if(rewardInterval_hours > 0 && 24 % rewardInterval_hours != 0) {
            revert("Staker#createEra: Reward interval must wholly divide into 24"); // NB: One of: 1, 2, 3, 4, 8, 12
        } else if(rewardInterval_hours != 0) {
            rewardInterval = rewardInterval_hours * 1 hours;                        // if rewardInterval_hours = 0, then it remains on the default value
        }

        bool txSuccess = ETBtoken.transferFrom(msg.sender, address(this), _releaseAmount);
        require(txSuccess, "Staker#createEra: ETB token transfer failed");

        eraDuration = _durationInDays *  1 days;
        releaseAmount = _releaseAmount;
        uint noOfIntervals = eraDuration / rewardInterval;
        intervalReward = releaseAmount / noOfIntervals;

        emissionStatus = EmissionStates.INITIALIZED;
    }

    /**
     * @notice Stake (deposit) ETB LP tokens
     * @param _LPamount The amount of LP tokens (not ETB tokens) to stake
     */
    function stake(uint _LPamount) external {
        require(emissionStatus == EmissionStates.INITIALIZED || emissionStatus == EmissionStates.ERA_ACTIVE, "Staker#stake: Emission Era has not started");
        bool txSuccess = LPtoken.transferFrom(msg.sender, address(this), _LPamount);
        require(txSuccess, "Staker#stake: ETB token transfer failed");

        // 1st staker starts the emission process (prevents [reward / 0] later in logic)
        if(emissionStatus == EmissionStates.INITIALIZED) {
            emissionStatus == EmissionStates.ERA_ACTIVE;
            startTime = block.timestamp;
            endTime = startTime + eraDuration;
            intervalStart = block.timestamp;

            emit EmissionStarted(startTime, endTime, releaseAmount);
        }
        
        // make sure intervals are up to date
        if(block.timestamp > (intervalStart + rewardInterval)) {
            // add the latest state of the last interval as a check point
            uint noOfIntervals = (block.timestamp - intervalStart) / rewardInterval;    // no of intervals since last check point
            CheckPoint memory newChkPt = CheckPoint(intervalStart, totalStaked, noOfIntervals);
            checkPtRecord.push(newChkPt);

            // set params for new interval
            intervalStart += noOfIntervals * rewardInterval;                            // works even if done a few hours/days after last interval
        }

        totalStaked += _LPamount;

        // USER STATE UPDATE
        uint idx = checkPtRecord.length > 0 ? checkPtRecord.length : 0;                 // index of current (incomplete) main check point. If completed chkPts = [0, 1] then current chkpt idx is 2
        
        UsrChkPt[] memory userRecord = stateOfUsers[msg.sender].userRecord;
        uint userStake = userRecord.length == 0 ? 0 : userRecord[userRecord.length - 1].totUsrStake; // get latest user stake total

        UsrChkPt memory usrChkPt = UsrChkPt(idx, userStake + _LPamount);
        stateOfUsers[msg.sender].userRecord.push(usrChkPt);
    }

    // user unstake (withdraw & claim)
    /**
     * @notice Unstake (withdraw & claim) tokens. Allows partial unstake.
     * @param amountLP The amount of LP tokens (not ETB tokens) to unstake
     */
    function unStake(uint amountLP) external {              // add reentrancy guard
        // check emission status
        require(emissionStatus == EmissionStates.ERA_ACTIVE, "Staker#unstake: Emission Era not active");
        // check if staker
        UserState memory usrState = stateOfUsers[msg.sender];
        UsrChkPt[] memory userRecord = usrState.userRecord;
        require(userRecord.length > 0, "Staker#unstake: Invalid claim. No stake record");
        // check if amount < staked amount
        UsrChkPt memory usrChkPtLatest = userRecord[userRecord.length - 1];
        uint stakeAmount = usrChkPtLatest.totUsrStake;
        require(stakeAmount > amountLP, "Staker#unstake: Request amount > balance");

        // make sure intervals are up to date
        if(block.timestamp > (intervalStart + rewardInterval)) {
            // add the latest state of the last interval as a check point
            uint noOfIntervals = (block.timestamp - intervalStart) / rewardInterval;    // no of intervals since last check point
            CheckPoint memory newChkPt = CheckPoint(intervalStart, totalStaked, noOfIntervals);
            checkPtRecord.push(newChkPt);

            // set params for new interval
            intervalStart += noOfIntervals * rewardInterval;                            // works even if done a few hours/days after last interval
        }

        uint endIdx = checkPtRecord.length - 1;                                        // index of latest completed interval

        // user's latest claim index
        uint startIdxUsr = usrState.idxOfLastClaim_Usr;
        uint accReward = usrState.latestRemainingReward;                // could be > 0 if stake & unstake both in 1st interval

        // reward loop: loop over user checkpoints, use params for inner loop over main checkpoints
        for(uint i = startIdxUsr + 1; i < userRecord.length; i++) {
            uint mainStart = userRecord[i - 1].mainChkPtIndex;                         // eg.: userRec[6] -> chkPtRec[45]
            uint mainEnd = userRecord.length > 1 ? userRecord[i].mainChkPtIndex : endIdx; // eg.: userRec[7] -> chkPtRec[83]

            uint usrStake = userRecord[i - 1].totUsrStake;

            for(uint j = mainStart; j < mainEnd; j++) {
                uint totStaked = checkPtRecord[j].totalStaked;
                uint noIntervals = checkPtRecord[j].intervalsToNext;

                accReward += intervalReward * (usrStake / totStaked) * noIntervals;
            }
        }

        // USER STATE UPDATE
        // push new user check point
        stateOfUsers[msg.sender].idxOfLastClaim_Usr = userRecord.length - 1;
        uint rewardAmount = accReward * amountLP / usrChkPtLatest.totUsrStake;
        stateOfUsers[msg.sender].latestRemainingReward = accReward - rewardAmount;

        // transfer reward
        bool result = ETBtoken.transfer(msg.sender, rewardAmount);
        require(result, "Staker#unstake: ETB reward transfer failed");
        // transfer stake LP tokens
        bool txResult = LPtoken.transfer(msg.sender, amountLP);
        require(txResult, "Staker#unstake: LP token transfer failed");
     }

}