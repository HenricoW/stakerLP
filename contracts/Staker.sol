// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/*  
 * The Staker contract controls the emission of ETB tokens as staking reward. 
 * Method:
 * A user's rewards are only sent when a user claims/unstakes.
 * To keep rewards proportional and maintain the emission rate, we keep track of 
 * the total stake and the time that this amount changes. Upon unstaking,
 * the user's total/partial stake is calculated and sent along with the 
 * proportioned reward.
 */
contract Staker is Ownable {
    uint public eraDuration;
    uint public startTime;          // when 1st stake is made
    uint public endTime;            // will be calculated
    uint public releaseAmount;
    IERC20 public LPtoken;
    IERC20 public RewToken;

    enum EmissionStates { NOT_STARTED, INITIALIZED, ERA_ACTIVE, ERA_ENDED }
    EmissionStates public emissionStatus = EmissionStates.NOT_STARTED;

    uint public rewardInterval = 24 hours; // reward calculations will not be per block but per interval
    uint public intervalReward;

    // STAKING STATE:
    uint public totalStaked;        // latest total staked in contract
    uint public tokensClaimed;      // total number of reward tokens claimed since staking genisis
    uint public intervalStart;      // start time of current interval
    
    struct CheckPoint {
        uint blocktime;             // block time at START of new reward interval
        uint totalStaked;           // cumulative stake as at this reward interval
        uint intervalsToNext;       // number of intervals to the next check point: in case of long periods of inactivity
    }
    CheckPoint[] public checkPtRecord; // keeps track of evolution of checkpoints, one per reward interval

    // USER STATE: keep track of each user's stake amount change, with block time
    struct UsrChkPt {
        uint mainChkPtIndex;        // index of main CheckPoint[] array where change happened
        uint totUsrStake;           // cumulative user stake as at this check point
    }
    struct UserState { 
        UsrChkPt[] userRecord;      // track record of all stake changes (stake & unstake)
        uint usrIdxOfLastClaim;    // index of user UsrChkPt[] array where latest reward was calculated: prevents iterating from start every time
        uint latestRemainingReward; // remainder of accumulated reward left if last claim was partial claim: prevents iterating from start every time
    }
    mapping( address => UserState ) public stateOfUsers; // -> use this mapping to iterate over [checkPtRecord] to calc stake reward (and optionally update latest total stake reward)

    // EVENTS:
    event EmissionStarted(uint indexed startTime, uint endTime, uint releaseAmount);
    event EmissionEnded(uint indexed startTime, uint endTime, uint tokensClaimed);

    // MODIFIERS:
    bool private entered = false;
    modifier noReentry() {
        require(entered == false, "No Reentry");
        entered = true;
        _;
        entered = false;
    }

    // -----------------------------
    //      MAIN CONTRACT BODY:
    // -----------------------------
    /**
     * @notice Configures the staking (LP) & reward tokens
     */
    constructor (address _LPtoken, address _RewToken) {
        LPtoken = IERC20(_LPtoken);
        RewToken = IERC20(_RewToken);
    }

    /**
     * @notice Create a new Emission Era - only owner
     * @param _durationInDays Specify number of days over which [_releaseAmount] should be released
     * @param rewardInterval_hours Set to 0 to have default of 24 hrs
     */
    function createEra(uint _durationInDays, uint _releaseAmount, uint rewardInterval_hours) external onlyOwner() {
        require(emissionStatus == EmissionStates.NOT_STARTED || emissionStatus == EmissionStates.ERA_ENDED, "Staker#createEra: Emission Era currently in progress");
        require(_durationInDays > 1, "Staker#createEra: Reward duration must be greater than 1 day");
        if(rewardInterval_hours > 24) {
            revert("Staker#createEra: Reward interval must be <= 1 day");
        } else if(rewardInterval_hours > 0 && 24 % rewardInterval_hours != 0) {
            revert("Staker#createEra: Reward interval must wholly divide into 24");     // NB: One of: 1, 2, 3, 4, 8, 12, 24
        } else if(rewardInterval_hours != 0) {
            rewardInterval = rewardInterval_hours * 1 hours;                            // if rewardInterval_hours = 0, then it remains on the default value of 24 hrs
        }

        // FOR TESTING
        rewardInterval /= 10;

        eraDuration = _durationInDays *  1 days;
        releaseAmount = _releaseAmount;
        uint noOfIntervals = eraDuration / rewardInterval;
        intervalReward = releaseAmount / noOfIntervals;

        emissionStatus = EmissionStates.INITIALIZED;

        require(RewToken.transferFrom(msg.sender, address(this), _releaseAmount));
    }

    /**
     * @notice Stake (deposit) ETB LP tokens
     * @param amountLP The amount of LP tokens (not ETB tokens) to stake
     */
    function stake(uint amountLP) external {
        require(emissionStatus == EmissionStates.ERA_ACTIVE || emissionStatus == EmissionStates.INITIALIZED, "Staker#stake: Wrong Emission Era");

        if(block.timestamp >= endTime && emissionStatus == EmissionStates.ERA_ACTIVE) {
            _updateIntervals();                                                         // make sure last main chk point status is captured
            emissionStatus = EmissionStates.ERA_ENDED;
            emit EmissionEnded(startTime, endTime, tokensClaimed);
            return;
        }

        // 1st staker starts the emission process (prevents [reward / 0] later in logic)
        if(emissionStatus == EmissionStates.INITIALIZED) {
            emissionStatus = EmissionStates.ERA_ACTIVE;
            startTime = block.timestamp;
            endTime = startTime + eraDuration;
            intervalStart = block.timestamp;

            emit EmissionStarted(startTime, endTime, releaseAmount);
        }
        
        // make sure intervals are up to date
        _updateIntervals();

        // UPDATE MAIN CHECK POINT STATE
        totalStaked += amountLP;

        // USER STATE UPDATE
        uint currentMainIdx = checkPtRecord.length;                 // index of current (incomplete) main check point. If completed chkPts = [0, 1] then current chkpt currentMainIdx is 2
        
        UsrChkPt[] memory userRecord = stateOfUsers[msg.sender].userRecord;
        uint userStake = userRecord.length == 0 ? 0 : userRecord[userRecord.length - 1].totUsrStake; // get latest user stake total

        UsrChkPt memory usrChkPt = UsrChkPt(currentMainIdx, userStake + amountLP);
        stateOfUsers[msg.sender].userRecord.push(usrChkPt);
        
        require(LPtoken.transferFrom(msg.sender, address(this), amountLP));
    }

    function _updateIntervals() internal {
        if(block.timestamp > (intervalStart + rewardInterval)) {
            // add the latest state of the last interval as a check point
            uint noOfIntervals = (block.timestamp - intervalStart) / rewardInterval;    // no of intervals since last check point
            CheckPoint memory newChkPt = CheckPoint(intervalStart, totalStaked, noOfIntervals);
            checkPtRecord.push(newChkPt);
            // set params for new interval
            intervalStart += noOfIntervals * rewardInterval;                            // works even if done a few hours/days after last interval
        }
    }

    /**
     * @notice Unstake (withdraw & claim) tokens. Allows partial unstake.
     * @param amountLP The amount of LP tokens (not ETB tokens) to unstake
     */
    function unStake(uint amountLP) external noReentry() {                              // add reentrancy guard
        require(emissionStatus == EmissionStates.ERA_ACTIVE || emissionStatus == EmissionStates.ERA_ENDED, "Staker#unstake: Emission Era not active"); // check emission status
        
        UserState memory usrState = stateOfUsers[msg.sender];
        UsrChkPt[] memory userRecord = usrState.userRecord;
        require(userRecord.length > 0, "Staker#unstake: Invalid claim. No stake record"); // check if staker
        uint userStake = userRecord[userRecord.length - 1].totUsrStake;
        require(userStake >= amountLP, "Staker#unstake: Request amount > balance");      // check if amount < staked amount

        // Below is redundant, caught by [userStake > amountLP] check. If user has stake left, there will be reward left
        // require(tokensClaimed <= releaseAmount, "Staker#unstake: All reward tokens have been claimed");

        // make sure intervals are up to date
        _updateIntervals();

        // set emission status to ENDED if we've past the reward period
        if(emissionStatus == EmissionStates.ERA_ACTIVE && block.timestamp >= endTime) emissionStatus == EmissionStates.ERA_ENDED;

        // UPDATE MAIN CHECK POINT STATE
        totalStaked -= amountLP;

        CheckPoint[] memory mainRecord = checkPtRecord;
        uint endIdx = mainRecord.length;                                                // index of current (incomplete) interval
        uint accReward = usrState.latestRemainingReward;                                // could be > 0 if stake & unstake both in 1st interval

        // loop variables
        uint mainStart; uint mainEnd; uint usrStake; 

        // reward loop: loop over user checkpoints, use params for inner loop over main checkpoints
        for(uint i = usrState.usrIdxOfLastClaim; i < userRecord.length - 1; i++) {
            mainStart = userRecord[i].mainChkPtIndex;                                   // eg.: userRec[6] -> chkPtRec[45]
            mainEnd = userRecord.length > 1 ? userRecord[i + 1].mainChkPtIndex : endIdx; // eg.: userRec[7] -> chkPtRec[83]
            usrStake = userRecord[i].totUsrStake;

            for(uint j = mainStart; j < mainEnd; j++) {
                accReward += intervalReward * (usrStake / mainRecord[j].totalStaked) * mainRecord[j].intervalsToNext;
            }
        }

        // USER STATE UPDATE
        uint rewardAmount = accReward * amountLP / userStake;
        stateOfUsers[msg.sender].latestRemainingReward = accReward - rewardAmount;
        // push new user check point
        stateOfUsers[msg.sender].userRecord.push(UsrChkPt(endIdx, userStake - amountLP));
        stateOfUsers[msg.sender].usrIdxOfLastClaim = stateOfUsers[msg.sender].userRecord.length - 1;

        tokensClaimed += rewardAmount;

        // transfer reward
        require(RewToken.transfer(msg.sender, rewardAmount), "Staker#unstake: ETB reward transfer failed");
        // transfer stake LP tokens
        require(LPtoken.transfer(msg.sender, amountLP), "Staker#unstake: LP token transfer failed");
    }

    /**
     * @notice Get a user's record array
     * @param user The user who's record is to be fetched. Returns [] if user not found
     */
    function getUserRecord(address user) external view returns(UsrChkPt[] memory) {
        return (stateOfUsers[user].userRecord);
    }

    /**
     * @notice Gets the latest array of committed main check points
     */
    function getChkPtRecord() external view returns(CheckPoint[] memory) {
        return (checkPtRecord);
    }

}