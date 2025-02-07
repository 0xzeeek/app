import { createConfig } from "@wagmi/core";
// TODO: update to base
import { sepolia } from "@wagmi/core/chains";
import { webSocket } from "wagmi";

const WEBSOCKET_RPC = process.env.NEXT_PUBLIC_WEBSOCKET_RPC_URL;

const config = createConfig({
  chains: [sepolia],
  transports: {
    // [base.id]: webSocket(WEBSOCKET_RPC),
    [sepolia.id]: webSocket(WEBSOCKET_RPC),
  },
});

export default config;
