// import React, { useEffect } from 'react'
import React from 'react'
import { useWeb3React } from '@web3-react/core'
// import { injected } from '../connectors'
import { useEagerConnect, useInactiveListener } from "./hooks";
import { Web3Provider } from "@ethersproject/providers";

export default function Web3RectManager({ children }: { children: JSX.Element }) {
  const context = useWeb3React<Web3Provider>()
  const { connector } = context
  // const { connector, library, chainId, account, activate, deactivate, active, error } = context
  // console.log(useWeb3React,connector, library, chainId, account, activate, deactivate, active, error);

  const [activatingConnector, setActivatingConnector] = React.useState<any>()
  React.useEffect(() => {
    if (activatingConnector && activatingConnector === connector) {
      setActivatingConnector(undefined)
    }
  }, [activatingConnector, connector])

  const triedEager = useEagerConnect()

  useInactiveListener(!triedEager || !!activatingConnector)

  return children

}