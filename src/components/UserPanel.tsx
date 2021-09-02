import { useEffect, useState } from "react";
import { ContractType, Web3type } from "../App";
import Modal from "./Modal";
import "./UserPanel.css";

type UserPanelProps = {
    address: string;
    contracts: ContractType[];
    web3: Web3type;
    balances: {
        lpBal: string;
        stakeBal: string;
        ETBbal: string;
    };
    updateBalances: () => Promise<void>;
    usrActIdx: number;
    userRec: any[];
    // getLastActTime: () => Promise<void>;
};

const txStatusMssgs: { [key: string]: string } = {
    pending: "Please follow your wallet prompts",
    success: "Transaction successful!",
    failed: "Transaction failed",
};

const modalTitles: { [key: string]: string } = {
    stake: "Stake your LP",
    unstake: "Unstake your LP",
};

function UserPanel({ address, contracts, web3, balances, updateBalances, usrActIdx, userRec }: UserPanelProps) {
    const [stakeVal, setStakeVal] = useState("0");
    const [errorMssg, setErrorMssg] = useState("");
    const [txStatus, setTxStatus] = useState<"not sent" | "pending" | "success" | "failed">("not sent");
    const [chkPtRecord, setChkPtRecord] = useState<string[][]>();
    const [intervStart, setIntervStart] = useState("0");
    const [modalShowing, setModalShowing] = useState(false);
    const [modalTitle, setModalTitle] = useState("Stake your LP");

    const [stakerContr, _, lpTkncontr] = contracts;

    const stakeLP = async (amount: number) => {
        if (stakerContr && lpTkncontr && address.length > 40) {
            let amt = web3?.utils.toWei(amount.toString());

            lpTkncontr.methods
                .approve(stakerContr.options.address, amt)
                .send({ from: address })
                .on("receipt", (receipt: any) => {
                    stakerContr.methods
                        .stake(amt)
                        .send({ from: address })
                        .on("receipt", (receipt: any) => {
                            setTxStatus("success");
                        })
                        .on("error", (error: any) => {
                            setTxStatus("failed");
                            console.log(error);
                        });
                })
                .on("error", (error: any) => {
                    setTxStatus("failed");
                    console.log(error);
                    return;
                });
        }
    };

    const submitStake = async () => {
        const valf = parseFloat(stakeVal);
        if (Number.isNaN(valf)) {
            setErrorMssg("Invalid input: Enter a number");
            return;
        }
        if (valf === 0) return;

        setTxStatus("pending");
        await stakeLP(valf);
        await updateBalances();
    };

    const getCheckPts = async () => {
        console.log("getting chkpts");
        if (contracts[0]) {
            // let cpRec: string[][];
            try {
                console.log("staker ctrx: ", contracts[0]);
                const cpRec = await contracts[0].methods.getChkPtRecord().call();
                console.log(cpRec);
                if (cpRec.length < 1) return;
                setChkPtRecord(cpRec);
            } catch (err) {
                console.log(err);
            }
        }
    };

    // const calcRewEstimate = () => {
    //     console.log(userRec);
    //     console.log(chkPtRecord);
    // };

    console.log("in u panel");

    useEffect(() => {
        const init = async () => {
            await getCheckPts();
            // calcRewEstimate();
        };

        updateBalances();
        // getCheckPts();

        init();
    }, [usrActIdx, address, contracts]);

    const resetModal = () => {
        hideModal();
        updateBalances();
        setStakeVal("0");
        setErrorMssg("");
        setTxStatus("not sent");
    };

    const showModal = (type: string) => {
        setModalTitle(modalTitles[type]);
        setModalShowing(true);
    };
    const hideModal = () => setModalShowing(false);

    const modalBody = () => {
        return txStatus === "not sent" ? (
            <div className="modal-body">
                <input
                    type="number"
                    name="stake-val"
                    id="stake-val"
                    // pattern="\d+\.?\d+"
                    value={stakeVal}
                    onChange={(e) => {
                        setStakeVal(e.target.value);
                        if (errorMssg !== "") setErrorMssg("");
                    }}
                />
                <div className="error">{errorMssg}</div>
                <div className="modal-action">
                    <div className="modal-btn" onClick={resetModal}>
                        Close
                    </div>
                    <div className="modal-btn" onClick={submitStake}>
                        Submit
                    </div>
                </div>
            </div>
        ) : (
            <div className="modal-body tx-message">{txStatusMssgs[txStatus]}</div>
        );
    };

    return (
        <section className="container user-panel">
            {modalShowing ? (
                <Modal modalTitle={modalTitle} resetModal={resetModal}>
                    {modalBody()}
                </Modal>
            ) : null}
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
                    <a className="card-link" href="/">
                        Get ETB-BNB
                        <span>
                            <img className="link-icon" src="link-icon.svg" alt="link-icon" />
                        </span>
                    </a>
                    <a className="card-link" href="/">
                        View Conract
                        <span>
                            <img className="link-icon" src="link-icon.svg" alt="link-icon" />
                        </span>
                    </a>
                </div>
            </div>
            <div className="card staking">
                {address ? (
                    <>
                        <div className="lp-staked">
                            <h3>Your Stake</h3>
                            <p>{balances.stakeBal} ETB-BNB</p>
                        </div>
                        <div className="lp-wallet">
                            <h3>Your Wallet</h3>
                            <p>{balances.lpBal} ETB-BNB</p>
                        </div>
                        <div className="stake-btns">
                            <h4 className="btn-sub" onClick={() => {}}>
                                Unstake
                            </h4>
                            <h4 className="btn-add" onClick={() => showModal("stake")}>
                                Stake
                            </h4>
                        </div>
                        <div className="last-action">
                            <h3>Last action</h3>
                            <p>
                                {chkPtRecord
                                    ? new Date((+chkPtRecord[usrActIdx - 1][0] + 3600) * 1000).toLocaleString() // 1 hr after closed check point
                                    : "Checkpoint still open"}
                            </p>
                        </div>
                        <div className="estimate-val">
                            <h3>Reward Estimate</h3>
                            <p>34.37 ETB</p>
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
