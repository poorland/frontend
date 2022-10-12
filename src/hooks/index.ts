import { useState, useEffect } from 'react'
import { useWeb3React } from '@web3-react/core'

import { injected } from '../connectors'
import { Web3ReactContextInterface } from "@web3-react/core/dist/types";
import { ChainId } from "../constants";
import { Web3Provider } from "@ethersproject/providers";

export function useActiveWeb3React(): Web3ReactContextInterface<Web3Provider> & { chainId?: ChainId } {
  const context = useWeb3React<Web3Provider>()
  return context
}

export function useEagerConnect() {
  const { activate, active } = useWeb3React()

  const [tried, setTried] = useState(false)

  useEffect(() => {
    injected.isAuthorized().then((isAuthorized: boolean) => {
      if (isAuthorized) {
        activate(injected, undefined, true).catch(() => {
          setTried(true)
        })
      } else {
        setTried(true)
      }
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // if the connection worked, wait until we get confirmation of that to flip the flag
  useEffect(() => {
    if (!tried && active) {
      setTried(true)
    }
  }, [tried, active])

  return tried
}

export function useInactiveListener(suppress: boolean = false) {
  const { active, error, activate } = useWeb3React()

  useEffect((): any => {
    const { ethereum } = window as any
    if (ethereum && ethereum.on && !active && !error && !suppress) {
      const handleConnect = () => {
        // console.log("Handling 'connect' event")
        activate(injected)
      }
      const handleChainChanged = (chainId: string | number) => {
        // console.log("Handling 'chainChanged' event with payload", chainId)
        activate(injected, undefined, true).catch(error => {
          // console.error('Failed to activate after chain changed', error)
        })
      }
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length > 0) {
          activate(injected, undefined, true).catch(error => {
            // console.error('Failed to activate after accounts changed', error)
          })
        }
      }

      ethereum.on('connect', handleConnect)
      ethereum.on('chainChanged', handleChainChanged)
      ethereum.on('accountsChanged', handleAccountsChanged)

      return () => {
        if (ethereum.removeListener) {
          ethereum.removeListener('connect', handleConnect)
          ethereum.removeListener('chainChanged', handleChainChanged)
          ethereum.removeListener('accountsChanged', handleAccountsChanged)
        }
      }
    }
  }, [active, error, suppress, activate])
}
