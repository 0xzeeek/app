import { useEffect, useState } from "react";
import { ethers } from "ethers";
import CURVE_ABI from "@/lib/curveAbi.json";
import { getPoolAddress } from "@/utils";
import * as Sentry from "@sentry/nextjs";

const WEBSOCKET_RPC_URL = process.env.NEXT_PUBLIC_WEBSOCKET_RPC_URL || "";

// List of dummy token addresses that should show simulated data
const DUMMY_TOKEN_ADDRESSES = [
  "0xB6350d91D3d3E9E5E3E53C482e25B2c106E421a6",
  "0x8d82e7c0a2982011CEC7062A520E6345395F3239",
  "0x4A759348ef15eCB659ff62DD3D3D8d7e2D519DBD",
  "0x8AA5c799ED8C29Ec24f85db1048Bf306164aa32B",
  "0xC29448E2821b75DcD1383bf9ce595f21C7baBDd8",
  "0x4467bAe6A3FFd9Fc6290226DA5cD339d161F951D",
  "0xC87653F0E52CfC0C7726c953D3fae966387Ceb97"
];

// Minimal V3 ABI
const UNISWAP_V3_POOL_ABI = [
  "function token0() external view returns (address)",
  "function token1() external view returns (address)",
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)",
];

type EventType = "buy" | "sell" | "swap";

interface TradeData {
  time: number;     // Unix timestamp
  eventType: EventType;
  account: string;
  amount: number;   // number of tokens
  price: number;    // price per token in ETH
}

interface Candlestick {
  time: number;    // Unix timestamp
  open: number;
  high: number;
  low: number;
  close: number;
}

export function useDataFeed(curveAddress?: string, agentAddress?: string, block?: string) {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [ohlcData, setOhlcData] = useState<Candlestick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [poolAddress, setPoolAddress] = useState<string | null>(null);

  // Check if current token is a dummy token
  const isDummyToken = agentAddress ? DUMMY_TOKEN_ADDRESSES.includes(agentAddress) : false;

  useEffect(() => {
    // If dummy token, generate dummy trades & skip real on-chain fetch
    if (isDummyToken && agentAddress) {
      const { trades: dummyTrades } = generateDummyTradeData(agentAddress);
      setTrades(dummyTrades);
      setLoading(false);
      setError(null);
      return;
    }
    
    // Otherwise, proceed with real fetch
    if (!curveAddress) return;
    let curveContract: ethers.Contract | null = null;
    let uniswapPoolContract: ethers.Contract | null = null;

    // For streaming: WebSocketProvider
    const provider = new ethers.WebSocketProvider(WEBSOCKET_RPC_URL);

    const fetchPoolAddress = async (): Promise<string> => {
      if (!provider || !agentAddress) return "";
      const poolAddr = await getPoolAddress(agentAddress);
      setPoolAddress(poolAddr);
      return poolAddr;
    };

    const fetchHasBonded = async (): Promise<boolean> => {
      if (!provider || !curveAddress) return false;
      curveContract = new ethers.Contract(curveAddress, CURVE_ABI, provider);
      const hasBonded = await curveContract.finalized();
      return hasBonded;
    };

    // ------------------------------------------
    // 1) Fetch Bonding Curve trades (Buy & Sell)
    // ------------------------------------------
    const fetchBondingCurveTrades = async (): Promise<TradeData[]> => {
      if (!provider || !curveAddress || !block) return [];
      curveContract = new ethers.Contract(curveAddress, CURVE_ABI, provider);

      const latestBlock = await provider.getBlockNumber();
      const buyFilter = curveContract.filters.Buy();
      const buyLogs = await queryFilterInBatches(curveContract, buyFilter, Number(block), latestBlock);

      const buyTrades: TradeData[] = [];
      for (const evt of buyLogs) {
        const [buyer, amountBig, costBig] = (evt as ethers.EventLog).args ?? [];
        const blk = await provider.getBlock(evt.blockNumber);
        const amount = Number(amountBig);
        const totalCostEth = Number(ethers.formatEther(costBig));
        buyTrades.push({
          time: blk?.timestamp ?? 0,
          eventType: "buy",
          account: buyer,
          amount: amount,
          price: totalCostEth / (amount || 1),
        });
      }

      const sellFilter = curveContract.filters.Sell();
      const sellLogs = await queryFilterInBatches(curveContract, sellFilter, Number(block), latestBlock);

      const sellTrades: TradeData[] = [];
      for (const evt of sellLogs) {
        const [seller, amountBig, refundBig] = (evt as ethers.EventLog).args ?? [];
        const blk = await provider.getBlock(evt.blockNumber);
        const amount = Number(amountBig);
        const totalRefundEth = Number(ethers.formatEther(refundBig));
        sellTrades.push({
          time: blk?.timestamp ?? 0,
          eventType: "sell",
          account: seller,
          amount,
          price: totalRefundEth / (amount || 1),
        });
      }

      return [...buyTrades, ...sellTrades];
    };

    // ---------------------------------------------------
    // 2) Fetch Uniswap V3 trades (Swap events)
    // ---------------------------------------------------
    const fetchUniswapV3Trades = async (): Promise<TradeData[]> => {
      if (!provider || !agentAddress || !block) return [];
      const latestBlock = await provider.getBlockNumber();
      const uniswapPoolAddress = await getPoolAddress(agentAddress);
      if (!uniswapPoolAddress) return [];

      uniswapPoolContract = new ethers.Contract(uniswapPoolAddress, UNISWAP_V3_POOL_ABI, provider);
      const swapFilter = uniswapPoolContract.filters.Swap();
      const swapLogs = await queryFilterInBatches(uniswapPoolContract, swapFilter, Number(block), latestBlock);

      const swapTrades: TradeData[] = [];
      for (const evt of swapLogs) {
        const args = (evt as ethers.EventLog).args;
        if (!args) continue;
        const recipient = args.recipient as string;
        const blk = await provider.getBlock(evt.blockNumber);
        const a0 = Number(args.amount0);
        const a1 = Number(args.amount1);

        let eventType: EventType = "swap";
        let tokenAmount = 0;
        let price = 0;

        // Simplistic approach if token0 is our token & token1 is WETH
        if (a0 < 0 && a1 > 0) {
          // user is buying token0
          eventType = "buy";
          tokenAmount = Math.abs(a0) / 1e18;
          const ethIn = a1 / 1e18;
          price = ethIn / tokenAmount;
        } else if (a0 > 0 && a1 < 0) {
          // user is selling token0
          eventType = "sell";
          tokenAmount = a0 / 1e18;
          const ethOut = Math.abs(a1) / 1e18;
          price = ethOut / tokenAmount;
        }

        if (eventType !== "swap") {
          swapTrades.push({
            time: blk?.timestamp ?? 0,
            eventType,
            account: recipient,
            amount: tokenAmount,
            price,
          });
        }
      }
      return swapTrades.sort((a, b) => a.time - b.time);
    };

    const fetchAllHistoricalTrades = async () => {
      if (!agentAddress) return;
      setLoading(true);
      setError(null);
      try {
        const bcTrades = await fetchBondingCurveTrades();
        const uniTrades = await fetchUniswapV3Trades();
        const allTrades = [...bcTrades, ...uniTrades].sort((a, b) => a.time - b.time);
        setTrades(allTrades);
      } catch (err) {
        console.error("Error fetching trades:", err);
        Sentry.captureException("Error fetching trades", { extra: { error: err } });
        setError("Error fetching trades");
      } finally {
        setLoading(false);
      }
    };

    // ---------------------------------------------
    // 3) Subscribe to real-time BC + Uniswap events
    // ---------------------------------------------
    const subscribeToBondingCurveEvents = () => {
      if (!curveContract) return;

      curveContract.on("Buy", async (buyer: string, amountBig: bigint, costBig: bigint, evt: ethers.Log) => {
        if (!provider) return;
        try {
          const blk = await provider.getBlock(evt.blockNumber);
          const amount = Number(amountBig);
          const costEth = Number(ethers.formatEther(costBig));
          const newTrade: TradeData = {
            time: blk?.timestamp ?? 0,
            eventType: "buy",
            account: buyer,
            amount,
            price: costEth / (amount || 1),
          };
          setTrades((prev) => [...prev, newTrade].sort((a, b) => a.time - b.time));
        } catch (e) {
          console.error("Error handling BC Buy event:", e);
          Sentry.captureException(e);
        }
      });

      curveContract.on("Sell", async (seller: string, amountBig: bigint, refundBig: bigint, evt: ethers.Log) => {
        if (!provider) return;
        try {
          const blk = await provider.getBlock(evt.blockNumber);
          const amount = Number(amountBig);
          const refundEth = Number(ethers.formatEther(refundBig));
          const newTrade: TradeData = {
            time: blk?.timestamp ?? 0,
            eventType: "sell",
            account: seller,
            amount,
            price: refundEth / (amount || 1),
          };
          setTrades((prev) => [...prev, newTrade].sort((a, b) => a.time - b.time));
        } catch (e) {
          console.error("Error handling BC Sell event:", e);
          Sentry.captureException(e);
        }
      });
    };

    const subscribeToUniswapEvents = async () => {
      if (!agentAddress) return;
      const uniswapPoolAddress = await getPoolAddress(agentAddress);
      if (!uniswapPoolAddress) return;

      uniswapPoolContract = new ethers.Contract(uniswapPoolAddress, UNISWAP_V3_POOL_ABI, provider);

      uniswapPoolContract.on(
        "Swap",
        async (
          sender: string,
          recipient: string,
          amount0: bigint,
          amount1: bigint,
          sqrtPriceX96: bigint,
          liquidity: bigint,
          tick: number,
          evt: ethers.Log
        ) => {
          if (!provider) return;
          try {
            const blk = await provider.getBlock(evt.blockNumber);
            const a0 = Number(amount0);
            const a1 = Number(amount1);

            let eventType: EventType = "swap";
            let tokenAmount = 0;
            let price = 0;

            if (a0 < 0 && a1 > 0) {
              eventType = "buy";
              tokenAmount = Math.abs(a0) / 1e18;
              const ethIn = a1 / 1e18;
              price = ethIn / tokenAmount;
            } else if (a0 > 0 && a1 < 0) {
              eventType = "sell";
              tokenAmount = a0 / 1e18;
              const ethOut = Math.abs(a1) / 1e18;
              price = ethOut / tokenAmount;
            }

            if (eventType !== "swap") {
              const newTrade: TradeData = {
                time: blk?.timestamp ?? 0,
                eventType,
                account: recipient,
                amount: tokenAmount,
                price,
              };
              setTrades((prev) => [...prev, newTrade].sort((a, b) => a.time - b.time));
            }
          } catch (e) {
            console.error("Error in Uniswap V3 Swap event:", e);
            Sentry.captureException(e);
          }
        }
      );
    };

    fetchHasBonded().then((hasBonded) => {
      if (hasBonded) {
        // If the bonding curve is done, we only have historical trades
        fetchPoolAddress();
      } else {
        // Not bonded => fetch & subscribe
        fetchAllHistoricalTrades().then(() => {
          subscribeToBondingCurveEvents();
          subscribeToUniswapEvents();
        });
      }
    });

    // Cleanup
    return () => {
      curveContract?.removeAllListeners();
      uniswapPoolContract?.removeAllListeners();
    };
  }, [curveAddress, agentAddress, block, isDummyToken]);

  // --------------------------------------
  // Re-aggregate to candlesticks each time
  // trades[] updates
  // --------------------------------------
  useEffect(() => {
    if (!trades.length) {
      setOhlcData([]);
      return;
    }
    // 15-minute intervals (in seconds)
    const newCandles = aggregateToCandles(trades, 15 * 60);
    setOhlcData(newCandles);
  }, [trades]);

  return {
    trades,
    ohlcData,
    loading,
    error,
    poolAddress,
    isDummyToken
  };
}

/**
 * Naive candlestick aggregator: groups trades by `bucketSizeSeconds`.
 */
function aggregateToCandles(trades: TradeData[], bucketSizeSeconds: number): Candlestick[] {
  const sorted = [...trades].sort((a, b) => a.time - b.time);
  if (!sorted.length) return [];

  const candles: Candlestick[] = [];
  let currentBucketStart = sorted[0].time - (sorted[0].time % bucketSizeSeconds);
  let currentBucketPrices: number[] = [];

  for (const t of sorted) {
    const bucket = t.time - (t.time % bucketSizeSeconds);
    if (bucket === currentBucketStart) {
      currentBucketPrices.push(t.price);
    } else {
      // finalize previous bucket
      if (currentBucketPrices.length) {
        candles.push(buildCandle(currentBucketStart, currentBucketPrices));
      }
      currentBucketStart = bucket;
      currentBucketPrices = [t.price];
    }
  }

  // finalize last bucket
  if (currentBucketPrices.length) {
    candles.push(buildCandle(currentBucketStart, currentBucketPrices));
  }
  return candles;
}

function buildCandle(time: number, prices: number[]): Candlestick {
  const open = prices[0];
  const close = prices[prices.length - 1];
  const high = Math.max(...prices);
  const low = Math.min(...prices);
  return { time, open, high, low, close };
}

async function queryFilterInBatches(
  contract: ethers.Contract,
  filter: ethers.DeferredTopicFilter,
  fromBlock: number,
  toBlock: number,
  batchSize: number = 100000
) {
  const allLogs: ethers.Log[] = [];
  let currentFrom = fromBlock;

  while (currentFrom <= toBlock) {
    const currentTo = Math.min(currentFrom + batchSize - 1, toBlock);
    const logs = await contract.queryFilter(filter, currentFrom, currentTo);
    allLogs.push(...logs);
    currentFrom = currentTo + 1;
  }
  return allLogs;
}

/**
 * Generates a random walk of trades for 1 day (24h).
 * - Starts at 0.00001268
 * - Stays below 0.0005
 * - ~2 trades per minute => 2880 total trades
 */
export function generateDummyTradeData(tokenAddress: string): {
  trades: TradeData[];
  ohlcData: Candlestick[];
} {
  // 1) Basic parameters
  const START_PRICE = 0.00001268;
  const MAX_PRICE = 0.0005;
  const LOWER_BOUND = 0.00000001; // Just to avoid zero
  const TRADES_PER_MINUTE = 2;
  const MINUTES_IN_DAY = 24 * 60; // 1440
  const TOTAL_TRADES = MINUTES_IN_DAY * TRADES_PER_MINUTE; // => 2880
  const startTime = Math.floor(Date.now() / 1000) - 24 * 3600; // 1 day ago
  const endTime = Math.floor(Date.now() / 1000);

  // 2) We'll produce a time spacing of ~30s between trades
  //    so that they fill a 1-day window fairly evenly.
  const totalSeconds = endTime - startTime;
  const avgSpacing = totalSeconds / TOTAL_TRADES;

  // 3) Pseudo-random generator seeded by tokenAddress
  let state = parseInt(tokenAddress.slice(-8), 16) || 1;
  const pseudoRandom = () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };

  // 4) Generate trades in a random-walk style
  let currentPrice = START_PRICE;
  let currentTime = startTime;
  const trades: TradeData[] = [];

  for (let i = 0; i < TOTAL_TRADES; i++) {
    // Random small “volatility” factor, e.g. ±2% around the last price
    const changePct = (pseudoRandom() * 2 - 1) * 0.02; // up to +/-2%
    let newPrice = currentPrice * (1 + changePct);

    // Clamp to [LOWER_BOUND, MAX_PRICE]
    if (newPrice > MAX_PRICE) newPrice = MAX_PRICE;
    if (newPrice < LOWER_BOUND) newPrice = LOWER_BOUND;

    // “Buy” or “Sell”
    const eventType: EventType = pseudoRandom() < 0.5 ? "buy" : "sell";

    // Fake account address
    const account = `0x${Array.from({ length: 40 }, () =>
      "0123456789abcdef"[Math.floor(pseudoRandom() * 16)]
    ).join("")}`;

    // Random token amount
    const amount = 1000 + Math.floor(pseudoRandom() * 9000); // e.g. 1000-10k

    trades.push({
      time: currentTime,
      eventType,
      account,
      amount,
      price: newPrice,
    });

    // Move forward in time by ~avgSpacing ± small randomness
    // e.g. ~30 seconds each trade
    currentTime += Math.max(1, Math.floor(avgSpacing * (0.8 + 0.4 * pseudoRandom())));

    currentPrice = newPrice;
  }

  // 5) If you want candlesticks, aggregate trades into e.g. 1-minute candles
  //    (or 5-minute, or whatever). We'll do 1-minute here:
  const bucketSize = 60; // 60 seconds => 1 minute
  const ohlcData = aggregateToCandles(trades, bucketSize);

  return { trades, ohlcData };
}