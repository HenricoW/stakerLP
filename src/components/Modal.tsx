import "./Modal.css";

type ModalProps = {
    modalTitle: string;
    txStatus: string;
    resetModal: () => void;
    children: React.ReactNode;
};

const txStatusMssgs: { [key: string]: string } = {
    pending: "Please follow your wallet prompts",
    success: "Transaction successful!",
    failed: "Transaction failed",
};

function Modal({ modalTitle, txStatus, resetModal, children }: ModalProps) {
    return (
        <div className="modal-bg" onClick={resetModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">{modalTitle}</div>
                {txStatus === "not sent" ? (
                    children
                ) : (
                    <div className="modal-body tx-message">{txStatusMssgs[txStatus]}</div>
                )}
            </div>
        </div>
    );
}

export default Modal;
