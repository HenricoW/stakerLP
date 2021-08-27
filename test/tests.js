const { expectRevert, time } = require("@openzeppelin/test-helpers");

const Staker = artifacts.require("Staker");
const MockETB = artifacts.require("MockETB");
const LPetb = artifacts.require("LPetb");

const toWei = (val) => web3.utils.toWei(val);
const fromWei = (val) => web3.utils.fromWei(val);

const advBlockByTime = (seconds) => {
    return new Promise((res, rej) => {
        web3.currentProvider.send(
            {
                method: "evm_increaseTime",
                params: [seconds],
                jsonrpc: "2.0",
                id: new Date().getTime(),
            },
            (err, _) => {
                if (err) {
                    return rej(err);
                }
                const newBlockHash = web3.eth.getBlock("latest").hash;

                return res(newBlockHash);
            }
        );
    });
};

const getBlockTime = async () => {
    const blocktime = +(await time.latest()).toString();
    return new Date(blocktime * 1000).toISOString();
};

const emissionStatus = ["NOT_STARTED", "INITIALIZED", "ERA_ACTIVE", "ERA_ENDED"];

contract("Staker#createEra", (account, network) => {
    const [admin, user1, user2, _] = account;
    let staker, mEtb, LpEtb;

    beforeEach(async () => {
        mEtb = await MockETB.new();
        LpEtb = await LPetb.new();
        staker = await Staker.new(LpEtb.address, mEtb.address);

        const mintAmount = toWei("1000");
        await LpEtb.faucet(mintAmount, { from: user1 });
        await LpEtb.faucet(mintAmount, { from: user2 });
    });

    // it("should have the correct initialization parameters", async () => {
    //     const balAdmin_etb = await mEtb.balanceOf(admin);
    //     const balu1_etb = await LpEtb.balanceOf(user1);
    //     const balu2_etb = await LpEtb.balanceOf(user2);

    //     // const lpStakerAddr = await staker.LPtoken;
    //     // console.log("staker's LP token addr: ", lpStakerAddr);

    //     console.log("admin balance ETB: ", fromWei(balAdmin_etb));
    //     console.log("user1 balance ELP: ", fromWei(balu1_etb));
    //     console.log("user2 balance ELP: ", fromWei(balu2_etb));

    //     const owner = await staker.owner();
    //     assert(owner === admin);
    // });

    // --------------------
    // CREATE_ERA FUNCTION
    // --------------------
    // it("should create a new staking era", async () => {
    //     const durationInDays = 2;
    //     const releaseAmount = toWei("240");
    //     const rewIntervalHrs = 1;

    //     await mEtb.approve(staker.address, releaseAmount, { from: admin });
    //     await staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin });

    //     const emitStat = await staker.emissionStatus();
    //     eraDur = await staker.eraDuration();
    //     relAmt = await staker.releaseAmount();
    //     intRew = await staker.intervalReward();
    //     adminBal = await mEtb.balanceOf(admin);

    //     assert(emissionStatus[+emitStat.toString()] === "INITIALIZED");
    //     assert(eraDur.toString() === (2 * 24 * 3600).toString());
    //     assert(fromWei(relAmt) === "240");
    //     assert(fromWei(intRew) === (240 / (durationInDays * (24 / rewIntervalHrs))).toString());
    //     assert(fromWei(adminBal) === (10000 - 240).toString());
    // });

    // it("should NOT create a new staking era: duration", async () => {
    //     const durationInDays = 1;
    //     const releaseAmount = toWei("240");
    //     const rewIntervalHrs = 1;

    //     await mEtb.approve(staker.address, releaseAmount, { from: admin });
    //     await expectRevert(
    //         staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin }),
    //         "Staker#createEra: Block duration must be greater than 1 day"
    //     );
    // });

    // it("should NOT create a new staking era: intervalHrs > 24", async () => {
    //     const durationInDays = 2;
    //     const releaseAmount = toWei("240");
    //     const rewIntervalHrs = 36;

    //     await mEtb.approve(staker.address, releaseAmount, { from: admin });
    //     await expectRevert(
    //         staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin }),
    //         "Staker#createEra: Reward interval must be < 1 day"
    //     );
    // });

    // it("should NOT create a new staking era: intervalHrs !factor of 24", async () => {
    //     const durationInDays = 2;
    //     const releaseAmount = toWei("240");
    //     const rewIntervalHrs = 5;

    //     await mEtb.approve(staker.address, releaseAmount, { from: admin });
    //     await expectRevert(
    //         staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin }),
    //         "Staker#createEra: Reward interval must wholly divide into 24"
    //     );
    // });

    // should NOT create a new staking era: wrong Emission Status -> can do after init stake

    // --------------------
    // STAKE FUNCTION
    // --------------------
    // it("should allow user to stake", async () => {
    //     const durationInDays = 2;
    //     const releaseAmount = toWei("240");
    //     const rewIntervalHrs = 1;

    //     await mEtb.approve(staker.address, releaseAmount, { from: admin });
    //     await staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin });
    //     let emitStat1 = await staker.emissionStatus();

    //     const amountLP = "200";
    //     // allow stake when INITIALIZED
    //     await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
    //     await staker.stake(toWei(amountLP), { from: user1 });
    //     let emitStat2 = await staker.emissionStatus();

    //     // allow stake when ERA_ACTIVE
    //     await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
    //     await staker.stake(toWei(amountLP), { from: user1 });

    //     let balU1_LP = await LpEtb.balanceOf(user1);

    //     let userRec = await staker.getUserRecord(user1);

    //     // console.log(emitStat1.toString());
    //     // console.log(balU1_LP.toString());

    //     assert(emissionStatus[+emitStat1.toString()] === "INITIALIZED");
    //     assert(emissionStatus[+emitStat2.toString()] === "ERA_ACTIVE");
    //     assert(fromWei(balU1_LP) === "600");
    //     assert(userRec.length === 2);
    // });

    // it("should NOT allow user to stake: emission not started", async () => {
    //     const amountLP = "200";
    //     await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
    //     await expectRevert(
    //         staker.stake(toWei(amountLP), { from: user1 }),
    //         "Staker#stake: Emission Era has not started"
    //     );
    // });

    // it("should NOT allow user to stake: emission ended", async () => {
    //     const durationInDays = 2;
    //     const releaseAmount = toWei("240");
    //     const rewIntervalHrs = 1;

    //     await mEtb.approve(staker.address, releaseAmount, { from: admin });
    //     await staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin });

    //     const amountLP = "100";
    //     // do 1st stake to start emission era
    //     console.log(await getBlockTime());
    //     await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
    //     await staker.stake(toWei(amountLP), { from: user1 });

    //     // do 2nd stake in 2nd interval
    //     await time.increase(3610);
    //     console.log(await getBlockTime());
    //     await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
    //     await staker.stake(toWei(amountLP), { from: user1 });

    //     // progress to time beyond era end
    //     await time.increase(time.duration.days(2));

    //     // next stake (or unstake) will trigger change in emission status, w/o changing other state
    //     console.log(await getBlockTime());
    //     await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
    //     await staker.stake(toWei(amountLP), { from: user1 });

    //     let startTime = await staker.startTime();
    //     let endTime = await staker.endTime();
    //     console.log();
    //     console.log("Start time: ", startTime.toString());
    //     console.log("End time: ", endTime.toString());
    //     console.log();

    //     // view the user record
    //     userRec = await staker.getUserRecord(user1);
    //     console.log("user record: ", userRec);
    //     console.log();

    //     // view the check point record
    //     let chkPts = await staker.getChkPtRecord();
    //     console.log("chkPt record: ", chkPts);

    //     // the next stake will revert as emission state is now set to ERA_ENDED
    //     await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
    //     await expectRevert(
    //         staker.stake(toWei(amountLP), { from: user1 }),
    //         "Staker#stake: Emission Era has ended. Please unstake & claim"
    //     );
    // });

    // --------------------
    // UNSTAKE FUNCTION
    // --------------------
    // it("should allow user to unstake", async () => {
    //     const durationInDays = 2;
    //     const releaseAmount = toWei("240");
    //     const rewIntervalHrs = 1;

    //     // get balances
    //     let balU1_LP = await LpEtb.balanceOf(user1);
    //     let balU1_ET = await mEtb.balanceOf(user1);
    //     console.log("User LP balance: ", fromWei(balU1_LP));
    //     console.log("User ETB balance: ", fromWei(balU1_ET));
    //     console.log();

    //     // start the era
    //     await mEtb.approve(staker.address, releaseAmount, { from: admin });
    //     await staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin });

    //     const amountLP = "100";
    //     // do 1st stake to start emission era
    //     console.log(await getBlockTime());
    //     await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
    //     await staker.stake(toWei(amountLP), { from: user1 });

    //     // do 2nd stake in 2nd interval
    //     await time.increase(3610);
    //     console.log(await getBlockTime());
    //     await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
    //     await staker.stake(toWei(amountLP), { from: user1 });

    //     // unstake
    //     console.log(await getBlockTime());
    //     await staker.unStake(toWei(amountLP), { from: user1 });

    //     // get balances
    //     balU1_LP = await LpEtb.balanceOf(user1);
    //     balU1_ET = await mEtb.balanceOf(user1);
    //     console.log("User LP balance: ", fromWei(balU1_LP));
    //     console.log("User ETB balance: ", fromWei(balU1_ET));

    //     // // view the user record
    //     // userState = await staker.stateOfUsers(user1);
    //     // console.log("user state: ", JSON.stringify(userState));

    //     // userRec = await staker.getUserRecord(user1);
    //     // console.log("user record: ", userRec);
    //     // console.log();

    //     // view the check point record
    //     let chkPts = await staker.getChkPtRecord();
    //     console.log("chkPt record: ", chkPts);
    //     console.log("-------------------------");
    // });

    it("should NOT allow user to unstake: never staked", async () => {
        const durationInDays = 2;
        const releaseAmount = toWei("240");
        const rewIntervalHrs = 1;

        // get balances
        let balU1_LP = await LpEtb.balanceOf(user1);
        let balU1_ET = await mEtb.balanceOf(user1);
        console.log("User LP balance: ", fromWei(balU1_LP));
        console.log("User ETB balance: ", fromWei(balU1_ET));
        console.log();

        // initialize the era
        await mEtb.approve(staker.address, releaseAmount, { from: admin });
        await staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin });

        const amountLP = "100";
        // do 1st stake to start emission era: from User #1
        console.log(await getBlockTime());
        await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
        await staker.stake(toWei(amountLP), { from: user1 });
        await time.increase(3610);

        console.log(await getBlockTime());
        console.log("-------------------------");

        // unstake: from User #2
        await expectRevert(
            staker.unStake(toWei(amountLP), { from: user2 }),
            "Staker#unstake: Invalid claim. No stake record"
        );
    });

    it("should NOT allow user to unstake: unstake request > staked", async () => {
        const durationInDays = 2;
        const releaseAmount = toWei("240");
        const rewIntervalHrs = 1;

        // get balances
        let balU1_LP = await LpEtb.balanceOf(user1);
        let balU1_ET = await mEtb.balanceOf(user1);
        console.log("User LP balance: ", fromWei(balU1_LP));
        console.log("User ETB balance: ", fromWei(balU1_ET));
        console.log();

        // initialize the era
        await mEtb.approve(staker.address, releaseAmount, { from: admin });
        await staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin });

        const amountLP = "100";
        const amountWithdraw = "200";
        // do 1st stake to start emission era
        console.log(await getBlockTime());
        await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
        await staker.stake(toWei(amountLP), { from: user1 });
        await time.increase(3610);

        console.log(await getBlockTime());
        console.log("-------------------------");
        await expectRevert(
            staker.unStake(toWei(amountWithdraw), { from: user1 }),
            "Staker#unstake: Request amount > balance"
        );
    });

    it("should NOT allow user to unstake: wrong era - NotStarted", async () => {
        const durationInDays = 2;
        const releaseAmount = toWei("240");
        const rewIntervalHrs = 1;

        // get balances
        let balU1_LP = await LpEtb.balanceOf(user1);
        let balU1_ET = await mEtb.balanceOf(user1);
        console.log("User LP balance: ", fromWei(balU1_LP));
        console.log("User ETB balance: ", fromWei(balU1_ET));
        console.log();

        // initialize the era
        await mEtb.approve(staker.address, releaseAmount, { from: admin });
        await staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin });

        const amountLP = "100";
        console.log(await getBlockTime());
        console.log("-------------------------");
        await expectRevert(staker.unStake(toWei(amountLP), { from: user1 }), "Staker#unstake: Emission Era not active");
    });

    it("should NOT allow user to unstake: all rewards claimed", async () => {
        const durationInDays = 2;
        const releaseAmount = toWei("240");
        const rewIntervalHrs = 1;

        // get balances
        let balU1_LP = await LpEtb.balanceOf(user1);
        let balU1_ET = await mEtb.balanceOf(user1);
        console.log("User LP balance: ", fromWei(balU1_LP));
        console.log("User ETB balance: ", fromWei(balU1_ET));
        console.log();

        // initialize the era
        await mEtb.approve(staker.address, releaseAmount, { from: admin });
        await staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin });

        const amountLP = "100";
        // do 1st stake to start emission era
        console.log(await getBlockTime());
        await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
        await staker.stake(toWei(amountLP), { from: user1 });
        await time.increase(time.duration.days(2));

        console.log(await getBlockTime());
        await staker.unStake(toWei(amountLP), { from: user1 });

        // get balances
        balU1_LP = await LpEtb.balanceOf(user1);
        balU1_ET = await mEtb.balanceOf(user1);
        console.log("User LP balance: ", fromWei(balU1_LP));
        console.log("User ETB balance: ", fromWei(balU1_ET));
        console.log();

        // attempt to withdraw again
        console.log("-------------------------");
        await expectRevert(
            staker.unStake(toWei(amountLP), { from: user1 }),
            "Staker#unstake: Request amount > balance"
        );
    });
});
