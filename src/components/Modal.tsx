import React, { useRef, useState } from "react";
import { ContractType, Web3type } from "../App";
import "./Modal.css";

type ModalProps = {
    visible: boolean;
    address: string;
    contracts: ContractType[];
    web3: Web3type;
    showModal: () => void;
    hideModal: () => void;
};

const txStatusMssgs: { [key: string]: string } = {
    pending: "Please follow your wallet prompts",
    success: "Transaction successful!",
    failed: "Transaction failed",
};

function Modal({ visible, address, contracts, web3, showModal, hideModal }: ModalProps) {
    const [stakeVal, setStakeVal] = useState("0");
    const [errorMssg, setErrorMssg] = useState("");
    const [txStatus, setTxStatus] = useState<"not sent" | "pending" | "success" | "failed">("not sent");

    const [stakerContr, mETBcontr, lpTkncontr] = contracts;

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

    const callStake = async () => {
        const valf = parseFloat(stakeVal);
        if (Number.isNaN(valf)) {
            setErrorMssg("Invalid input: Enter a number");
            return;
        }
        if (valf === 0) return;

        setTxStatus("pending");
        await stakeLP(valf);
    };

    const resetModal = () => {
        hideModal();
        setStakeVal("0");
        setErrorMssg("");
        setTxStatus("not sent");
    };

    return (
        <div className={`modal-bg${visible ? " visible" : ""}`} onClick={resetModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">Stake your LP</div>
                {txStatus === "not sent" ? (
                    <div className="modal-body">
                        <input
                            type="number"
                            name="stake-val"
                            id="stake-val"
                            // pattern="\d+\.?\d+"
                            value={stakeVal}
                            onChange={(e) => setStakeVal(e.target.value)}
                        />
                        <div className="error">{errorMssg}</div>
                        <div className="modal-action">
                            <div className="modal-btn" onClick={resetModal}>
                                Close
                            </div>
                            <div className="modal-btn" onClick={callStake}>
                                Submit
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="modal-body">{txStatusMssgs[txStatus]}</div>
                )}
            </div>
        </div>
    );
}

export default Modal;
