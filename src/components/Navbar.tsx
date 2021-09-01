import "./Navbar.css";

import { getWeb3, Web3type, chainData } from "../App";

type NavbarProps = {
    chainId: number;
    address: string;
    setWeb3: React.Dispatch<React.SetStateAction<Web3type>>;
    setProvider: React.Dispatch<React.SetStateAction<undefined>>;
    // disconnect: () => void;
};

function Navbar({ chainId, address, setWeb3, setProvider }: NavbarProps) {
    const shortenAddr = (addr: string) => addr.slice(0, 6) + "..." + addr.slice(-4);

    let addrStr = address.length > 40 ? shortenAddr(address) : "CONNECT";

    const _getWeb3 = async () => {
        const { _web3, _provider } = await getWeb3();
        setWeb3(_web3);
        setProvider(_provider);
    };

    return (
        <header className="container">
            <div className="logo">LOGO</div>
            <nav className="chain">
                <div className="network">{chainData.get(chainId)}</div>
                {/* <div hidden={addrStr === "CONNECT"} className="disconnect" onClick={disconnect}>
                    Disconnect
                </div> */}
                <div className="wallet" onClick={_getWeb3}>
                    {/* <div className="blockies"></div> */}
                    <div className="address">{addrStr}</div>
                </div>
            </nav>
        </header>
    );
}

export default Navbar;
