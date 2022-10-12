import React, { useEffect, useState } from 'react';
import "./components.css"
import { useNavigate } from 'react-router-dom'
import { Stack, Button, Snackbar, Alert } from "@mui/material";
import TitleImg from '../assets/images/pixel_title.png';
import TabHomeNormalImg from '../assets/images/tab_home_normal.png';
import TabHomeSelectedImg from '../assets/images/tab_home_selected.png';
import TabMapNormalImg from '../assets/images/tab_map_normal.png';
import TabMapSelectedImg from '../assets/images/tab_map_selected.png';
import TabClaimNormalImg from '../assets/images/tab_claim_normal.png';
import TabClaimSelectedImg from '../assets/images/tab_claim_selected.png';
import LanguageImg from '../assets/images/language.png';
import LoadingButton from '@mui/lab/LoadingButton';
import { styled } from '@mui/material/styles';
import { useWeb3React } from "@web3-react/core";
import { useMintContract } from "../hooks/useContract";
import Web3 from "web3";
import i18next from "i18next";
import { useTranslation } from 'react-i18next';
import axios from "axios";
import { ApiHost } from '../abis/abiAddress'

export function TabHomeNormal() {

    const navigate = useNavigate();
    const { t } = useTranslation();

    return <Stack direction="column" justifyContent="flex-start" alignItems="center" spacing={0} className='page-tab-div' onClick={() => navigate('/')}>
        <img className='page-tab-img' src={TabHomeNormalImg} alt="" />
        <div className='page-tab-title'>{t("tab.home")}</div>
    </Stack>;
}

export function TabHomeSelected() {

    const { t } = useTranslation();

    return <Stack direction="column" justifyContent="flex-start" alignItems="center" spacing={0} className='page-tab-div'>
        <img className='page-tab-img' src={TabHomeSelectedImg} alt="" />
        <div className='page-tab-title'>{t("tab.home")}</div>
    </Stack>;
}

export function TabMapNormal() {

    const navigate = useNavigate();

    return <Stack direction="column" justifyContent="flex-start" alignItems="center" spacing={0} className='page-tab-div' onClick={() => navigate('/pixelmap')}>
        <img className='page-tab-img' src={TabMapNormalImg} alt="" />
        <div className='page-tab-title'>MAP</div>
    </Stack>;
}

export function TabMapSelected() {

    return <Stack direction="column" justifyContent="flex-start" alignItems="center" spacing={0} className='page-tab-div'>
        <img className='page-tab-img' src={TabMapSelectedImg} alt="" />
        <div className='page-tab-title'>MAP</div>
    </Stack>;
}

export function TabClaimNormal() {

    const navigate = useNavigate();

    return <Stack direction="column" justifyContent="flex-start" alignItems="center" spacing={0} className='page-tab-div' onClick={() => navigate('/claim')}>
        <img className='page-tab-img' src={TabClaimNormalImg} alt="" />
        <div className='page-tab-title'>AIRDROP</div>
    </Stack>;
}

export function TabClaimSelected() {

    return <Stack direction="column" justifyContent="flex-start" alignItems="center" spacing={0} className='page-tab-div'>
        <img className='page-tab-img' src={TabClaimSelectedImg} alt="" />
        <div className='page-tab-title'>AIRDROP</div>
    </Stack>;
}

declare const window: Window & { ethereum: any, web3: any };
var lang = 0;

export const HeaderView: React.FC<{}> = () => {

    const { account } = useWeb3React();
    const mintContract = useMintContract();
    const [accountLoading, setAccountLoading] = useState(false);
    const [blanceLoading, setBlanceLoading] = useState(false);
    const [blance, setBlance] = useState<number>(-1);
    const [gasFee, setGasFee] = useState<number>(-1);

    useEffect(() => {
        if (account) {
            setAccountLoading(false);
            blanceQuery();
        }
        queryGasFee();
        setInterval(function () {
            queryGasFee();
        }, 10000);
        
    }, [account]);

    const queryGasFee = () => {
        axios.get(ApiHost + '/uitl/get/gas')
            .then((response: any) => {
                let gasFee = response.data.body.result.ProposeGasPrice;
                setGasFee(gasFee);
                if (gasFee > 40) {
                    document.getElementById('map-gas-fee')!.style.backgroundColor = '#d95040';
                } else if (gasFee > 10 && gasFee <= 40) {
                    document.getElementById('map-gas-fee')!.style.backgroundColor = '#f3e54d';
                } else {
                    document.getElementById('map-gas-fee')!.style.backgroundColor = '#58a55c';
                }
            })
            .catch(function (error) {
                console.log(error);
            });
    }

    const changeLanguage = async () => {
        if (lang === 0) {
            lang = 1;
            await i18next.changeLanguage('cn');
        } else {
            lang = 0;
            await i18next.changeLanguage('en');
        }
    };

    const connectWallet = () => {
        if (!account) {
            setAccountLoading(true);
            publicConnectWallet();
        }
    }

    const blanceQuery = () => {
        if (!account) {
            setAccountLoading(true);
            publicConnectWallet();
            return;
        }
        setBlanceLoading(true);
        mintContract.materialBalance(account).call().then((res: number) => {
            console.log("balanceOf = ", res);
            setBlanceLoading(false);
            setBlance(res);
        }).catch((err: any) => {
            setBlanceLoading(false);
            setBlance(0);
        });
    }

    const BlanceButton = styled(LoadingButton)({
        boxShadow: 'none',
        textTransform: 'none',
        color: '#333333',
        fontSize: 12,
        paddingLeft: '20px',
        paddingRight: '20px',
        height: '32px',
        marginRight: '30px',
        borderRadius: '8px',
        border: '1px solid',
        backgroundColor: '#e8e7e6',
        borderColor: '#e8e7e6',
        '&:hover': {
            backgroundColor: '#e8e7e6',
            borderColor: '#e8e7e6',
            boxShadow: 'none',
        },
    });

    return (
        <>
            <Stack className='page-header-stack' direction="row" justifyContent="flex-start" alignItems="center" spacing={0}>
                <Stack className='map-header-left-stack' direction="row" justifyContent="flex-start" alignItems="center" spacing={0}>
                    <img className='map-pixel-title-img' src={TitleImg} alt=""></img>
                    <Stack className='map-language-stack' onClick={() => changeLanguage()}
                        direction="row" justifyContent="flex-start" alignItems="center" spacing={0}>
                        <img className='map-language-icon' src={LanguageImg} alt="" />
                        <div className='map-language-title-div'>{lang === 0 ? "EN" : "CN"}</div>
                    </Stack>
                </Stack>
                <Stack className='map-header-right-stack' direction="row" justifyContent="flex-end" alignItems="center" spacing={0}>
                    <div id='map-gas-fee'>{gasFee > -1 ? 'Gas: ' + gasFee : 'Loading...'}</div>
                    <BlanceButton
                        className='claim-airdrop-button'
                        onClick={() => blanceQuery()}
                        loading={blanceLoading}
                        loadingPosition="center"
                        variant="outlined"
                    >
                        {blance >= 0 ? 'Balance: ' + blance : 'Balance'}
                    </BlanceButton>
                    <div className='map-buy-on-opensea' onClick={() => { window.open('https://opensea.io/collection/poorlandnft'); }}>
                        Buy on OpenSea
                    </div>
                    <div className='map-wallet-div'>
                        <Button id={accountLoading ? 'hidden' : 'map-wallet-button'} onClick={() => connectWallet()}>
                            {account ? account?.slice(0, 5) + "..." + account?.slice(account.length - 3) : 'Connect Wallet'}
                        </Button>
                        <LoadingButton id={accountLoading ? 'map-mint-loading-button' : 'hidden'} loading variant="outlined" ></LoadingButton>
                    </div>
                </Stack>
            </Stack>

        </>
    );
}

export const publicConnectWallet = () => {
    console.log('connectWallet start');
    let timeout = setTimeout(function () {
        loadWeb3()
    }, 300);
    return function () {
        clearTimeout(timeout);
    };
};

const loadWeb3 = async () => {
    if (window.ethereum && window.ethereum.isMetaMask) {
        window.web3 = new Web3(window.ethereum);
        await connectMetaMask()
    } else if (window.web3) {
        window.web3 = new Web3(window.web3.currentProvider);
        await connectMetaMask()
    } else {
        alert('Please confirm that you have installed the Metamask wallet.');
    }
};

const connectMetaMask = async () => {
    try {
        await window.ethereum.request({
            method: "eth_requestAccounts"
        });
    } catch (error: any) {
        window.$toast.showError(error);
    }
};

export enum ToastStatus {
    Error = -1,
    Info = 0,
    Success = 1
  }

export class Toast extends React.Component<any, any> {
    
    constructor(props: any) {
        super(props);
        this.state = {
            alertIsShow: false,
            alertMessage: '',
            alertStatus: ToastStatus.Info,
            alertSeverity: 'info',
            isShowATag: false,
            aTagText: '',
            transactionLink: ''
        };
    }

    show(alertMessage: string, alertStatus: ToastStatus) {
        let alertSeverity = 'info';
        switch (alertStatus) {
            case ToastStatus.Success:
                alertSeverity = 'success';
                break;
            case ToastStatus.Error:
                alertSeverity = 'error';
                break;

            default:
                alertSeverity = 'info';
                break;
        }
        this.setState({
            alertIsShow: true,
            alertMessage: alertMessage,
            alertStatus: alertStatus,
            alertSeverity: alertSeverity,
            isShowATag: false
        });
    }

    showLink(alertMessage: string, alertStatus: ToastStatus, aTagText: string, transactionLink: string) {
        let alertSeverity = 'info';
        switch (alertStatus) {
            case ToastStatus.Success:
                alertSeverity = 'success';
                break;
            case ToastStatus.Error:
                alertSeverity = 'error';
                break;

            default:
                alertSeverity = 'info';
                break;
        }
        this.setState({
            alertIsShow: true,
            alertMessage: alertMessage,
            alertStatus: alertStatus,
            alertSeverity: alertSeverity,
            isShowATag: true,
            aTagText: aTagText,
            transactionLink: transactionLink
        });
    }

    showError(error: any) {
        console.log(error);
        let message = 'Failed!';
        try {
            if (error.toString().indexOf("{") === -1) {
                message = error.message;
            } else {
                let errorString = error.toString().replace(/[\r\n]/g, "");
                let startIndex = errorString.indexOf("{");
                let endIndex = errorString.lastIndexOf("}");
                let jsonString = errorString.substring(startIndex, endIndex) + "}";
                console.log(jsonString);
                message = JSON.parse(jsonString).originalError.message;
    
            }
        } catch (e) {
            console.log("catch: " + e);
        }
    
        if (message.indexOf('Fragment is not enough') !== -1) {
            // 材料不够, 跳转 poorland.io
            this.setState({
                alertIsShow: true,
                alertMessage: message,
                alertStatus: ToastStatus.Error,
                alertSeverity: 'error',
                isShowATag: true,
                aTagText: ' Go to poorland.io to buy',
                transactionLink: 'https://poorland.io/'
            });
        } else if (message.indexOf('insufficient funds') !== -1){
            this.setState({
                alertIsShow: true,
                alertMessage: '以太坊不足',
                alertStatus: ToastStatus.Error,
                alertSeverity: 'error',
                isShowATag: false
            });
        } else {
            this.setState({
                alertIsShow: true,
                alertMessage: message,
                alertStatus: ToastStatus.Error,
                alertSeverity: 'error',
                isShowATag: false
            });
        }        
    }

    alertClose() {
        this.setState({
            alertIsShow: false,
            isShowATag: false
        });
    }

    render() {
        return (
            <Snackbar anchorOrigin={{ vertical: 'top', horizontal: 'center' }} open={this.state.alertIsShow}
                autoHideDuration={10000} onClose={() => this.alertClose()}>
                <Alert onClose={() => this.alertClose()} severity={this.state.alertSeverity}
                    sx={{ width: '100%', textTransform: 'none' }}>
                    {this.state.alertMessage}
                    {this.state.isShowATag && <a href={this.state.transactionLink} target="view_window">{this.state.aTagText}</a>}
                </Alert>
            </Snackbar>
        );
    }
}