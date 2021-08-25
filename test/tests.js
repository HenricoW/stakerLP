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

    //     const amountLP = "200";
    //     await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
    //     await staker.stake(toWei(amountLP), { from: user1 });

    //     let emitStat = await staker.emissionStatus();
    //     let balU1_LP = await LpEtb.balanceOf(user1);

    //     // let userState = await staker.stateOfUsers(user1);
    //     // console.log(JSON.stringify(userState));

    //     let userRec = await staker.getUserRecord(user1);

    //     assert(emissionStatus[+emitStat.toString()] === "ERA_ACTIVE");
    //     assert(fromWei(balU1_LP) === "800");
    //     assert(userRec.length === 1);
    // });

    // it("should NOT allow user to stake: emission status", async () => {
    //     const amountLP = "200";
    //     await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
    //     await expectRevert(
    //         staker.stake(toWei(amountLP), { from: user1 }),
    //         "Staker#stake: Emission Era has not started"
    //     );
    // });

    it("should NOT allow user to stake: emission status ended", async () => {
        const durationInDays = 2;
        const releaseAmount = toWei("240");
        const rewIntervalHrs = 1;

        await mEtb.approve(staker.address, releaseAmount, { from: admin });
        await staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin });

        const amountLP = "100";
        await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
        await staker.stake(toWei(amountLP), { from: user1 });

        console.log(await getBlockTime());
        await time.increase(3590);
        console.log(await getBlockTime());
        await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
        await staker.stake(toWei(amountLP), { from: user1 });

        await time.increase(3660);
        console.log(await getBlockTime());
        await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
        await staker.stake(toWei(amountLP), { from: user1 });

        await time.increase(3660);
        console.log(await getBlockTime());
        await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
        await staker.stake(toWei(amountLP), { from: user1 });

        await time.increase(time.duration.days(2));
        console.log(await getBlockTime());

        await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
        await staker.stake(toWei(amountLP), { from: user1 });

        let startTime = await staker.startTime();
        let endTime = await staker.endTime();
        console.log();
        console.log("Start time: ", startTime.toString());
        console.log("End time: ", endTime.toString());
        console.log();

        userRec = await staker.getUserRecord(user1);
        console.log("user record: ", userRec);
        console.log();

        let chkPts = await staker.getChkPtRecord();
        console.log("chkPt record: ", chkPts);

        await LpEtb.approve(staker.address, toWei(amountLP), { from: user1 });
        await expectRevert(
            staker.stake(toWei(amountLP), { from: user1 }),
            "Staker#stake: Emission Era has ended. Please unstake & claim"
        );
    });
});

// contract("Staker#createEra", (account, network) => {})
