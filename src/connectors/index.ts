import { InjectedConnector } from '@web3-react/injected-connector'

export const CHAIN_IDS = [
  1,3,4,10,11,42,12345
]

export const injected = new InjectedConnector({ supportedChainIds: CHAIN_IDS })