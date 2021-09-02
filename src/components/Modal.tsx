import "./Modal.css";

type ModalProps = {
    modalTitle: string;
    resetModal: () => void;
    children: React.ReactNode;
};

function Modal({ modalTitle, resetModal, children }: ModalProps) {
    return (
        <div className="modal-bg" onClick={resetModal}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-head">Stake your LP</div>
                {children}
            </div>
        </div>
    );
}

export default Modal;
