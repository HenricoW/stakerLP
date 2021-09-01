import { useState } from "react";
import "./App.css";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
// import Autherum from "authereum";
import Torus from "@toruslabs/torus-embed";
import Web3 from "web3";
import Web3Modal from "web3modal";
import UserPanel from "./components/UserPanel";

// artifacts
import MockETB_afct from "./artifacts/MockETB.json";
import Staker_afct from "./artifacts/Staker.json";
import LPetb_afct from "./artifacts/LPetb.json";
import IERC20_afct from "./artifacts/IERC20.json";

type artifact = {
    [key: string]: any;
    networks: {
        [key: string]: any;
    };
};

const Staker: artifact = Staker_afct;
const MockETB: artifact = MockETB_afct;
const LPetb: artifact = LPetb_afct;
const IERC20: artifact = IERC20_afct;

// testnet values
const ETB_test = "";
const LP_ETB_test = "";
const ETB_main = "0x7ac64008fa000bfdc4494e0bfcc9f4eff3d51d2a"; // ETB on mainnet
const LP_ETB_main = "0xdB44C35Cd6C378eB9e593d4c7243118064172fb2"; // PCS_ETB_WBNB on mainnet

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

export const getContracts = async (web3: Web3) => {
    const networkId = await web3.eth.net.getId();

    const stakerAddr: string = Staker.networks[networkId.toString()].address;
    const stakerContr = new web3.eth.Contract(Staker.abi, stakerAddr);
    // const stakerContr = null;

    let mETBcontr, lpTkncontr;
    switch (networkId) {
        case 5777: // ganache
            const mETBaddr: string = MockETB.networks[networkId.toString()].address;
            mETBcontr = new web3.eth.Contract(MockETB.abi, mETBaddr);
            const lpTknAddr: string = LPetb.networks[networkId.toString()].address;
            lpTkncontr = new web3.eth.Contract(LPetb.abi, lpTknAddr);
            break;
        case 53: // BSC testnet
            mETBcontr = new web3.eth.Contract(IERC20.abi, ETB_test);
            lpTkncontr = new web3.eth.Contract(IERC20.abi, LP_ETB_test);
            break;
        case 56: // BSC mainnet
            mETBcontr = new web3.eth.Contract(IERC20.abi, ETB_main);
            lpTkncontr = new web3.eth.Contract(IERC20.abi, LP_ETB_main);
            break;
        default:
            mETBcontr = null;
            lpTkncontr = null;
    }

    return [stakerContr, mETBcontr, lpTkncontr];
};

export const chainData = new Map<number, string>([
    [0, "Unsupported Network"],
    [1, "ETH Mainnet"],
    [97, "BSC Testnet"],
    [56, "BSC Mainnet"],
    [1337, "Local Dev"],
]);

function App() {
    const [address, setAddress] = useState("");
    const [chainId, setChainId] = useState<number>(0);
    const [web3, setWeb3] = useState<web3type>(undefined);
    const [provider, setProvider] = useState<any>(undefined);

    const getChainId = async () => (web3 ? await web3.eth.getChainId() : 0);
    // const getW3Contr = async () => (web3 ? await getContracts(web3) : [null, null, null]);

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

    return (
        <>
            <Navbar chainId={chainId} address={address} setWeb3={setWeb3} setProvider={setProvider} />
            <div className="main">
                <div className="modal"></div>
                <section className="container era-info"></section>
                <section className="container admin-panel"></section>
                <UserPanel />
            </div>
            <Footer />
        </>
    );
}

export default App;
