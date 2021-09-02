import { useEffect, useState } from "react";
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
import { Contract } from "web3-eth-contract";

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

export type Web3type = Web3 | undefined;
export type ContractType = Contract | null;

export const getWeb3 = async () => {
    const web3modal = new Web3Modal({
        providerOptions,
    });
    let _provider = undefined,
        _web3: Web3type;
    try {
        _provider = await web3modal.connect();
        _web3 = new Web3(_provider);
    } catch (err) {
        console.log(err);
    }

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
    const [web3, setWeb3] = useState<Web3type>(undefined);
    const [provider, setProvider] = useState<any>(undefined);
    const [contracts, setContracts] = useState<ContractType[]>([]);
    const [userRec, setUserRec] = useState<any[]>([]);
    const [usrActIdx, setUsrActIdx] = useState(0);
    const [stakeBal, setStakeBal] = useState("0");
    const [lpBal, setLpBal] = useState("0");
    const [ETBbal, setETBbal] = useState("0");

    const balances = { lpBal, stakeBal, ETBbal };
    const [stakerContr, mETBcontr, lpTkncontr] = contracts;

    const getLPbalance = async () => {
        if (lpTkncontr && address.length > 40) {
            let bal;
            try {
                bal = await lpTkncontr.methods.balanceOf(address).call();
                bal = bal ? web3?.utils.fromWei(bal) : "0";
                bal && setLpBal(bal);
            } catch (err) {
                setLpBal("0");
                console.log(err);
            }
        }
    };

    const getETBbalance = async () => {
        if (mETBcontr && address.length > 40) {
            let bal;
            try {
                bal = await mETBcontr.methods.balanceOf(address).call();
                bal = bal ? web3?.utils.fromWei(bal) : "0";
                bal && setETBbal(bal);
            } catch (err) {
                setETBbal("0");
                console.log(err);
            }
        }
    };

    const getUserStake = async () => {
        if (stakerContr && address.length > 40) {
            let uRec;
            try {
                uRec = await stakerContr.methods.getUserRecord(address).call();
                if (uRec.length < 1) return;
                setUserRec(uRec);
                let uBal = web3?.utils.fromWei(uRec[uRec.length - 1].totUsrStake);
                let lastActIdx: number = +uRec[uRec.length - 1].mainChkPtIndex;
                setUsrActIdx(lastActIdx);
                uBal && setStakeBal(uBal);
            } catch (err) {
                console.log(err);
            }
        }
    };

    const updateBalances = async () => {
        await Promise.all([getLPbalance(), getETBbalance(), getUserStake()]);
    };

    const getChainId = async () => (web3 ? await web3.eth.getChainId() : 0);

    useEffect(() => {
        setLpBal("0");
        setStakeBal("0");
        setETBbal("0");
        web3 && updateBalances();
    }, [address]);

    useEffect(() => {
        web3 &&
            web3.eth
                .getAccounts()
                .then((addrArray) => {
                    let addr = addrArray ? addrArray[0] : "";
                    setAddress(addr);
                })
                .catch((err) => console.log(err));

        getChainId()
            .then((id) => setChainId(id))
            .catch((err) => console.log(err));

        if (provider) {
            provider.on("accountsChanged", (accounts: string[]) => setAddress(accounts[0]));
            provider.on("chainChanged", (chainId: number) => setChainId(chainId));
        }

        const init = async (_w3: Web3type) => {
            console.log("getting contrx");
            const ctxs = _w3 ? await getContracts(_w3) : [];
            ctxs.length > 0 && setContracts(ctxs);
        };

        init(web3);
    }, [web3, provider]);

    console.log("in app");

    return (
        <>
            <Navbar chainId={chainId} address={address} setWeb3={setWeb3} setProvider={setProvider} />
            <div className="main">
                <section className="container era-info"></section>
                <section className="container admin-panel"></section>
                <UserPanel
                    address={address}
                    contracts={contracts}
                    web3={web3}
                    balances={balances}
                    updateBalances={updateBalances}
                    usrActIdx={usrActIdx}
                    userRec={userRec}
                />
            </div>
            <Footer />
        </>
    );
}

export default App;
