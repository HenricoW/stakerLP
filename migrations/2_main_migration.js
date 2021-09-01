const MockETB = artifacts.require("MockETB");
const LPetb = artifacts.require("LPetb");
const Staker = artifacts.require("Staker");

const toWei = (val) => web3.utils.toWei(val);
const fromWei = (val) => web3.utils.fromWei(val);

module.exports = async function (deployer, network, accounts) {
    const [admin, user1, user2, _] = accounts;

    await deployer.deploy(MockETB);
    const mETB = await MockETB.deployed();
    await deployer.deploy(LPetb);
    const lpETB = await LPetb.deployed();

    await deployer.deploy(Staker, lpETB.address, mETB.address);
    const staker = await Staker.deployed();

    const mintAmount = toWei("1000");
    await lpETB.faucet(mintAmount, { from: user1 });
    await lpETB.faucet(mintAmount, { from: user2 });

    const durationInDays = 2;
    const releaseAmount = toWei("240");
    const rewIntervalHrs = 1;

    await mETB.approve(staker.address, releaseAmount, { from: admin });
    await staker.createEra(durationInDays, releaseAmount, rewIntervalHrs, { from: admin });

    const amountLP = "180";
    // allow stake when INITIALIZED
    await lpETB.approve(staker.address, toWei(amountLP), { from: user1 });
    await staker.stake(toWei(amountLP), { from: user1 });

    // allow stake when ERA_ACTIVE
    await lpETB.approve(staker.address, toWei(amountLP), { from: user1 });
    await staker.stake(toWei(amountLP), { from: user1 });
};
