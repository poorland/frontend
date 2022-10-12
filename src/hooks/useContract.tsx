import { useMemo } from 'react'
import { useWeb3React } from '@web3-react/core';
import Web3 from 'web3';

import { AirdropAddress, MintAddress, BuildAddress, ExchangeAddress, IERC1155Address } from '../abis/abiAddress'
import { abi as MintABI } from '../abis/PoorLandMaterialNFT.json';
import { abi as BuildABI } from '../abis/PoorLandMetaverse.json';
import { abi as AirdropABI } from '../abis/Airdrop.json';
import { abi as ExchangeABI } from '../abis/PoorlandExchange.json';
import { abi as IERC1155ABI } from '../abis/IERC1155.json';


function useContract(address: string, ABI: any) {
    const { library } = useWeb3React();
    const contract = useMemo(() => {
        if (!address || !ABI || !library) {
            return null;
        }
        try {
            const web3 = new new Web3(library.provider).eth.Contract(ABI, address);
            return web3;
        } catch (error) {
            return null;
        }
    }, [address, ABI, library]);
    return contract?.methods;
}

export function useMintContract() {
    return useContract(MintAddress, MintABI);
}

export function useBuildContract() {
    return useContract(BuildAddress, BuildABI);
}

export function useAirdropContract() {
    return useContract(AirdropAddress, AirdropABI);
}

export function useExchangeContract() {
    return useContract(ExchangeAddress, ExchangeABI);
}

export function useIERC1155Contract() {
    return useContract(IERC1155Address, IERC1155ABI);
}

