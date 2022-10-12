import React, { useEffect, useState } from 'react';
import { Stack, Drawer, Slider, MobileStepper, Dialog, TextField } from "@mui/material";
import LoadingButton from '@mui/lab/LoadingButton';
import SwipeableViews from 'react-swipeable-views';
import { styled } from '@mui/material/styles';
import "./index.css"
import axios from "axios";
import { ApiHost, EtherscanHost } from '../../abis/abiAddress'
import PixelMap, { BuildType, PixelTile } from './pixelmap';
import { useWeb3React } from "@web3-react/core";
import Web3 from "web3";
import { keccak256 } from "web3-utils";
import { useBuildContract, useMintContract } from "../../hooks/useContract";
import CloseImg from '../../assets/images/close.png';
import LocationImg from '../../assets/images/pin_location.png';
import TypeImg from '../../assets/images/type.png';
import BuildTypeLeft from '../../assets/images/build-type-left.png';
import BuildTypeRight from '../../assets/images/build-type-right.png';
import BuildTypeHouse from '../../assets/images/build_type_house.jpg';
import BuildTypeMall from '../../assets/images/build_type_mall.jpg';
import BuildTypeCity from '../../assets/images/build_type_city.jpg';
import BuildTypeCountry from '../../assets/images/build_type_country.jpg';
import {
    TabHomeNormal,
    TabMapSelected,
    TabClaimNormal,
    HeaderView,
    publicConnectWallet,
    ToastStatus,
} from '../../components/components'
import { useTranslation, withTranslation } from 'react-i18next';

interface BuildTileObj {
    landID: string;
    /// 是否绘制, 目前没用这个字段, 全都绘制
    isDraw: boolean;
    /// X 坐标, 绘制到地图上需要转换
    locationX: number;
    /// Y 坐标, 绘制到地图上需要转换
    locationY: number;
    /// 宽度
    width: number;
    /// 高度
    height: number;
    /// 图片链接
    image: string;
    /// build 类型, 定的规则比较多, 也比较乱, 看代码吧
    buildType: number;
    /// 用户自己填的链接
    landURL: string;
    /// 用户自己填的 title
    landTitle: string;
    /// 想干啥就干啥的字段, 看代码吧
    extraStatus: number;
    /// 合作伙伴的 eventID
    eventID: number;
    eventName: string;
    eventRewards: number;
    eventType: number;
    eventMemo: string;
    projectName: string;
    startTime: number;
    endTime: number;
}

let publicBuildTypeStep = 0;
let publicBuildFee = 10;
var map: PixelMap;

const BuildView: React.FC<{}> = ({ }) => {

    const { t } = useTranslation();
    const { account } = useWeb3React();
    const buildContract = useBuildContract();
    const mintContract = useMintContract();

    useEffect(() => {

    }, [account]);

    const buildMap = () => {
        if (!account) {
            publicConnectWallet();
            return;
        }
        if (!map.selectedTile) {
            alert("Point selection is abnormal!");
            return;
        }
        window.$toast.show("Building....", ToastStatus.Info);
        mintContract.materialBalance(account).call().then((res: number) => {
            console.log("balanceOf = ", res);
            if (res < publicBuildFee) {
                window.$toast.showLink("材料不够, 请", ToastStatus.Error, "去poorland.io购买吧", "https://poorland.io/");
            } else {
                callBuild();
            }
        }).catch((err: any) => {
            window.$toast.showError(err);
        });
    }

    const callBuild = () => {
        // 第一个是mapIndex，固定1，
        // 第二个是 类型 BuildType
        // 第三第四 是逻辑坐标
        buildContract.build(
            1,
            currentBuildType(),
            map.selectedTile.locationX(),
            map.selectedTile.locationY()
        ).estimateGas({
            from: account,
            value: Web3.utils.toWei((0).toString(), 'ether')
        }, function (error: any, gas: number) {
            if (error) {
                return;
            }
            console.log("build gas: " + gas);
            buildContract.build(
                1,
                currentBuildType(),
                map.selectedTile.locationX(),
                map.selectedTile.locationY()
            ).send({
                from: account,
                gas: gas,
                value: Web3.utils.toWei((0).toString(), 'ether')
            }).then(function (ret: any) {
                console.log(ret);
                let transactionLink = EtherscanHost + ret.transactionHash;
                window.$toast.showLink("`Building` takes a few minutes", ToastStatus.Info, t("build.transaction.link.text"), transactionLink);
            }).catch(function (err: any) {
                window.$toast.showError(err);
            });
        }).catch((err: any) => {
            window.$toast.showError(err);
        });
    }

    /// 转换 buildTypeStep 得到 build 类型
    const currentBuildType = () => {
        switch (publicBuildTypeStep) {
            case 0:
                return BuildType.House;
            case 1:
                return BuildType.Mall;
            case 2:
                return BuildType.City;
            case 3:
                return BuildType.Country;
            default:
                break;
        }
    }

    return (
        <>
            <div className="map-button-div" onClick={() => { buildMap(); }}>Build fee: {publicBuildFee} Poorland Fragments</div>
        </>
    );
}

var addResultMap = new Map();

const WhitelistView: React.FC<{}> = ({ }) => {

    const { t } = useTranslation();
    const { account } = useWeb3React();
    const mintContract = useMintContract();
    const buildContract = useBuildContract();
    const [submitWhitelistLoading, setSubmitWhitelistLoading] = useState<boolean>(false);
    const [whitelistDialogOpen, setWhitelistDialogOpen] = useState<boolean>(false);
    const [submitLoading, setSubmitLoading] = useState<boolean>(false);
    const [submitTips, setSubmitTips] = useState<number>(0);
    const [myNFTList, setMyNFTList] = useState<Array<string>>([]);

    useEffect(() => {

    }, [account]);

    const submitWhitelistClick = () => {
        if (!account) {
            publicConnectWallet();
            return;
        }
        if (!map.selectedTile) {
            alert("Point selection is abnormal!");
            return;
        }
        setSubmitWhitelistLoading(true);
        buildContract.listMyNFT(account).call().then((res: Array<string>) => {
            if (res.length > 0) {
                setMyNFTList(res);
                setWhitelistDialogOpen(true);
            } else {
                window.$toast.show("You can't claim WL", ToastStatus.Info);
            }
        }).catch((err: any) => {
            window.$toast.showError(err);
            setSubmitWhitelistLoading(false);
        });
    }

    const submitClick = () => {
        if (!map.selectedTile) {
            alert("Point selection is abnormal!");
            setWhitelistDialogOpen(false);
            return;
        }
        if (addResultMap.size < myNFTList.length && submitTips === 0) {
            setSubmitTips(myNFTList.length - addResultMap.size);
            return;
        }
        setSubmitLoading(true);
        stringSign();
    }

    /// 获得签名
    const stringSign = async () => {
        if (!account) {
            publicConnectWallet();
            setSubmitLoading(false);
            setWhitelistDialogOpen(false);
            return;
        }
        if (!map.selectedTile) {
            alert("Point selection is abnormal!");
            setSubmitLoading(false);
            setWhitelistDialogOpen(false);
            return;
        }
        let signMsg: string = 'hello, poorland';
        await new Web3(window.ethereum).eth.personal.sign(signMsg, account, '', (error: Error, signature: string) => {
            if (error) {
                setSubmitLoading(false);
            } else {
                console.log("signature: ", signature);
                addWhitelist(signature);
            }
        });
    }

    const addWhitelist = (sign: string) => {
        if (!map.selectedTile) {
            alert("Point selection is abnormal!");
            setSubmitLoading(false);
            setWhitelistDialogOpen(false);
            return;
        }
        setSubmitTips(0);
        const landIds = new Array();
        const whitelist = new Array();
        console.log(addResultMap);
        addResultMap.forEach((value, key) => {
            console.log(value, key);
            landIds[key] = parseInt(myNFTList[key]);
            whitelist.push(value);
        });
        axios.post(ApiHost + '/thirdparty/whitelist/claim', {
            Address: account,
            Sign: sign,
            EventID: map.selectedTile.tileObj.eventID,
            LandIDs: landIds,
            WlAddress: whitelist
        }).then(response => {
            console.log(response.data)
            setWhitelistDialogOpen(false);
            setSubmitLoading(false);
            setSubmitWhitelistLoading(false);
            addResultMap.clear();
            window.$toast.show("Success", ToastStatus.Success);
        }).catch(function (error) {
            window.$toast.showError(error);
            setSubmitLoading(false);
        });
    }

    const handleWhitelistDialogClose = () => {
        setWhitelistDialogOpen(false);
        setSubmitWhitelistLoading(false);
    }

    return (
        <>
            <Dialog onClose={handleWhitelistDialogClose} open={whitelistDialogOpen}>
                <Stack className='land-info-dialog-content' direction="column" justifyContent="flex-start" alignItems="center" spacing={0}>
                    <div className='whitelist-dialog-title'>You have {myNFTList.length} buildings, so you can submit {myNFTList.length} whitelists</div>
                    {
                        myNFTList.map((item: string, index) => (
                            <div className='whitelist-row' key={index}>
                                <div className='whitelist-row-title'>{item}</div>
                                <TextField sx={{
                                    width: '360px',
                                    borderRadius: '4px',
                                    color: 'white',
                                    fontSize: '14px',
                                    marginTop: '10px',
                                    '& .MuiOutlinedInput-root': {
                                        border: '1px solid rgba(255,255,255,0.3)',
                                        '& .MuiOutlinedInput-input': {
                                            color: 'white',
                                            fontSize: '14px'
                                        },
                                        "&.Mui-focused fieldset": {
                                            borderColor: 'rgba(255,255,255,0.6)'
                                        }
                                    },
                                }} label="" variant="outlined" onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                                    setSubmitTips(0);
                                    if (event.target.value !== null) {
                                        addResultMap.set(index, event.target.value);
                                    } else {
                                        addResultMap.delete(index);
                                    }
                                    console.log(addResultMap);
                                }} />
                            </div>
                        ))
                    }
                    {submitTips > 0 && <div className='whitelist-tips'>You can submit whitelists only once, and you can submit {submitTips} more(or it'll be wasted). Are you sure to submit it now?</div>}
                    <LoadingButton variant="contained" loading={submitLoading}
                        sx={{
                            color: '#333333',
                            backgroundColor: 'white',
                            width: '100px',
                            height: '35px',
                            textAlign: 'center',
                            fontSize: '16px',
                            lineHeight: '50px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            textTransform: 'initial',
                            marginTop: '20px',
                            marginBottom: '20px',
                            ':hover': {
                                backgroundColor: 'white',
                                color: '#333333',
                            },
                            '& .MuiLoadingButton-loadingIndicator': {
                                color: 'white'
                            }
                        }}
                        onClick={() => { submitClick() }}
                    >
                        Submit
                    </LoadingButton>
                </Stack>
            </Dialog>
            <LoadingButton variant="contained" loading={submitWhitelistLoading}
                sx={{
                    color: 'white',
                    backgroundColor: '#282828',
                    width: '350px',
                    height: '50px',
                    textAlign: 'center',
                    fontSize: '16px',
                    lineHeight: '50px',
                    borderRadius: '4px',
                    border: '1px solid #FFFFFF',
                    marginTop: '40px',
                    marginLeft: '20px',
                    cursor: 'pointer',
                    textTransform: 'initial',
                    ':hover': {
                        backgroundColor: '#282828',
                        color: 'white',
                    },
                    '& .MuiLoadingButton-loadingIndicator': {
                        color: 'white'
                    }
                }}
                onClick={() => { submitWhitelistClick() }}
            >
                Submit whitelist
            </LoadingButton>
        </>
    );
}

declare const window: Window & { ethereum: any, web3: any };

const UploadImageView: React.FC<{}> = () => {

    const { t } = useTranslation();
    const { account } = useWeb3React();
    const [uploadLoading, setUploadLoading] = useState<boolean>(false);
    const [landInfoDialogOpen, setLandInfoDialogOpen] = useState<boolean>(false);
    const [landInfoName, setLandInfoName] = useState<string>('');
    const [landInfoUrl, setLandInfoUrl] = useState<string>('');
    const [selectedFile, setSelectedFile] = useState<any | null>(null);

    useEffect(() => {

    }, [account]);

    const updateLandInfo = () => {
        if (!account) {
            publicConnectWallet();
            return;
        }
        setLandInfoDialogOpen(true);
    }

    const handleImageChange = (e: any) => {
        e.preventDefault();

        var reader = new FileReader();
        var file = e.target.files[0];
        if (!file) {
            return;
        }
        console.log("handleImageChange file:", file);
        if (file.type !== 'image/jpeg' && file.type !== 'image/jpg') {
            alert('Only support JPEG & JPG!');
            return;
        }
        reader.onloadend = (event) => {
            setSelectedFile(file);
            document.getElementById("land-info-diglog-upload-img")!.style.backgroundImage = `url('${event.target!.result}')`;
        }

        reader.readAsDataURL(file)
    }

    const uploadImageClick = () => {
        let input: HTMLInputElement = document.getElementById("upload-file-input") as HTMLInputElement;
        input!.click();
    }

    const confirmClick = () => {
        if (!selectedFile) {
            window.$toast.show("No image", ToastStatus.Error);
            return;
        }
        uploadImage(selectedFile);
    }

    const uploadImage = (imageFile: any) => {
        if (!map.selectedTile) {
            alert("Point selection is abnormal!");
            return;
        }
        setUploadLoading(true);
        /* eslint-disable no-undef */
        let param = new FormData(); // 创建form对象
        param.append('image', imageFile, imageFile.name); // 通过append向form对象添加数据
        let config = {
            headers: { 'Content-Type': 'multipart/form-data' }
        }
        // 添加请求头
        axios.post(ApiHost + '/upload/image', param, config)
            .then(response => {
                console.log(response.data)
                imagePathSign(response.data);
            }).catch(function (error) {
                setUploadLoading(false);
                window.$toast.showError(error);
            });
    }

    /// 使用钱包对图片路径签名，获得签名内容
    const imagePathSign = async (imagePath: any) => {
        if (!account) {
            publicConnectWallet();
            setUploadLoading(false);
            return;
        }
        if (!map.selectedTile) {
            alert("Point selection is abnormal!");
            setUploadLoading(false);
            return;
        }
        let signMsg: any = keccak256(btoa(imagePath));
        await new Web3(window.ethereum).eth.personal.sign(signMsg, account, '', (error: Error, signature: string) => {
            if (error) {
                setUploadLoading(false);
            } else {
                console.log("signature: ", signature);
                updateNFTImage(signature, btoa(imagePath), imagePath);
            }
        });
    }

    /// 调用服务器接口，更新NFT图片
    const updateNFTImage = (signature: any, pathEncode: any, path: any) => {
        if (!map.selectedTile) {
            alert("Point selection is abnormal!");
            setUploadLoading(false);
            return;
        }
        console.log('LandCover: ', pathEncode);
        let NFTData = map.markMap.get(map.selectedTile.markKey);
        console.log('NFTData: ', NFTData, landInfoName, landInfoUrl);
        axios.get(ApiHost + '/land/update', {
            params: {
                Address: account,
                LandID: NFTData.landID,
                Sign: signature,
                LandCover: pathEncode,
                LandTitle: landInfoName,
                LandURL: landInfoUrl
            }
        }).then(response => {
            console.log(response.data)
            setLandInfoDialogOpen(false);
            // 上传完成, 更新对应位置的图片
            map.updateSelectedTileImage(path, landInfoName, landInfoUrl);
            setUploadLoading(false);
        }).catch(function (error) {
            window.$toast.showError(error);
            setUploadLoading(false);
        });
    }

    const handleLandInfoDialogClose = () => {
        setLandInfoDialogOpen(false);
    }

    const handleLandInfoNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLandInfoName(event.target.value);
    }

    const handleLandInfoUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setLandInfoUrl(event.target.value);
    }

    const UpdateButton = styled(LoadingButton)({
        width: '120px',
        height: '32px',
        textAlign: 'center',
        boxShadow: 'none',
        textTransform: 'none',
        color: '#333333',
        borderRadius: 4,
        border: '1px solid #FFFFFF',
        borderColor: 'white',
        backgroundColor: 'white',
        marginTop: '20px',
        marginBottom: '24px',
        cursor: 'pointer',
        '&:hover': {
            backgroundColor: 'white',
            borderRadius: 4,
            border: '1px solid #FFFFFF',
            borderColor: 'white',
            boxShadow: 'none',
            color: '#333333'
        },
        '&:active': {
            backgroundColor: 'white',
            borderRadius: 4,
            border: '1px solid #FFFFFF',
            borderColor: 'white',
            boxShadow: 'none',
            color: '#333333'
        },
        '&:disabled': {
            backgroundColor: 'white',
            borderRadius: 4,
            border: '1px solid #FFFFFF',
            borderColor: 'white',
            boxShadow: 'none',
            color: '#333333'
        },
        '& .MuiLoadingButton-loadingIndicator': {
            color: '#333333'
        }
    });

    return (
        <>
            <Dialog onClose={handleLandInfoDialogClose} open={landInfoDialogOpen}>
                <Stack className='land-info-dialog-content' direction="column" justifyContent="flex-start" alignItems="center" spacing={0}>
                    <div className='land-info-dialog-title'>Edit</div>
                    <Stack className='land-info-dialog-stack-row' direction="row" justifyContent="center" alignItems="flex-start" spacing={0}>
                        <div className='land-info-dialog-item-title'>Name:</div>
                        <TextField sx={{
                            width: '360px',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '14px',
                            '& .MuiOutlinedInput-root': {
                                border: '1px solid rgba(255,255,255,0.3)',
                                '& .MuiOutlinedInput-input': {
                                    color: 'white'
                                },
                                "&.Mui-focused fieldset": {
                                    borderColor: 'rgba(255,255,255,0.6)'
                                }
                            },
                        }} label="" variant="outlined" value={landInfoName} onChange={handleLandInfoNameChange} />
                    </Stack>
                    <Stack className='land-info-dialog-stack-row' direction="row" justifyContent="center" alignItems="flex-start" spacing={0}>
                        <div className='land-info-dialog-item-title'>Image:</div>
                        <div onClick={() => { uploadImageClick(); }} id='land-info-diglog-upload-img'>
                            <input accept="image/*" type="file" id="upload-file-input" onChange={(e) => handleImageChange(e)} />
                        </div>
                    </Stack>
                    <Stack className='land-info-dialog-stack-row' direction="row" justifyContent="center" alignItems="flex-start" spacing={0}>
                        <div className='land-info-dialog-item-title'>URL:</div>
                        <TextField sx={{
                            width: '360px',
                            borderRadius: '4px',
                            color: 'white',
                            fontSize: '14px',
                            '& .MuiOutlinedInput-root': {
                                border: '1px solid rgba(255,255,255,0.3)',
                                '& .MuiOutlinedInput-input': {
                                    color: 'white'
                                },
                                "&.Mui-focused fieldset": {
                                    borderColor: 'rgba(255,255,255,0.6)'
                                }
                            },
                        }} label="" variant="outlined" value={landInfoUrl} onChange={handleLandInfoUrlChange} />
                    </Stack>
                    <UpdateButton onClick={() => { confirmClick(); }} loading={uploadLoading} loadingPosition="center" variant="outlined">
                        {!uploadLoading && <div className='land-info-dialog-confirm-text'>Confirm</div>}
                    </UpdateButton>
                </Stack>
            </Dialog>
            <div className='map-button-div' onClick={() => { updateLandInfo(); }}>Update land info</div>
        </>
    );
}

class TugouPixelMap extends React.Component<any, any> {

    constructor(props: any) {
        super(props);
        this.state = {
            buildType: BuildType.Normal,
            buildTypePlaceholderImage: BuildTypeHouse,
            buildFee: 10,
            buildTypeString: '',
            sliderValue: 10,
            drawerDesc: '',
            locationString: '',
            buildImageUrl: null,
            uploadDisplayStatus: false,
            drawerOpen: false,
            selectedTileObj: null,
            buildTypeStep: 0,
            buildAreaString: '3x3',
            imageFile: null,
            imageUploadedPath: null,
            linkTipsAlertOpen: false,
            landTargetLink: ''
        };
        map = new PixelMap(this);
    }

    componentDidMount() {
        // 在地图页把 body 和 html 的 overflow 设为 hidden
        let bodyStyle = document.body.style
        let htmlStyle = document.getElementsByTagName('html')[0].style
        bodyStyle.overflow = `hidden`
        htmlStyle.overflow = `hidden`
        this.requestMapData();
    }

    componentDidUpdate() {

    }

    showDrawer(tile: PixelTile) {
        let locationString = tile.locationX() + ", " + tile.locationY();
        let buildTypeString = this.currentBuildTypeString(tile.buildType);
        this.setState({
            // 先执行一次 buildImageUrl 赋空, 防止下边赋值的 imageUrl 加载不出来时显示上一次的图片
            buildImageUrl: null,
        });
        let placeholderImage = BuildTypeHouse;
        switch (tile.buildType) {
            case BuildType.House:
                placeholderImage = BuildTypeHouse;
                break;
            case BuildType.Mall:
                placeholderImage = BuildTypeMall;
                break;
            case BuildType.City:
                placeholderImage = BuildTypeCity;
                break;
            case BuildType.Country:
                placeholderImage = BuildTypeCountry;
                break

            default:
                break;
        }
        var account = window.web3.currentProvider.selectedAddress;
        this.setState({
            selectedTileObj: tile.tileObj,
            buildType: tile.buildType,
            buildTypePlaceholderImage: placeholderImage,
            buildTypeString: buildTypeString,
            locationString: locationString,
            drawerDesc: tile.desc,
            buildImageUrl: tile.tileObj ? tile.tileObj.image : null,
            uploadDisplayStatus: tile.ownerAddress !== null && account !== null && tile.ownerAddress.toLowerCase() === account.toLowerCase(),
            drawerOpen: true
        });
    }

    drawerUploadDisplayStatus(tile: PixelTile) {
        var account = window.web3.currentProvider.selectedAddress;
        this.setState({ uploadDisplayStatus: tile.ownerAddress !== null && account !== null && tile.ownerAddress.toLowerCase() === account.toLowerCase() });
    }

    updateBuildImageUrl(path: string) {
        this.setState({
            buildImageUrl: path ? path : null
        });
    }

    showLinkTipsAlert(link: string) {
        console.log('showLinkTipsAlert:', link);
        this.setState({ landTargetLink: link, linkTipsAlertOpen: true });
    }

    handleLinkTipsAlertClose() {
        this.setState({ linkTipsAlertOpen: false });
    }

    landLinkClick() {
        this.setState({ linkTipsAlertOpen: false });
        window.open(this.state.landTargetLink, "_blank");
    }

    currentBuildTypeString(type: number) {
        switch (type) {
            case BuildType.House:
                return "House";
            case BuildType.Mall:
                return "Mall";
            case BuildType.City:
                return "City";
            case BuildType.Country:
                return "Country";

            default:
                return "";
        }
    }

    closeDrawer() {
        this.setState({ drawerOpen: false });
    }

    handleSliderChange = (event: Event, newValue: number | number[]) => {
        if (newValue === 100) {
            map.sliderMapZoom(2.0);
        } else if (newValue === 0) {
            map.sliderMapZoom(0.5);
        } else {
            let value = (newValue as number) * 0.015;
            map.sliderMapZoom(0.5 + value);
        }
    };

    updateSliderValue(newValue: number) {
        if (newValue === 2.0) {
            this.setState({ sliderValue: 100 });
        } else if (newValue === 0.5) {
            this.setState({ sliderValue: 0 });
        } else {
            let targetValue = (newValue - 0.5) / 0.015;
            this.setState({ sliderValue: targetValue });
        }
    }

    requestMapData() {
        axios.get(ApiHost + '/land/info?Land=1')
            .then((response: any) => {
                // console.info('response=', response);
                console.log(response.data.body.buildings);
                map.drawChildren(response.data.body.buildings);
            })
            .catch(function (error) {
                console.log(error);
            })
    }

    buildStepAdd(value: number) {
        let newStep = this.state.buildTypeStep + value;
        if (newStep > 3) {
            newStep = 3;
        }
        if (newStep < 0) {
            newStep = 0;
        }
        publicBuildTypeStep = newStep;
        let tmpBuildAreaString = '3x3';
        let tmpBuildFee = 10;
        let coverViewSize = 3;
        switch (newStep) {
            case 0:
                tmpBuildAreaString = '3x3';
                tmpBuildFee = 10;
                coverViewSize = 3;
                break;
            case 1:
                tmpBuildAreaString = '10x10';
                tmpBuildFee = 100;
                coverViewSize = 10;
                break;
            case 2:
                tmpBuildAreaString = '32x32';
                tmpBuildFee = 1000;
                coverViewSize = 32;
                break;
            case 3:
                tmpBuildAreaString = '50x50';
                tmpBuildFee = 10000;
                coverViewSize = 50;
                break;
            default:
                break;
        }
        publicBuildFee = tmpBuildFee;
        this.setState({ buildTypeStep: newStep, buildAreaString: tmpBuildAreaString, buildFee: tmpBuildFee });
        map.updateCoverView(coverViewSize);
    }

    currentBuildAreaSize() {
        switch (this.state.buildTypeStep) {
            case 0:
                return 3;
            case 1:
                return 10;
            case 2:
                return 32;
            case 3:
                return 50;
            default:
                break;
        }
    }

    MinimapSlider = styled(Slider)({
        color: '#ffffff',
        '& .MuiSlider-thumb': {
            '&:focus, &:hover, &.Mui-active, &.Mui-focusVisible': {
                boxShadow: 'inherit',
            },
        },

    });

    render() {
        const { t } = this.props;
        return (
            <>
                <Dialog onClose={() => { this.handleLinkTipsAlertClose() }} open={this.state.linkTipsAlertOpen}>
                    <Stack className='land-link-tips-dialog-content' direction="column" justifyContent="flex-start" alignItems="center" spacing={0}>
                        <div className='land-link-tips-dialog-title'>{t("map.link.jump.tips")}</div>
                        <a className='land-link-tips-a' onClick={() => { this.landLinkClick() }}>{this.state.landTargetLink}</a>
                    </Stack>
                </Dialog>
                <div className='page-content'>
                    <canvas id='map-animation-cover-view'></canvas>
                    <Stack
                        className='mini-map-stack'
                        direction="row"
                        justifyContent="flex-start"
                        alignItems="flex-start"
                        spacing={0}
                    >
                        <div id='mini-map'></div>
                        <this.MinimapSlider
                            aria-label="Temperature"
                            orientation="vertical"
                            value={this.state.sliderValue}
                            onChange={this.handleSliderChange}
                        />
                    </Stack>
                    <Stack direction="row" justifyContent="flex-start" alignItems="flex-start" spacing={0} >
                        <Stack className='page-stack' direction="column" justifyContent="flex-start" alignItems="flex-start" spacing={0}>
                            <HeaderView />
                            <Stack className='page-map-row-stack' direction="row" justifyContent="flex-start" alignItems="flex-start" spacing={0}>
                                <Stack className='map-action-group-stack' direction="column" justifyContent="flex-start" alignItems="center" spacing={0}>
                                    <TabHomeNormal />
                                    <TabMapSelected />
                                    <TabClaimNormal />
                                </Stack>
                                <div id='tugou-pixel-map'></div>
                            </Stack>
                        </Stack>
                        {/* 普通 Drawer */}
                        <Drawer sx={{
                            zIndex: 1001,
                            width: 390,
                            height: '100vh',
                            flexShrink: 0,
                            '& .MuiDrawer-paper': {
                                width: 390,
                                height: '100vh',
                                backgroundColor: '#282828'
                            },
                            backgroundColor: '#282828'
                        }}
                            variant="persistent"
                            anchor="right"
                            open={this.state.drawerOpen && this.state.buildType !== BuildType.Normal}
                        >
                            <Stack className='page-drawer-stack' direction="column" justifyContent="flex-start" alignItems="flex-start" spacing={0}>
                                <Stack className='close-stack' direction="row" justifyContent="flex-end" alignItems="flex-start" spacing={0} >
                                    <div className='close-div' onClick={() => { this.setState({ drawerOpen: false }); }}>
                                        <img className='close-img' src={CloseImg} alt='' />
                                    </div>
                                </Stack>
                                <img className='house-image' src={this.state.buildImageUrl ? this.state.buildImageUrl : this.state.buildTypePlaceholderImage} alt='' />
                                <div className={this.state.drawerDesc ? 'hose-name hose-name-has-desc' : 'hose-name'}>Poor Land {this.state.buildTypeString}</div>
                                {this.state.drawerDesc && <div className='house-desc'>{this.state.drawerDesc}</div>}
                                <Stack direction="row" justifyContent="flex-start" alignItems="center" spacing={0}>
                                    <img className='property-icon perperty-icon-location' src={LocationImg} alt='' />
                                    <div className='property-name'>Coordinate</div>

                                </Stack>
                                <div className='property-value'>{this.state.locationString}</div>
                                <Stack className='perperty-type-stack' direction="row" justifyContent="flex-start" alignItems="center" spacing={0}>
                                    <img className='property-icon perperty-icon-type' src={TypeImg} alt='' />
                                    <div className='property-name'>{t("map.drawer.Type")}</div>
                                </Stack>
                                <div className='property-value'>{this.state.buildTypeString}</div>
                                {this.state.uploadDisplayStatus && <UploadImageView />}
                                <div className="map-button-div" onClick={() => window.open('/#/house', '_blank')}>Enter</div>
                                {
                                    this.state.selectedTileObj !== undefined && this.state.selectedTileObj !== null && this.state.selectedTileObj.eventID != undefined && this.state.selectedTileObj.eventID > 0 && this.state.selectedTileObj.eventType === 1
                                    &&
                                    <WhitelistView />
                                }
                            </Stack>

                        </Drawer>
                        {/* build 的 Drawer */}
                        <Drawer sx={{
                            zIndex: 1001,
                            width: 390,
                            height: '100vh',
                            flexShrink: 0,
                            '& .MuiDrawer-paper': {
                                width: 390,
                                height: '100vh',
                                backgroundColor: '#282828'
                            },
                            backgroundColor: '#282828'
                        }}
                            variant="persistent"
                            anchor="right"
                            open={this.state.drawerOpen && this.state.buildType === BuildType.Normal}
                        >
                            <Stack className='page-drawer-stack' direction="column" justifyContent="flex-start" alignItems="flex-start" spacing={0}>
                                <Stack className='close-stack' direction="row" justifyContent="flex-end" alignItems="flex-start" spacing={0} >
                                    <div className='close-div' onClick={() => { this.setState({ drawerOpen: false }); }}>
                                        <img className='close-img' src={CloseImg} alt='' />
                                    </div>
                                </Stack>
                                <div className='property-name property-name-no-icon'>{t("map.drawer.Type")}</div>
                                <Stack className='build-type-content' direction="column" justifyContent="flex-start" alignItems="center" spacing={0} >
                                    <Stack direction="row" justifyContent="center" alignItems="center" spacing={0} >
                                        <div className='build-type-left-right-action' onClick={() => { this.buildStepAdd(-1); }}>
                                            <img className='build-type-left-right-action-img' src={BuildTypeLeft} alt="" />
                                        </div>
                                        <SwipeableViews index={this.state.buildTypeStep} className='build-type-swipeable-views'>
                                            <Stack className='build-type-image-content-stack' direction="column" justifyContent="flex-start" alignItems="center" spacing={0} >
                                                <div className='build-type-image-content-title'>House</div>
                                                <div className='build-type-image-content-div'>
                                                    <img className='build-type-image-content-img' src={BuildTypeHouse} alt="" />
                                                </div>
                                            </Stack>
                                            <Stack className='build-type-image-content-stack' direction="column" justifyContent="flex-start" alignItems="center" spacing={0} >
                                                <div className='build-type-image-content-title'>Mall</div>
                                                <div className='build-type-image-content-div'>
                                                    <img className='build-type-image-content-img' src={BuildTypeMall} alt="" />
                                                </div>
                                            </Stack>
                                            <Stack className='build-type-image-content-stack' direction="column" justifyContent="flex-start" alignItems="center" spacing={0} >
                                                <div className='build-type-image-content-title'>City</div>
                                                <div className='build-type-image-content-div'>
                                                    <img className='build-type-image-content-img' src={BuildTypeCity} alt="" />
                                                </div>
                                            </Stack>
                                            <Stack className='build-type-image-content-stack' direction="column" justifyContent="flex-start" alignItems="center" spacing={0} >
                                                <div className='build-type-image-content-title'>Country</div>
                                                <div className='build-type-image-content-div'>
                                                    <img className='build-type-image-content-img' src={BuildTypeCountry} alt="" />
                                                </div>
                                            </Stack>
                                        </SwipeableViews>
                                        <div className='build-type-left-right-action' onClick={() => { this.buildStepAdd(1); }}>
                                            <img className='build-type-left-right-action-img' src={BuildTypeRight} alt="" />
                                        </div>
                                    </Stack>
                                    <MobileStepper
                                        sx={{
                                            bgcolor: '#322b1c',
                                            maxWidth: 400,
                                            flexGrow: 1,
                                            '& .MuiMobileStepper-dot': {
                                                bgcolor: '#6f6b60',
                                            },
                                            '& .MuiMobileStepper-dotActive': {
                                                bgcolor: 'white',
                                            },
                                        }}
                                        variant="dots" steps={4} position="static"
                                        activeStep={this.state.buildTypeStep} nextButton={null} backButton={null} />
                                </Stack>
                                <div className='property-name property-name-no-icon'>Starting Coordinate</div>
                                <div className='property-value'>{this.state.locationString}</div>
                                <div className='property-name property-name-no-icon'>Area</div>
                                <div className='property-value'>{this.state.buildAreaString}</div>
                                <BuildView />
                            </Stack>

                        </Drawer>
                    </Stack>

                </div>
            </>
        );
    }
}

export default withTranslation()(TugouPixelMap);