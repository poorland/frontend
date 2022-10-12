import { useEffect, useState } from 'react';
import { useWeb3React } from "@web3-react/core";
import { useNavigate } from 'react-router-dom'
import Web3 from "web3";
import { Stack } from "@mui/material";
import LoadingButton from '@mui/lab/LoadingButton';
import { styled } from '@mui/material/styles';
import "./index.css";
import axios from "axios";
import { ApiHost, EtherscanHost } from '../../abis/abiAddress'
import { useExchangeContract } from "../../hooks/useContract";
import { useTranslation } from 'react-i18next';
import { TabHomeNormal, TabMapNormal, TabClaimSelected, HeaderView, publicConnectWallet, ToastStatus } from '../../components/components';

declare const window: Window & { ethereum: any, web3: any };

enum ClaimEventItemStatus {
    Claimed = -1,
    Unknown = 0,
    CanClaim = 1
}

/*
{
"id": 1,
"project_id": 1,
"event_name": "TestEvent",
"event_description": "Event Description",
"event_type": 2,
"event_time": "2021-21-11",
"valid": 1
}
*/
interface ClaimEventListItem {
    id: number,
    project_id: number,
    event_name: string,
    event_description: string,
    event_type: number,
    event_time: string,
    valid: number,
    // 是否禁用 claim 按钮
    claimDisabled: boolean,
    // 是否可以 claim 对应的状态
    canClaim: ClaimEventItemStatus,
    signResponseData: any,
    // 当可以 claim 时显示的提示文字
    canClaimTips: string
}

export default function Claim() {

    const { t } = useTranslation();
    const { account } = useWeb3React();
    const navigate = useNavigate();
    const [eventList, setEventList] = useState<Array<ClaimEventListItem>>([]);
    const exchangeContract = useExchangeContract();
    const [airdropLoading, setAirdropLoading] = useState(false);
    const [airdroppingIndex, setAirdroppingIndex] = useState(0);
    /// 记录 item 状态变成的次数, 主要是为了触发页面刷新
    const [itemClaimStatusChangeAmount, setItemClaimStatusChangeAmount] = useState<number>(0);

    useEffect(() => {
        // 在 Claim body 和 html 的 overflow 设为无效
        let bodyStyle = document.body.style
        let htmlStyle = document.getElementsByTagName('html')[0].style
        bodyStyle.overflow = `initial`
        htmlStyle.overflow = `initial`
        loadData();
    }, []);

    const loadData = () => {
        axios.get(ApiHost + '/event/list')
            .then((response: any) => {
                if (Array.isArray(response.data.body)) {
                    // let list = [(response.data.body as Array<ClaimEventListItem>)[0], (response.data.body as Array<ClaimEventListItem>)[0]]
                    setEventList(response.data.body);
                }
            })
            .catch(function (error) {
                console.log(error);
            })
    }

    const airdrop = (item: ClaimEventListItem, index: number) => {
        if (!account) {
            publicConnectWallet();
            return;
        }
        if (airdropLoading) {
            return;
        }
        setAirdropLoading(true);
        setAirdroppingIndex(index);
        console.log('click airdrop:', item);
        if (item.canClaim === ClaimEventItemStatus.CanClaim) {
            if (item.event_type === 3) {
                callEvent3AirdropContract(item);
            } else {
                callAirdropContract(item);
            }
            return;
        }
        axios.get(ApiHost + '/sign/request', {
            params: {
                Address: account,
                ProjectID: item.project_id,
                EventID: item.id,
                EventType: item.event_type
            }
        }).then((response: any) => {
            console.log(response.config.url);
            console.log(response.data)
            if (response.data.body.sign === null || response.data.body.sign.length === 0) {
                setAirdropLoading(false);
                item.claimDisabled = true;
                setItemClaimStatusChangeAmount(itemClaimStatusChangeAmount + 1);
                window.$toast.show("You can't claim now", ToastStatus.Info);
            } else {
                if (item.event_type === 3) {
                    checkEvent3ClaimStatus(response.data, item);
                } else {
                    checkClaimStatus(response.data, item);
                }
            }
        }).catch((err: any) => {
            setAirdropLoading(false);
            window.$toast.showError(err);
        });
    }

    /*
    {
    "code": 1000,
    "body": {
        "sign": "0x5670a5b50682976aa4b6125eda04b59816f3cd680adf00a91234aba8b6e62d2652a34617203f2b2083c0509a1a852da467b65015be80ddcd4328d70bfce7b9f91b",
        "param": "0,300,0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0,1155"
    },
    "message": "SUCCESS"
    }
    */

    /// 检查 event_type === 3 的 claim status
    const checkEvent3ClaimStatus = (responseData: any, item: ClaimEventListItem) => {
        let sign = responseData.body.sign;
        exchangeContract.isClaimedEvent(account, sign).call().then(function (ret: boolean) {
            console.log('isClaimedEvent result:', ret);
            checkClaimStatusResult(ret, responseData, item);
            setAirdropLoading(false);
        }).catch(function (err: any) {
            setAirdropLoading(false);
            window.$toast.showError(err);
        });
    }

    /// 其他类型检查是否已经 claim
    const checkClaimStatus = (responseData: any, item: ClaimEventListItem) => {
        let sign = responseData.body.sign;
        exchangeContract.isClaimed(sign).call().then(function (ret: boolean) {
            console.log('isClaimed result:', ret);
            checkClaimStatusResult(ret, responseData, item);
            setAirdropLoading(false);
        }).catch(function (err: any) {
            setAirdropLoading(false);
            window.$toast.showError(err);
        });
    }

    const checkClaimStatusResult = (result: boolean, responseData: any, item: ClaimEventListItem) => {
        if (!result) {
            // 没有领取过
            item.canClaim = ClaimEventItemStatus.CanClaim;
            item.claimDisabled = false;
            item.signResponseData = responseData;
            let list = responseData.body.param.split(',');
            item.canClaimTips = 'You could claim ' + list[1] + ' PoorLand fragments.';
            setItemClaimStatusChangeAmount(itemClaimStatusChangeAmount + 1);
        } else {
            item.canClaim = ClaimEventItemStatus.Claimed;
            item.claimDisabled = true;
            setItemClaimStatusChangeAmount(itemClaimStatusChangeAmount + 1);
        }
    }

    /// event_type === 3 执行 claim
    const callEvent3AirdropContract = (item: ClaimEventListItem) => {
        if (!item.signResponseData) {
            return;
        }
        let sign = item.signResponseData.body.sign;
        let list = item.signResponseData.body.param.split(',');
        exchangeContract.claimEventAirdrops(
            sign,
            item.id,
            list[2],
            list[3],
            list[0],
            list[1]
        ).estimateGas({
            from: account,
            value: Web3.utils.toWei((0).toString(), 'ether')
        }, function (error: any, gas: number) {
            if (error) {
                return;
            }
            console.log("claimEventAirdrops gas: " + gas);
            exchangeContract.claimEventAirdrops(
                sign,
                item.id,
                list[2],
                list[3],
                list[0],
                list[1]
            ).send({
                from: account,
                gas: gas,
                value: Web3.utils.toWei((0).toString(), 'ether')
            }).then(function (ret: any) {
                console.log('claimEventAirdrops result:', ret);
                setAirdropLoading(false);
                let transactionLink = EtherscanHost + ret.transactionHash;
                window.$toast.showLink("Success", ToastStatus.Success, t("build.transaction.link.text"), transactionLink);
                item.canClaim = ClaimEventItemStatus.Claimed;
                item.claimDisabled = true;
                setItemClaimStatusChangeAmount(itemClaimStatusChangeAmount + 1);
            }).catch(function (err: any) {
                setAirdropLoading(false);
                window.$toast.showError(err);
            });
        }).catch((err: any) => {
            setAirdropLoading(false);
            window.$toast.showError(err);
        });
    }

    /// 执行 claim
    const callAirdropContract = (item: ClaimEventListItem) => {
        if (!item.signResponseData) {
            return;
        }
        let sign = item.signResponseData.body.sign;
        let list = item.signResponseData.body.param.split(',');
        exchangeContract.claimAirdrops(
            sign,
            item.id,
            list[2],
            list[3],
            list[0],
            list[1]
        ).estimateGas({
            from: account,
            value: Web3.utils.toWei((0).toString(), 'ether')
        }, function (error: any, gas: number) {
            if (error) {
                return;
            }
            console.log("claimAirdrops gas: " + gas);
            exchangeContract.claimAirdrops(
                sign,
                item.id,
                list[2],
                list[3],
                list[0],
                list[1]
            ).send({
                from: account,
                gas: gas,
                value: Web3.utils.toWei((0).toString(), 'ether')
            }).then(function (ret: any) {
                console.log('claimAirdrops result:', ret);
                setAirdropLoading(false);
                let transactionLink = EtherscanHost + ret.transactionHash;
                window.$toast.showLink("Success", ToastStatus.Success, t("build.transaction.link.text"), transactionLink);
                item.canClaim = ClaimEventItemStatus.Claimed;
                item.claimDisabled = true;
                setItemClaimStatusChangeAmount(itemClaimStatusChangeAmount + 1);
            }).catch(function (err: any) {
                setAirdropLoading(false);
                window.$toast.showError(err);
            });
        }).catch((err: any) => {
            setAirdropLoading(false);
            window.$toast.showError(err);
        });
    }

    const AirdropButton = styled(LoadingButton)({
        boxShadow: 'none',
        textTransform: 'none',
        color: 'black',
        fontSize: 18,
        marginTop: '10px',
        padding: '6px 42px 6px 42px',
        border: '1px solid',
        backgroundColor: 'white',
        borderColor: 'white',
        fontFamily: [
            'SF Pro SC',
            'SF Pro Display',
            'SF Pro Icons',
            'PingFang SC',
            'Helvetica Neue',
            'Helvetica',
            'Arial',
            'sans-serif',
            'Microsoft YaHei',
        ].join(','),
        '&:hover': {
            backgroundColor: 'white',
            borderColor: 'white',
            boxShadow: 'none',
        },
        '&:disabled': {
            backgroundColor: '#999999',
            borderColor: '#999999',
            boxShadow: 'none',
        },

    });

    const claimButtonTitle = (item: ClaimEventListItem) => {
        if (item.canClaim === ClaimEventItemStatus.CanClaim) {
            return 'Claim now';
        }
        if (item.canClaim === ClaimEventItemStatus.Claimed) {
            return 'Claimed';
        }
        return 'Check my airdrop';
    }

    return (
        <>
            <Stack className='claim-page-stack' direction="column" justifyContent="flex-start" alignItems="flex-start" spacing={0}>
                <HeaderView />
                <Stack className='claim-content-stack' direction="row" justifyContent="flex-start" alignItems="flex-start" spacing={0}>
                    <Stack className='claim-action-group-stack' direction="column" justifyContent="flex-start" alignItems="center" spacing={0}>
                        <TabHomeNormal />
                        <TabMapNormal />
                        <TabClaimSelected />
                    </Stack>
                    <Stack id='claim-list-content' direction="column" justifyContent="flex-start" alignItems="center" spacing={0}>
                        {eventList.length === 0 &&
                            <Stack className='claim-list-item claim-list-item-empty' direction="column" justifyContent="flex-start" alignItems="center" spacing={0}>
                                <div className='claim-list-item-title '>No airdrops yet</div>
                            </Stack>
                        }
                        {
                            eventList.map((item: ClaimEventListItem, index) => (
                                <Stack key={index} className={index === eventList.length - 1 ? 'claim-list-item claim-list-item-last' : 'claim-list-item'} direction="column" justifyContent="flex-start" alignItems="center" spacing={0}>
                                    <div className='claim-list-item-title'>{item.event_name}</div>
                                    <div className='claim-list-item-date'>{item.event_time}</div>
                                    <div className='claim-list-item-desc'>{item.event_description}</div>
                                    <div className='claim-list-item-tips'>{item.canClaim === ClaimEventItemStatus.CanClaim ? item.canClaimTips : null}</div>
                                    <AirdropButton
                                        className='claim-airdrop-button'
                                        onClick={() => { airdrop(item, index) }}
                                        loading={airdropLoading && airdroppingIndex === index}
                                        loadingPosition="center"
                                        variant="outlined"
                                        disabled={itemClaimStatusChangeAmount > 0 && item.claimDisabled}
                                    >
                                        {claimButtonTitle(item)}
                                    </AirdropButton>
                                    {item.canClaim === ClaimEventItemStatus.Claimed && <div className='claim-airdrop-build-now' onClick={() => navigate('/pixelmap')}>Build now</div>}
                                    {(eventList.length > 0 && index !== eventList.length - 1) && <div className='claim-list-item-dividing-line'></div>}
                                </Stack>
                            ))
                        }
                    </Stack>
                </Stack>
            </Stack>
        </>
    )

}