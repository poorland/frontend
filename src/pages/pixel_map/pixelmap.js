import * as PIXI from 'pixi.js';
import { TextMetrics, TextStyle } from 'pixi.js';
import * as PIXIEVENTS from '@pixi/events';
import { Viewport } from 'pixi-viewport'
import axios from "axios";
import Web3 from 'web3';
import { BuildAddress } from '../../abis/abiAddress'
import { abi as BuildABI } from '../../abis/PoorLandMetaverse.json';
import AnimationCover from './animationCover.js';

// PIXI 示例: https://pixijs.io/examples/#/demos-basic/container.js
// PIXI viewport 文档: https://davidfig.github.io/pixi-viewport/jsdoc/Viewport.html#toScreen

let size = 20;
let space = 2;
// 初始世界宽高
let baseWorldLengthX = 225;
let baseWorldLengthY = 225;
// 上右下左扩充尺寸
let expansionTop = 0;
let expansionLeft = 0;
let expansionBottom = 225;
let expansionRight = 225;
let worldLengthX = baseWorldLengthX + expansionLeft + expansionRight;
let worldLengthY = baseWorldLengthY + expansionTop + expansionBottom;

// 九宫格画线时基准位置
let lineStep = 6;
/// 线宽
let lineWidth = 1;

export const BuildType = {
    Normal: 0,
    House: 11,
    Mall: 21,
    City: 31,
    Country: 40
}

// 是否覆盖动画
export const AnimationCoverStatus = {
    None: 0,
    W: 10
}

export class PixelTile {

    constructor(delegate, x, y, width, height, indexX, indexY, desc, tileObj) {
        this.delegate = delegate;
        // 这里的 x,y 是像素值 
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        // indexX, indexY 是以左上角为原点的索引
        this.indexX = indexX;
        this.indexY = indexY;
        this.buildType = BuildType.Normal;
        this.desc = desc;
        // 把自己在 markMap 中的 key 记录下来, 方便从地图 markMap 里边取服务端的数据
        this.markKey = '';
        this.tileObj = tileObj;
        this.ownerAddress = null;
        // 是否被 add 在 viewport 上
        this.inViewport = false;
    }

    queryOwnerAddress() {
        if (!this.tileObj || !this.tileObj.landID || this.ownerAddress !== null) {
            return;
        }
        var web3 = new Web3(Web3.givenProvider);
        var myContract = new web3.eth.Contract(BuildABI, BuildAddress);
        myContract.methods.ownerOf(this.tileObj.landID).call().then((res) => {
            console.log("ownerAddress =", res);
            this.ownerAddress = res;
            this.delegate.updateTileDrawerUploadDisplayStatus(this);
        }).catch((err) => {

        });
    }

    drawSelf() {
        this.graphics = new PIXI.Graphics();
        this.graphics.beginFill(0x898176, 0.5);
        this.graphics.drawRect(this.x, this.y, this.width, this.height);
        this.graphics.endFill();
        this.graphics.interactive = true;
        this.graphics.addEventListener('click', (e) => {
            this.delegate.tileAction(this);
            this.queryOwnerAddress();
        });
    }

    reset() {
        this.graphics.clear();
        this.graphics.beginFill(0x898176, 0.5);
        this.graphics.drawRect(this.x, this.y, this.width, this.height);
        this.graphics.endFill();
        this.highlightMark = false;
    }

    highlight() {
        this.graphics.clear();
        this.graphics.beginFill(0xffffff, 0.5);
        this.graphics.drawRect(this.x, this.y, this.width, this.height);
        this.graphics.endFill();
        this.highlightMark = true;
    }

    /// 传给合约的坐标, 以中心为原点转换
    locationX() {
        // 计算初始世界的 center
        let baseCenterX = parseInt(baseWorldLengthX * 0.5);
        // 按照扩充方向, 往右边和下边扩充不用管, 把 center 做偏移
        let centerX = baseCenterX + expansionLeft;
        let result = this.indexX - centerX;
        return result;
    }

    locationY() {
        // 计算初始世界的 center
        let baseCenterY = parseInt(baseWorldLengthY * 0.5);
        // 按照扩充方向, 往右边和下边扩充不用管, 把 center 做偏移
        let centerY = baseCenterY + expansionTop;
        let result = -(this.indexY - centerY);
        return result;
    }

}

export default class PixelMap {

    app;
    viewport;
    minimapViewport;
    markMap;
    ignoreSet;
    /// 普通方格储存数组
    normalGridList;
    // 遮罩
    coverView;
    // 动画遮罩
    animationCoverView;
    animationCover;

    minimapBaseWidth = 200;
    minimapBaseHeight = 200;
    minimapExpansionWidth = 0;
    minimapExpansionHeight = 0;
    minimapWidth = this.minimapBaseWidth + this.minimapExpansionWidth;
    minimapHeight = this.minimapBaseHeight + this.minimapExpansionHeight;
    worldWidth = (size + space) * worldLengthX;
    worldHeight = (size + space) * worldLengthY;
    minimapScale = this.minimapWidth / this.worldWidth;

    constructor(delegate) {
        this.delegate = delegate;
        this.normalGridList = new Array();
    }

    drawChildren(buildings) {
        console.log('worldSize:', this.worldWidth, this.worldHeight, this.minimapScale);
        this.animationCoverView = document.getElementById('map-animation-cover-view');
        this.animationCover = new AnimationCover();
        const container = document.getElementById('tugou-pixel-map');
        this.app = new PIXI.Application({ width: window.innerWidth - 80, height: window.innerHeight - 80, backgroundColor: 0x333333, backgroundAlpha: 0 });
        this.app.stage.interactive = true;
        this.app.stage.hitArea = this.app.renderer.screen;
        container.appendChild(this.app.view);

        this.viewport = new Viewport({
            screenWidth: window.innerWidth - 80,
            screenHeight: window.innerHeight - 80,
            worldWidth: this.worldWidth,
            worldHeight: this.worldHeight,

            interaction: this.app.renderer.plugins.interaction // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
        })
        this.app.stage.addChild(this.viewport)
        this.viewport.drag().pinch().wheel().decelerate()
        this.viewport.clampZoom({
            minScale: 0.5,
            maxScale: 2.0
        })

        // 红色 debug view
        // const graphics = new PIXI.Graphics();
        // graphics.beginFill(0xd73136, 0.3);
        // graphics.drawRect(0, 0, this.worldWidth, this.worldHeight);
        // graphics.endFill();
        // this.viewport.addChild(graphics);

        this.ignoreSet = new Set();
        // 从服务端的 list 中编辑得到对应的 map 结构
        this.markMap = new Map();
        if (buildings && buildings.length > 0) {
            // 服务端的 locationX 和 locationY 是以中心为原点, 在地图绘制时需要转换为以左上角为原点
            // 计算初始世界的 center
            let baseCenterX = parseInt(baseWorldLengthX * 0.5);
            let baseCenterY = parseInt(baseWorldLengthY * 0.5);
            // 按照扩充方向, 往右边和下边扩充不用管, 把 center 做偏移
            let centerX = baseCenterX + expansionLeft;
            let centerY = baseCenterY + expansionTop;
            // console.log('centerX, centerY:', centerX, centerY);
            buildings.forEach((item) => {
                let x = centerX + item.locationX;
                let y = centerY - item.locationY;
                let key = x + ',' + y;
                this.markMap.set(key, item);
                // 以 x,y 为基准点, 遍历一遍得到被顶替掉的位置
                for (var i = y; i < y + item.height; i++) {
                    for (var j = x; j < x + item.width; j++) {
                        if (i === y && j === x) {
                            continue;
                        }
                        this.ignoreSet.add(j + "," + i);
                    }
                }
            })
        }

        // 开始绘制地图
        for (var i = 0; i < worldLengthY; i++) {
            for (var j = 0; j < worldLengthX; j++) {
                // 这里的 x,y 是像素值
                let x = space + (size + space) * j;
                let y = space + (size + space) * i;
                let locString = j + "," + i;
                if (this.ignoreSet.has(locString)) {
                    continue;
                }
                if (this.markMap.has(locString)) {
                    // markMap has 这个位置, 表示这个位置已经被 build
                    let tileObj = this.markMap.get(locString);
                    if (!tileObj.isDraw) {
                        continue;
                    }
                    let tmpWidth = tileObj.width * size + (tileObj.width - 1) * space;
                    let tmpHeight = tileObj.height * size + (tileObj.height - 1) * space;
                    const tile = new PixelTile(this, x, y, tmpWidth, tmpHeight, j, i, tileObj.description, tileObj);
                    tile.buildType = tileObj.buildType;
                    tile.markKey = locString;
                    tile.drawSelf();
                    this.viewport.addChild(tile.graphics);
                    // 已经被 build 过的可能存在图片
                    if (tileObj.image) {
                        axios.get(tileObj.image, {
                            responseType: 'arraybuffer'
                        }).then(response => {
                            return 'data:image/png;base64,' + btoa(new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), ''));
                        }).then(data => {
                            this.base64ToImage(data, (img) => {
                                const bunny = PIXI.Sprite.from(img);
                                bunny.x = x + space;
                                bunny.y = y + space;
                                bunny.width = tmpWidth - space * 2;
                                bunny.height = tmpHeight - space * 2;
                                this.viewport.addChild(bunny);
                                // 绘制完图片, 检查是否需要绘制 landTitle or landURL
                                this.drawNameAndLink(tileObj.landTitle, tileObj.landURL, bunny, tileObj);
                            });
                        });
                    }

                } else {
                    // 没有被 build, 就画一个普通方格
                    const tile = new PixelTile(this, x, y, size, size, j, i);
                    this.normalGridList.push(tile);
                    tile.drawSelf();
                    this.drawNormalTile(tile);
                }
            }
        }

        // this.takeScreenshot();
        this.drawMinimap();
        this.mapEvent();

    }

    base64ToImage(base64img, callback) {
        var img = new Image();
        img.onload = function () {
            callback(img);
        };
        img.src = base64img;
    }

    sliderMapZoom(scale) {
        this.viewport.setZoom(scale, true);
    }

    updateTileDrawerUploadDisplayStatus(tile) {
        if (tile.landID !== this.selectedTile.landID) {
            return;
        }
        this.delegate.drawerUploadDisplayStatus(tile);
    }

    checkAllNormalTile() {
        for (const tile of this.normalGridList) {
            this.drawNormalTile(tile);
        }
        // 处理完小方块之后, 检查目前是否有 build 辅助遮罩, 如果有就删掉重新加一次, 避免被后加的小方块盖住
        if (this.coverView) {
            this.viewport.removeChild(this.coverView);
            this.viewport.addChild(this.coverView);
        }
    }

    // 绘制普通 tile 的方法, 判断该 tile 当前是否显示
    drawNormalTile(tile) {
        const currentScreen = this.viewport.getVisibleBounds();
        if (tile.x + tile.width > currentScreen.x &&
            currentScreen.x + currentScreen.width > tile.x &&
            tile.y + tile.height > currentScreen.y &&
            currentScreen.y + currentScreen.height > tile.y
        ) {
            // 在 VisibleBounds 的范围内
            if (!tile.inViewport) {
                this.viewport.addChild(tile.graphics);
                tile.inViewport = true;
            }
        } else if (tile.inViewport) {
            this.viewport.removeChild(tile.graphics);
            tile.inViewport = false;
        }
    }

    tileAction(tile) {
        if (this.selectedTile && this.selectedTile === tile) {
            return;
            // 重复点击的时候还是保持选中, 不清除
            // this.selectedTile.reset();
            // this.selectedTile = null;
            // // 移除遮罩动画
            // this.removeAnimationCover();
        } else {
            if (this.selectedTile) {
                this.selectedTile.reset();
            }
            tile.highlight();
            this.selectedTile = tile;
            if (tile.tileObj && tile.tileObj.extraStatus && (tile.tileObj.extraStatus >= 1 && tile.tileObj.extraStatus <= 10)) {
                this.addAnimationCover();
            } else {
                this.removeAnimationCover();
            }
            this.delegate.showDrawer(tile);
        }
        if (tile.buildType === BuildType.Normal) {
            this.viewport.removeChild(this.coverView);
            // 如果选择的是未 build 的, 绘制一下遮罩
            this.addCoverViewWithTile(tile);
        } else {
            this.viewport.removeChild(this.coverView);
            this.coverView = null;
        }
        // console.log(this.viewport.toScreen(tile.x, tile.y));
    }

    addAnimationCover() {
        if (!this.selectedTile || !this.selectedTile.tileObj || !this.selectedTile.tileObj.extraStatus || (this.selectedTile.tileObj.extraStatus < 1 && this.selectedTile.tileObj.extraStatus > 10)) {
            this.removeAnimationCover();
            return;
        }
        let currentPoint = this.viewport.toScreen(this.selectedTile.x, this.selectedTile.y);
        let animationCoverViewStyle = this.animationCoverView.style;
        animationCoverViewStyle.top = (currentPoint.y + 80) + 'px';
        animationCoverViewStyle.left = (currentPoint.x + 80) + 'px';
        animationCoverViewStyle.width = this.selectedTile.width * this.viewport.scaled + 'px';
        animationCoverViewStyle.height = this.selectedTile.height * this.viewport.scaled + 'px';
        this.animationCoverView.width = this.selectedTile.width * this.viewport.scaled;
        this.animationCoverView.height = this.selectedTile.height * this.viewport.scaled;
        this.animationCover.resize();
        this.animationCover.startAnimation();
    }

    removeAnimationCover() {
        this.animationCover.stopAnimation();
        let animationCoverViewStyle = this.animationCoverView.style;
        animationCoverViewStyle.width = '0';
        animationCoverViewStyle.height = '0';
        this.animationCover.resize();
    }

    addCoverViewWithTile(tile) {
        let x = tile.x - space * 0.5;
        let y = tile.y - space * 0.5;
        let targetSize = this.delegate.currentBuildAreaSize();
        let width = (size + space) * targetSize;
        let height = (size + space) * targetSize;
        this.coverView = new PIXI.Graphics();
        if (this.coverViewAreaIsValid(targetSize, x, y, width, height)) {
            this.coverView.beginFill(0x000000, 0.23);
        } else {
            this.coverView.beginFill(0xed6c62, 0.23);
        }
        this.coverView.drawRect(x, y, width, height);
        this.coverView.endFill();
        this.viewport.addChild(this.coverView);
    }

    updateCoverView(targetSize) {
        this.viewport.removeChild(this.coverView);
        let x = this.selectedTile.x - space * 0.5;
        let y = this.selectedTile.y - space * 0.5;
        let width = (size + space) * targetSize;
        let height = (size + space) * targetSize;
        console.log('updateCoverView:', targetSize, x, y, width, height, this.worldWidth, this.worldHeight);
        this.coverView = new PIXI.Graphics();
        if (this.coverViewAreaIsValid(targetSize, x, y, width, height)) {
            this.coverView.beginFill(0x000000, 0.23);
        } else {
            this.coverView.beginFill(0xed6c62, 0.23);
        }
        this.coverView.drawRect(x, y, width, height);
        this.coverView.endFill();
        this.viewport.addChild(this.coverView);
    }

    /// 判断
    coverViewAreaIsValid(targetSize, pixiX, pixiY, pixiWidth, pixiHeight) {
        if (!this.selectedTile) {
            return true;
        }
        console.log('coverViewAreaIsValid:', targetSize, pixiX, pixiY, pixiWidth, pixiHeight, this.worldWidth, this.worldHeight);
        if (pixiX + pixiWidth > this.worldWidth + space) {
            // 超出边界
            return false;
        }
        if (pixiY + pixiHeight > this.worldHeight + space) {
            // 超出边界
            return false;
        }
        for (var i = this.selectedTile.indexY; i < this.selectedTile.indexY + targetSize; i++) {
            for (var j = this.selectedTile.indexX; j < this.selectedTile.indexX + targetSize; j++) {
                let locString = j + "," + i;
                if (this.markMap.has(locString) || this.ignoreSet.has(locString)) {
                    return false;
                }
            }
        }
        return true;
    }

    /// 上传图片之后, 更新选中位置的图片
    updateSelectedTileImage(path, landInfoName, landInfoUrl) {
        this.selectedTile.tileObj.image = path;
        this.delegate.updateBuildImageUrl(path);
        axios.get(path, {
            responseType: 'arraybuffer'
        }).then(response => {
            return 'data:image/png;base64,' + btoa(new Uint8Array(response.data).reduce((data, byte) => data + String.fromCharCode(byte), ''));
        }).then(data => {
            this.base64ToImage(data, (img) => {
                const bunny = PIXI.Sprite.from(img);
                bunny.x = this.selectedTile.x + space;
                bunny.y = this.selectedTile.y + space;
                bunny.width = this.selectedTile.width - space * 2;
                bunny.height = this.selectedTile.height - space * 2;
                this.viewport.addChild(bunny);
                // 绘制完图片, 检查是否需要绘制 landTitle or landURL
                this.drawNameAndLink(landInfoName, landInfoUrl, bunny, this.selectedTile.tileObj);
            });
        });
    }

    /// 绘制附带的 name 和 url
    drawNameAndLink(landTitle, landURL, bunny, tileObj) {
        if (!landTitle && !landURL) {
            return;
        }
        let drawString;
        if (landTitle) {
            drawString = landTitle;
        } else if (landURL) {
            drawString = landURL;
        }
        if (drawString) {
            let fontSize = 10;
            let linkIconSize = 14;
            let linkIconSpace = 2;
            let nameBottomSapce = 0;
            if (tileObj.buildType === BuildType.Mall) {
                fontSize = 14;
                linkIconSize = 20;
                linkIconSpace = 2;
                nameBottomSapce = 8;
            } else if (tileObj.buildType === BuildType.City) {
                fontSize = 26;
                linkIconSize = 44;
                linkIconSpace = 20;
                nameBottomSapce = 26;
            } else if (tileObj.buildType === BuildType.Country) {
                fontSize = 34;
                linkIconSize = 66;
                linkIconSpace = 20;
                nameBottomSapce = 28;
            }
            const style = new PIXI.TextStyle({
                fontSize: fontSize,
                fill: ['#ffffff']
            });
            let drawStringWidth = bunny.width - space * 2;
            let targetDrawString = this.truncWithEllipsis(drawString, style, drawStringWidth);
            const drawText = new PIXI.Text(targetDrawString, style);
            // 文字居中
            let drawStringX = (bunny.width - drawText.width) * 0.5 + bunny.x;
            // nameBottomSapce 是要把文字网上提一些, 不靠底部
            let drawStringY = bunny.y + (bunny.height - drawText.height - nameBottomSapce);
            drawText.x = drawStringX;
            drawText.y = drawStringY;
            // 文字背景
            let textBgWidth = bunny.width;
            // 图片尺寸是 499 * 80
            let textBgHeight = (textBgWidth * 80) / 499;
            const textBg = PIXI.Sprite.from('./assets/images/map_name_mask.png');
            textBg.x = bunny.x;
            textBg.y = bunny.y + bunny.height - textBgHeight;
            textBg.width = textBgWidth;
            textBg.height = textBgHeight;
            this.viewport.addChild(textBg);
            this.viewport.addChild(drawText);
            if (landURL) {
                // 有链接, 绘制 link 标识
                const linkIdentify = PIXI.Sprite.from('./assets/images/icon_link.png');
                linkIdentify.x = bunny.x + bunny.width - linkIconSize - linkIconSpace;
                linkIdentify.y = bunny.y + linkIconSpace;
                linkIdentify.width = linkIconSize;
                linkIdentify.height = linkIconSize;
                this.viewport.addChild(linkIdentify);
                linkIdentify.interactive = true;
                linkIdentify.buttonMode = true;
                linkIdentify.addEventListener('click', (e) => {
                    // 跳转链接
                    this.delegate.showLinkTipsAlert(landURL);
                });
            }

        }
    }

    /// 裁剪字符串
    truncWithEllipsis(text, textStyle, maxWidth) {
        const ELLIPSIS = '…';
        const chars = text.split('');
        const metrics = TextMetrics.measureText(`${ELLIPSIS}\n${chars.join('\n')}`, textStyle);
        const [ellipsisWidth, ...charWidths] = metrics.lineWidths;
        const { str: truncated, overflow } = charWidths.reduce(
            (data, w, i) => {
                if (data.width + w + ellipsisWidth >= maxWidth) {
                    return { ...data, width: maxWidth, overflow: true }
                }
                return {
                    str: data.str + chars[i],
                    width: data.width + w,
                    overflow: false,
                }
            },
            { str: '', width: 0, overflow: false }
        )
        return truncated + (overflow ? ELLIPSIS : '');
    }

    minimapBox;

    drawMinimap() {
        const container = document.getElementById('mini-map');
        const app = new PIXI.Application({ width: this.minimapWidth, height: this.minimapHeight, backgroundColor: 0x333333 });
        app.stage.interactive = true;
        app.stage.hitArea = app.renderer.screen;
        container.appendChild(app.view);

        // 绘制背景
        for (var i = 0; i < worldLengthY; i++) {
            for (var j = 0; j < worldLengthX; j++) {
                // 这里的 x,y 是像素值
                let x = (size + space) * j;
                let y = (size + space) * i;
                let locString = j + "," + i;
                if (this.ignoreSet.has(locString)) {
                    continue;
                }
                if (this.markMap.has(locString)) {
                    // markMap has 这个位置, 表示这个位置已经被 build
                    let tileObj = this.markMap.get(locString);
                    if (!tileObj.isDraw) {
                        continue;
                    }
                    let tmpWidth = tileObj.width * (size + space);
                    let tmpHeight = tileObj.height * (size + space);
                    let graphics = new PIXI.Graphics();
                    graphics.beginFill(0x8f7654, 0.5);
                    graphics.drawRect(x * this.minimapScale, y * this.minimapScale, tmpWidth * this.minimapScale, tmpHeight * this.minimapScale);
                    graphics.endFill();
                    app.stage.addChild(graphics);
                    if (tileObj.extraStatus === AnimationCoverStatus.W) {
                        const bunny = PIXI.Sprite.from('assets/images/icon_w.png');
                        bunny.x = x * this.minimapScale;
                        bunny.y = y * this.minimapScale;
                        bunny.width = tmpWidth * this.minimapScale;
                        bunny.height = tmpHeight * this.minimapScale;
                        app.stage.addChild(bunny);
                    } else if (tileObj.buildType === BuildType.Country) {
                        const bunny = PIXI.Sprite.from('assets/images/country.png');
                        bunny.x = x * this.minimapScale;
                        bunny.y = y * this.minimapScale;
                        bunny.width = tmpWidth * this.minimapScale;
                        bunny.height = tmpHeight * this.minimapScale;
                        app.stage.addChild(bunny);
                    }

                } else {
                    // 没有被 build, 就画一个普通方格
                    let graphics = new PIXI.Graphics();
                    graphics.beginFill(0x282828, 1);
                    graphics.drawRect(x * this.minimapScale, y * this.minimapScale, (size + space) * this.minimapScale, (size + space) * this.minimapScale);
                    graphics.endFill();
                    app.stage.addChild(graphics);
                }
            }
        }
        // 背景图片
        // let imagePath = './assets/images/screenshot.jpeg';
        // const bunny = PIXI.Sprite.from(imagePath);
        // bunny.x = 0;
        // bunny.y = 0;
        // bunny.width = this.minimapWidth;
        // bunny.height = this.minimapHeight;
        // app.stage.addChild(bunny);

        this.minimapViewport = new Viewport({
            screenWidth: this.minimapWidth,
            screenHeight: this.minimapHeight,
            worldWidth: this.minimapWidth,
            worldHeight: this.minimapHeight,

            interaction: app.renderer.plugins.interaction // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
        })
        app.stage.addChild(this.minimapViewport)
        this.minimapViewport.drag().pinch().wheel().decelerate()
        this.minimapViewport.clampZoom({
            minScale: 0.5,
            maxScale: 2.0
        })

        // 红色 debug view
        // const graphics = new PIXI.Graphics();
        // graphics.beginFill(0xd73136, 0.3);
        // graphics.drawRect(0, 0, this.minimapWidth, this.minimapHeight);
        // graphics.endFill();
        // this.minimapViewport.addChild(graphics);

        // 窗口示意
        let mapVisibleBounds = this.viewport.getVisibleBounds();
        this.minimapBox = new PIXI.Graphics();
        this.minimapBox.lineStyle(2, 0xFEEB77, 1, 0.5);
        this.minimapBox.beginFill(0x000000, 0);
        this.minimapBox.drawRect(mapVisibleBounds.x * this.minimapScale, mapVisibleBounds.y * this.minimapScale, mapVisibleBounds.width * this.minimapScale, mapVisibleBounds.height * this.minimapScale);
        this.minimapBox.endFill();
        this.minimapViewport.addChild(this.minimapBox);
    }

    mapEvent() {
        // 大地图初始左上角
        let initialX = this.viewport.left;
        let initialY = this.viewport.top;
        // 小地图初始左上角
        let minimapInitialX = this.minimapViewport.left;
        let minimapInitialY = this.minimapViewport.top;

        this.viewport.on('moved', (viewport, type) => {
            // 移动的时候刷新遮罩动画
            this.addAnimationCover();
            // this.checkAllNormalTile();
            // 小地图缩放逻辑
            if (viewport.type === 'wheel') {
                // 缩放
                this.minimapViewport.setZoom(1 / viewport.viewport.scaled, true);
            }
            // 左上角移动差值
            let xDifference = initialX - viewport.viewport.left;
            let yDifference = initialY - viewport.viewport.top;
            // target position 
            let targetX = initialX + xDifference * viewport.viewport.scaled * this.minimapScale;
            let targetY = initialY + (yDifference * viewport.viewport.scaled * this.minimapScale);
            this.minimapViewport.moveCorner(targetX, targetY);
        });
        this.viewport.on('moved-end', (viewport, type) => {
            // 移动结束
            this.addAnimationCover();
            this.checkAllNormalTile();
        });

        this.viewport.on('zoomed-end', (viewport) => {
            this.delegate.updateSliderValue(viewport.scaled);
            // 缩放
            this.minimapViewport.setZoom(1 / viewport.scaled, true);
            // 左上角移动差值
            let xDifference = initialX - viewport.left;
            let yDifference = initialY - viewport.top;
            console.log("移动差值: ", xDifference, yDifference);
            // target position 
            let targetX = initialX + xDifference * viewport.scaled * this.minimapScale;
            let targetY = initialY + (yDifference * viewport.scaled * this.minimapScale);
            console.log("目标位置: ", targetX, targetY);
            this.minimapViewport.moveCorner(targetX, targetY);
        });

        this.minimapViewport.on('moved', (viewport, type) => {
            // 移动的时候刷新遮罩动画
            this.addAnimationCover();
            if (viewport.type === 'wheel') {
                // 缩放
                this.viewport.setZoom(1 / viewport.viewport.scaled, true);
            }
            // 左上角移动差值
            let xDifference = minimapInitialX - viewport.viewport.left;
            let yDifference = minimapInitialY - viewport.viewport.top;
            // target position 
            let targetX = minimapInitialX + xDifference * viewport.viewport.scaled / this.minimapScale;
            let targetY = minimapInitialY + (yDifference * viewport.viewport.scaled / this.minimapScale);
            this.viewport.moveCorner(targetX, targetY);
        });
    }

    takeScreenshot() {
        this.app.renderer.plugins.extract.canvas(this.viewport).toBlob((b) => {
            const a = document.createElement('a');
            document.body.append(a);
            a.download = 'screenshot';
            a.href = URL.createObjectURL(b);
            a.click();
            a.remove();
        }, 'image/jpeg');
    }

}