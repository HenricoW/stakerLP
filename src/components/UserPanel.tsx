import "./UserPanel.css";

function UserPanel() {
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
                <div className="stake-ctrl">
                    <h3>Your Stake</h3>
                    <p>39.5 ETB-BNB</p>
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
            </div>
        </section>
    );
}

export default UserPanel;
