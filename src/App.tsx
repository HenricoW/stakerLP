import { useState } from "react";
import "./App.css";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
// import Autherum from "authereum";
import Torus from "@toruslabs/torus-embed";
import Web3 from "web3";
import Web3Modal from "web3modal";

const providerOptions = {
    // authereum: { package: Autherum },
    torus: { package: Torus },
};

export type web3type = Web3 | undefined;

export const getWeb3 = async () => {
    const web3modal = new Web3Modal({
        providerOptions,
    });
    const _provider = await web3modal.connect();
    const _web3 = new Web3(_provider);

    return { _web3, _provider };
};

export const chainData = new Map<number, string>([
    [0, "Unsupported Network"],
    // [1, "ETH Mainnet"],
    [97, "BSC Testnet"],
    [56, "BSC Mainnet"],
]);

function App() {
    const [address, setAddress] = useState("");
    const [chainId, setChainId] = useState<number>(0);
    const [web3, setWeb3] = useState<web3type>(undefined);
    const [provider, setProvider] = useState<any>(undefined);

    const getChainId = async () => (web3 ? await web3.eth.getChainId() : 0);

    if (web3) {
        let addr = "";
        web3.eth
            .getAccounts()
            .then((addrArray) => {
                addr = addrArray[0];
                setAddress(addr);
                console.log(addr);
            })
            .catch((err) => console.log(err));
    }

    if (provider) {
        getChainId()
            .then((id) => setChainId(id))
            .catch((err) => console.log(err));

        provider.on("accountsChanged", (accounts: string[]) => setAddress(accounts[0]));
        provider.on("chainChanged", (chainId: number) => setChainId(chainId));
    }

    // const disconnect = () => {
    //     if (provider) {
    //         setProvider(undefined);
    //         setAddress("");
    //         setChainId(0);
    //         // setWeb3(undefined)
    //     }
    // };

    return (
        <>
            <Navbar
                chainId={chainId}
                address={address}
                setWeb3={setWeb3}
                setProvider={setProvider}
                // disconnect={disconnect}
            />
            <div className="main">
                <div className="modal"></div>
                <section className="container era-info"></section>
                <section className="container admin-panel"></section>
                <section className="container user-panel">
                    <div className="card-slots"></div>
                    <div className="card-staking"></div>
                </section>
            </div>
            <Footer />
        </>
    );
}

export default App;
