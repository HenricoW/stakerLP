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
    IERC20 public ETBtoken;

    enum EmissionStates { NOT_STARTED, INITIALIZED, ERA_ACTIVE, ERA_ENDED }
    EmissionStates emissionStatus = EmissionStates.ERA_ENDED;

    // STAKING STATUS:
    uint public lastCheckPt; // latest block where staked amount changed
    uint public totalStaked; // current total staked amount
    struct CheckPoint {
        uint blocknumber;
        uint totalStaked;
    }
    CheckPoint[] public checkPtRecord; // keeps track of evolution of checkpoint details
    uint public tokensClaimed; // total number of reward tokens claimed since staking genisis

    // USER STATUS: keep track of each user's stake amount change, with block number
    struct UsrChkPt { uint mainChkPtIndex; uint stakeAmt; } // user stake amount track record [mainChkPtIndex] -> array index of (staking status) CheckPoint[]
    struct UserState { 
        UsrChkPt[] userRecord;      // track record of all stake changes (stake & unstake)
        uint idxOfLastClaim;        // main CheckPoint[] array index where latest total reward was calculated
        uint latestTotalReward;     // total reward calculated at full or partial unstake (use fraction of this for partial unstake)
        uint latestRemainingReward; // remainder of reward left if last claim was partial claim
    }
    mapping( address => UserState ) public stateOfUsers; // -> use this mapping to iterate over [checkPtRecord] to calc stake reward (and optionally update latest total stake reward)

    // EVENTS:
    event EmissionStarted(uint indexed startBlock, uint endBlock, uint releaseAmount);

    // -----------------------------
    //      MAIN CONTRACT BODY:
    // -----------------------------
    constructor (address _lpTokenETB, address _ETBtoken) {
        LPtoken = IERC20(_lpTokenETB);
        ETBtoken = IERC20(_ETBtoken);
    }

    // create a new Emission Era - only owner
    // owner must have enough tokens to fund _releaseAmount
    function createEra(uint _durationInBlocks, uint _releaseAmount) external onlyOwner {
        require(emissionStatus == EmissionStates.ERA_ENDED, "Staker#createEra: Emission Era currently in progress");
        require(_releaseAmount > 0, "Staker#createEra: Release amount cannot be zero");
        require(_durationInBlocks > 0, "Staker#createEra: Block duration cannot be zero");
        bool txSuccess = ETBtoken.transferFrom(msg.sender, address(this), _releaseAmount);
        require(txSuccess, "Staker#createEra: ETB token transfer failed");

        durationInBlocks = _durationInBlocks;
        releaseAmount = _releaseAmount;
        emissionStatus = EmissionStates.INITIALIZED;
    }

    // Users stake (deposit) ETB LP tokens
    function stake(uint _LPamount) external {
        require(emissionStatus == EmissionStates.INITIALIZED || emissionStatus == EmissionStates.ERA_ACTIVE, "Staker#stake: Emission Era has not started");
        require(_LPamount > 0, "Staker#stake: LP amount cannot be zero");
        bool txSuccess = LPtoken.transferFrom(msg.sender, address(this), _LPamount);
        require(txSuccess, "Staker#stake: ETB token transfer failed");

        // 1st staker starts the emitting process (prevents [reward / 0] later in logic)
        if(emissionStatus == EmissionStates.INITIALIZED) {
            emissionStatus == EmissionStates.ERA_ACTIVE;
            startBlock = block.number;
            endBlock = startBlock + durationInBlocks;

            emit EmissionStarted(startBlock, endBlock, releaseAmount);
        }
        
        // staking state update
        totalStaked += _LPamount;
        CheckPoint memory chkPt = CheckPoint(block.number, totalStaked);
        checkPtRecord.push(chkPt);

        // user state update
        UsrChkPt memory usrChkPt = UsrChkPt((checkPtRecord.length - 1), _LPamount);
        stateOfUsers[msg.sender].userRecord.push(usrChkPt);
    }

    // OPTIONAL? user claim (only rewards) -> @ least internal either way

    // user unstake (withdraw & claim)

    // NO stETB WILL BE ISSUED, SO NO NEED: take care of the cases for user transfers
}