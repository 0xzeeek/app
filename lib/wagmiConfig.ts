import { createConfig } from '@wagmi/core'
import { base, sepolia } from '@wagmi/core/chains'
import { webSocket } from 'wagmi'

const config = createConfig({
  chains: [base, sepolia],
  transports: {
    [base.id]: webSocket("wss://rpc.ankr.com/base/ws/6d210a387ff8c4cdc9923ab3c3c66967b8da8dce449a1dc429dfa15d0ed97e68"),
    [sepolia.id]: webSocket(
      `wss://rpc.ankr.com/eth_sepolia/6d210a387ff8c4cdc9923ab3c3c66967b8da8dce449a1dc429dfa15d0ed97e68`
    ),
  },
})

export const sepoliaUrl = `wss://rpc.ankr.com/eth_sepolia/6d210a387ff8c4cdc9923ab3c3c66967b8da8dce449a1dc429dfa15d0ed97e68`;

export default config;