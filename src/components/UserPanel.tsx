import { useEffect, useState } from "react";
import { ContractType, Web3type } from "../App";
import "./UserPanel.css";

type UserPanelProps = {
    address: string;
    contracts: ContractType[];
    web3: Web3type;
};

function UserPanel({ address, contracts, web3 }: UserPanelProps) {
    // user balances
    const [lpBal, setLpBal] = useState("0.00");
    const [ETBbal, setETBbal] = useState("0.00");
    const [stakeBal, setStakeBal] = useState("0.00");

    const [stakerContr, mETBcontr, lpTkncontr] = contracts;

    const getLPbalance = async () => {
        if (lpTkncontr && address.length > 40) {
            let bal;
            try {
                bal = await lpTkncontr.methods.balanceOf(address).call();
                bal = web3?.utils.fromWei(bal);
                bal && setLpBal(bal);
            } catch (err) {
                setLpBal("0.00");
                console.log(err);
            }
        }
    };

    const getETBbalance = async () => {
        if (mETBcontr && address.length > 40) {
            let bal;
            try {
                bal = await mETBcontr.methods.balanceOf(address).call();
                bal = web3?.utils.fromWei(bal);
                bal && setETBbal(bal);
            } catch (err) {
                setETBbal("0.00");
                console.log(err);
            }
        }
    };

    const getUserStake = async () => {
        if (stakerContr && address.length > 40) {
            let uRec;
            try {
                uRec = await stakerContr.methods.getUserRecord(address).call();
                let uBal = web3?.utils.fromWei(uRec[uRec.length - 1].totUsrStake);
                console.log(uRec);
                uBal && setStakeBal(uBal);
            } catch (err) {
                console.log(err);
            }
        }
    };

    const stakeLP = async (amount: number) => {
        if (stakerContr && address.length > 40) {
            let amt = web3?.utils.toWei(amount.toString());
            try {
                await stakerContr.methods.stake(amt).call();
            } catch (err) {
                console.log(err);
            }
        }
    };

    useEffect(() => {
        getLPbalance();
        getETBbalance();
        getUserStake();
    }, [address, contracts]);

    return (
        <section className="container user-panel">
            <div className="card stats">
                <div className="apr">
                    <h3>APR</h3>
                    <h4>11.37%</h4>
                </div>
                <div className="tvl">
                    <h3>TVL</h3>
                    <h4>$ 783.70</h4>
                </div>
                <div className="links">
                    <a className="card-link" href="#">
                        Get ETB-BNB
                        <span>
                            <img className="link-icon" src="link-icon.svg" />
                        </span>
                    </a>
                    <a className="card-link" href="#">
                        View Conract
                        <span>
                            <img className="link-icon" src="link-icon.svg" />
                        </span>
                    </a>
                </div>
            </div>
            <div className="card staking">
                {address ? (
                    <>
                        <div className="stake-ctrl">
                            <div className="lp-staked">
                                <h3>Your Stake</h3>
                                <p>{stakeBal} ETB-BNB</p>
                            </div>
                            <div className="lp-wallet">
                                <h3>Your Wallet</h3>
                                <p>{lpBal} ETB-BNB</p>
                            </div>
                            <div className="stake-btns">
                                <h4 className="btn-sub">Unstake</h4>
                                <h4 className="btn-add">Stake</h4>
                            </div>
                        </div>
                        <div className="reward-est">
                            <h3>Reward since last action</h3>
                            <p>2021/10/30 - 19:43 UTC</p>
                            <h3 className="estimate-val">Estimate: 34.37 ETB</h3>
                        </div>
                    </>
                ) : (
                    <div className="please-conn">
                        <h3>Please connect your wallet</h3>
                    </div>
                )}
            </div>
        </section>
    );
}

export default UserPanel;
