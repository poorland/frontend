import { Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Web3Provider from "./Web3Provider";
import Web3ReactManager from "./Web3ReactManager";
import Home from "./pages/home";
import TugouMap from "./pages/scene";
import TugouPixelMap from './pages/pixel_map';
import HouseScene from './pages/house_scene';
import Claim from './pages/claim';
import { Toast } from './components/components';
import './App.css';
import './i18n';

function App() {
    return (
        <Suspense fallback={null}>
            <Toast ref={toast => window.$toast = toast} />
            <Web3Provider>
                <Web3ReactManager>
                    <HashRouter>
                        <Routes>
                            <Route path="/" element={<Home />} />
                            <Route path="/map" element={<TugouMap />} />
                            <Route path="/pixelmap" element={<TugouPixelMap />} />
                            <Route path="/house" element={<HouseScene />} />
                            <Route path="/claim" element={<Claim />} />
                        </Routes>
                    </HashRouter>
                </Web3ReactManager>
            </Web3Provider>
        </Suspense>
    );
}

export default App;
