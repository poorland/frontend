import { useEffect, useState } from 'react';
import { Stack, IconButton, Input } from "@mui/material";
import LoadingButton from '@mui/lab/LoadingButton';
import "./index.css";
import HomeSection3Mask from '../../assets/images/home-section-3-bg.png';
import HomeSection3People1 from '../../assets/images/home-section-3-people-1.jpg';
import HomeSection3People2 from '../../assets/images/home-section-3-people-2.jpg';
import HomeSection4MapImg from '../../assets/images/home-section-4-map.png';
import HomeSection5Card from '../../assets/images/home-section-5-card.png';
import HomeOpenSea from '../../assets/images/home_opensea.png';
import HomeTwitter from '../../assets/images/home_twitter.png';
import HomeDiscord from '../../assets/images/home_discord.png';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import Web3 from "web3";
import { useWeb3React } from "@web3-react/core";
import { useExchangeContract, useIERC1155Contract, useMintContract } from "../../hooks/useContract";
import { ExchangeAddress, IERC1155Address, MintConfirmSign, EtherscanHost } from '../../abis/abiAddress'
import { useTranslation } from 'react-i18next';
import { TabHomeSelected, TabMapNormal, TabClaimNormal, HeaderView, publicConnectWallet, ToastStatus } from '../../components/components';

export default function Home() {

    const { t } = useTranslation();
    const { account } = useWeb3React();
    const mintContract = useMintContract();
    const exchangeContract = useExchangeContract();
    const IERC1155Contract = useIERC1155Contract();
    const [amount, setAmount] = useState<number>(1);
    const [loading, setLoading] = useState(false);
    const [currentAmount, setCurrentAmount] = useState<number>(0);
    const totalAmount = 1000000;

    useEffect(() => {
        // 在首页把 body 和 html 的 overflow 设为无效
        let bodyStyle = document.body.style;
        let htmlStyle = document.getElementsByTagName('html')[0].style;
        bodyStyle.overflow = `initial`;
        htmlStyle.overflow = `initial`;
    }, []);

    useEffect(() => {
        fetchTotalSupply();
    }, [account])

    function twitterAction() {
        window.open('https://twitter.com/PoorLandNFT');
    }

    function discordAction() {
        window.open('https://discord.gg/3QHJmsWun5');
    }

    function viewOnOpenSea() {
        window.open('https://opensea.io/collection/poorlandnft');
    }

    function mintClick() {
        if (!account) {
            publicConnectWallet();
            return;
        }
        setLoading(true);
        mintConfirm(amount);
    }

    const mintConfirm = (num: number) => {
        let tokenID = 0;
        let tokenType = 1155;
        let price = Web3.utils.toWei((0.0001).toString(), 'ether');
        exchangeContract.purchase(IERC1155Address, tokenID, tokenType, price, num, MintConfirmSign).estimateGas({
            from: account,
            value: Web3.utils.toWei((0.0001 * num).toString(), 'ether')
        }, function (error: any, gas: number) {
            if (error) {
                setLoading(false);
                window.$toast.showError(error);
                return;
            }
            console.log("mint gas: " + gas);
            exchangeContract.purchase(IERC1155Address, tokenID, tokenType, price, num, MintConfirmSign).send({
                from: account,
                gas: gas,
                value: Web3.utils.toWei((0.0001 * num).toString(), 'ether')
            }).then(function (ret: any) {
                let transactionLink = EtherscanHost + ret.transactionHash;
                window.$toast.showLink("`Mint` takes zha few minutes", ToastStatus.Info, t("build.transaction.link.text"), transactionLink);
                setLoading(false);
                fetchTotalSupply();
            }).catch(function (err: any) {
                window.$toast.showError(err);
                setLoading(false);
            });
        }).catch((err: any) => {
            window.$toast.showError(err);
            setLoading(false);
        });
    };

    function fetchTotalSupply() {
        if (!account) {
            return;
        }
        IERC1155Contract.balanceOf(ExchangeAddress, 0).call().then((res: number) => {
            console.log("totalSupply = ", res);
            setCurrentAmount(res);
        }).catch((err: any) => {
            window.$toast.showError(err);
        });
    }

    const amountMinus = () => {
        if (amount <= 1) {
            setAmount(1);
            return;
        }
        setAmount(amount - 1);
    };

    const amountPlus = () => {
        if (amount <= 0) {
            setAmount(1);
            return;
        }
        setAmount(amount + 1);
    };

    const onNumChange = (e: any) => {
        console.log('amount=', e.target.value);
        let value = e.target.value;

        if (value.length === 1) {
            value = value.replace(/[^1-9]/g, '')
        } else {
            value = value.replace(/\D/g, '')
        }
        setAmount(value);
    };

    return <Stack className='home-page-stack' direction="column" justifyContent="flex-start" alignItems="flex-start" spacing={0}>
        <HeaderView />
        <Stack className='home-content-stack' direction="row" justifyContent="flex-start" alignItems="flex-start" spacing={0}>
            <Stack className='home-action-group-stack' direction="column" justifyContent="flex-start" alignItems="center" spacing={0}>
                <TabHomeSelected />
                <TabMapNormal />
                <TabClaimNormal />
            </Stack>
            <div className='home-list-content'>
                <Stack className='home-section-1' direction="column" justifyContent="center" alignItems="center" spacing={0}>
                    <Stack className='home-section-1-content' direction="column" justifyContent="center" alignItems="center" spacing={0}>
                        <div className='home-section-1-desc'>
                            {t("home.section1.p1")}<br />
                            <br />
                            {t("home.section1.p2")}<br />
                            <br />
                            {t("home.section1.p3")}<br />
                        </div>
                    </Stack>
                </Stack>
                <Stack className='home-section-2' direction="column" justifyContent="center" alignItems="center" spacing={0}>
                    <div className='home-section-2-title'>Metaverse Built for Poor Land</div>
                    <Stack className='mint-amount-content' direction="row" justifyContent="center" alignItems="center" spacing={0}>
                        <Stack className='mint-step-content' direction="column" justifyContent="center" alignItems="flex-start" spacing={0}>
                            <IconButton className='mint-amount-step-button mint-amount-step-button-plus' onClick={amountPlus}><ExpandLessIcon /></IconButton>
                            <IconButton className='mint-amount-step-button mint-amount-step-button-minus' onClick={amountMinus}><ExpandMoreIcon /></IconButton>
                        </Stack>
                        <Input className='mint-amount-input' sx={{ input: { textAlign: "center" } }} value={amount} onChange={onNumChange} />
                        <LoadingButton id="mint-button" variant="contained" disabled={account !== undefined && currentAmount === 0} loading={loading}
                            sx={{
                                color: 'white',
                                background: 'white',
                                ':hover': {
                                    background: 'LightGrey',
                                    color: 'white',
                                },
                                '& .MuiLoadingButton-loadingIndicator': {
                                    color: 'white'
                                }
                            }}
                            onClick={mintClick}
                        >
                            {account ? "Mint" : t("home.p1.connect")}
                        </LoadingButton>
                    </Stack>

                    <div className='amount-div'>{amount / 10000} ETH / PoorLand</div>
                    <Stack className='bottom-control-content' direction="row" justifyContent="center" alignItems="center" spacing={8}>
                        <div className='bottom-control' onClick={viewOnOpenSea}>
                            <img className='bottom-control-image' src={HomeOpenSea} alt="" />
                        </div>
                        <div className='bottom-control' onClick={twitterAction}>
                            <img className='bottom-control-image' src={HomeTwitter} alt="" />
                        </div>
                        <div className='bottom-control' onClick={discordAction}>
                            <img className='bottom-control-image' src={HomeDiscord} alt="" />
                        </div>
                    </Stack>
                </Stack>
                <div className='home-section-3'>
                    <img className='home-section-3-mask' src={HomeSection3Mask} alt="" />
                    <Stack className='home-section-3-content' direction="column" justifyContent="flex-start" alignItems="center" spacing={0}>
                        <div className='home-section-3-title'>{t("home.section2.title")}</div>
                        <a className='home-section-3-link' href="https://opensea.io/collection/poorlandcharacter" target="view_window">https://opensea.io/collection/poorlandcharacter</a>
                        <Stack direction="row" justifyContent="center" alignItems="flex-start" spacing={0}>
                            <Stack className='home-section-3-people-info-left' direction="column" justifyContent="center" alignItems="flex-end" spacing={0}>
                                <div className='home-section-3-people-name'>{t("home.section2.p1.name")}</div>
                                <div className='home-section-3-people-desc'>{t("home.section2.p1.desc1")}</div>
                                <div className='home-section-3-people-desc'>{t("home.section2.p1.desc2")}</div>
                                <div className='home-section-3-people-desc'>{t("home.section2.p1.desc3")}</div>
                            </Stack>
                            <img className='home-section-3-people-img home-section-3-people-img-left' src={HomeSection3People1} alt="" />
                            <img className='home-section-3-people-img home-section-3-people-img-right' src={HomeSection3People2} alt="" />
                            <Stack className='home-section-3-people-info-right' direction="column" justifyContent="center" alignItems="flex-start" spacing={0}>
                                <div className='home-section-3-people-name'>{t("home.section2.p2.name")}</div>
                                <div className='home-section-3-people-desc'>{t("home.section2.p2.desc1")}</div>
                                <div className='home-section-3-people-desc'>{t("home.section2.p2.desc2")}</div>
                                <div className='home-section-3-people-desc'>{t("home.section2.p2.desc3")}</div>
                            </Stack>
                        </Stack>
                    </Stack>
                </div>
                <Stack className='home-section-4' direction="column" justifyContent="flex-start" alignItems="center" spacing={0}>
                    <div className='home-section-4-title'>{t("home.section3.title")}</div>
                    <div className='home-section-4-desc'>
                        {t("home.section3.s1")}<br />
                        {t("home.section3.s2")}<br />
                        {t("home.section3.s3")}<br />
                        {t("home.section3.s4")}<br />
                        {t("home.section3.s5")}<br />
                        {t("home.section3.s6")}<br />
                        {t("home.section3.s7")}
                    </div>
                    <img className='home-section-4-img' src={HomeSection4MapImg} alt="" />
                </Stack>
                <Stack className='home-section-5' direction="column" justifyContent="flex-start" alignItems="center" spacing={0}>
                    <div className='home-section-5-title'>{t("home.section4.title")}</div>
                    <div className='home-section-5-desc'>
                        {t("home.section4.desc")}
                    </div>
                    <img className='home-section-5-img' src={HomeSection5Card} alt="" />
                </Stack>

            </div>
        </Stack>
    </Stack>

}