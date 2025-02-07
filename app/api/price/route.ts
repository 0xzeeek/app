import { ethers } from "ethers";

// const RPC_URL = process.env.RPC_URL;
const RPC_URL = "https://rpc.ankr.com/eth/6d210a387ff8c4cdc9923ab3c3c66967b8da8dce449a1dc429dfa15d0ed97e68"; // TODO: update from mainnet
const CHAINLINK_ETH_USD_FEED = "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"; // Mainnet ETH/USD feed // TODO: update to base

const aggregatorV3InterfaceABI = [
  {
    inputs: [],
    name: "latestRoundData",
    outputs: [
      { name: "roundId", type: "uint80" },
      { name: "answer", type: "int256" },
      { name: "startedAt", type: "uint256" },
      { name: "updatedAt", type: "uint256" },
      { name: "answeredInRound", type: "uint80" }
    ],
    stateMutability: "view",
    type: "function"
  }
];

// Cache the price for 1 hour to avoid unnecessary RPC calls
let cachedPrice: number | null = null;
let lastFetchTime: number = 0;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

export async function GET() {
  try {
    // Check if we have a cached price that's still valid
    const now = Date.now();
    if (cachedPrice && now - lastFetchTime < CACHE_DURATION) {
      return new Response(JSON.stringify({ success: true, data: { price: cachedPrice } }));
    }

    // Create provider and contract instance
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const priceFeed = new ethers.Contract(
      CHAINLINK_ETH_USD_FEED,
      aggregatorV3InterfaceABI,
      provider
    );

    // Get latest price
    const [, answer] = await priceFeed.latestRoundData();
    const price = Number(answer) / 1e8; // Chainlink price feeds use 8 decimals

    // Update cache
    cachedPrice = price;
    lastFetchTime = now;

    return new Response(JSON.stringify({ success: true, data: { price } }));
  } catch (error) {
    console.error("Error fetching ETH price:", error);
    return new Response(JSON.stringify({ success: false, error: "Failed to fetch ETH price" }));
  }
}
