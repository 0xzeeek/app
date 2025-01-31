import { useEffect, useState } from "react";
import { ethers } from "ethers";
import CURVE_ABI from "@/lib/curveAbi.json";
import { sepoliaUrl } from "@/lib/wagmiConfig";
import { getPoolAddress } from "@/utils";

const DEPLOY_BLOCK = 7401335;

/**
 * We'll store both Buy and Sell trades in the same structure.
 * eventType indicates which event it came from.
 */
type EventType = "buy" | "sell" | "swap";

interface TradeData {
  time: number;    // Unix timestamp
  eventType: EventType;
  account: string; // buyer, seller, or swap 'to' address
  amount: number;  // number of tokens
  price: number;   // price per token in ETH
}

interface Candlestick {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

/**
 * Provide both the bonding-curve address (curveAddress) AND
 * the "agentAddress" that helps us find the Uniswap V3 pool.
 */
export function useDataFeed(curveAddress?: string, agentAddress?: string) {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [ohlcData, setOhlcData] = useState<Candlestick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!curveAddress) return;

    let curveContract: ethers.Contract | null = null;
    let uniswapPoolContract: ethers.Contract | null = null;

    // For real-time streaming, you can use a WebSocketProvider:
    const provider = new ethers.WebSocketProvider(sepoliaUrl);

    // ------------------------------------------
    // 1) Fetch Bonding Curve trades (Buy & Sell)
    // ------------------------------------------
    const fetchBondingCurveTrades = async (): Promise<TradeData[]> => {
      if (!provider || !curveAddress) return [];
      curveContract = new ethers.Contract(curveAddress, CURVE_ABI, provider);

      const buyFilter = curveContract.filters.Buy();
      const buyLogs = await curveContract.queryFilter(buyFilter, DEPLOY_BLOCK, "latest");

      const buyTrades: TradeData[] = [];
      for (const evt of buyLogs) {
        const [buyer, amountBig, costBig] = (evt as ethers.EventLog).args ?? [];
        const block = await provider.getBlock(evt.blockNumber);

        const amount = Number(amountBig);
        const totalCostEth = Number(ethers.formatEther(costBig));
        buyTrades.push({
          time: block?.timestamp ?? 0,
          eventType: "buy",
          account: buyer,
          amount: amount,
          price: totalCostEth / amount,
        });
      }

      const sellFilter = curveContract.filters.Sell();
      const sellLogs = await curveContract.queryFilter(sellFilter, DEPLOY_BLOCK, "latest");

      const sellTrades: TradeData[] = [];
      for (const evt of sellLogs) {
        const [seller, amountBig, refundBig] = (evt as ethers.EventLog).args ?? [];
        const block = await provider.getBlock(evt.blockNumber);

        const amount = Number(amountBig);
        const totalRefundEth = Number(ethers.formatEther(refundBig));

        sellTrades.push({
          time: block?.timestamp ?? 0,
          eventType: "sell",
          account: seller,
          amount,
          price: totalRefundEth / amount,
        });
      }

      return [...sellTrades, ...buyTrades];
    };

    // ---------------------------------------------------
    // 2) Fetch Uniswap V3 trades (Swap events) if pool exists
    // ---------------------------------------------------
    const fetchUniswapV3Trades = async (): Promise<TradeData[]> => {
      if (!provider || !agentAddress) return [];

      // 2a) Resolve the actual pool address via your "getPoolAddress" utility
      const uniswapPoolAddress = await getPoolAddress(agentAddress);
      if (!uniswapPoolAddress) return [];

      // 2b) Minimal V3 pool ABI
      const UNISWAP_V3_POOL_ABI = [
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
      ];

      uniswapPoolContract = new ethers.Contract(uniswapPoolAddress, UNISWAP_V3_POOL_ABI, provider);

      // 2c) Fetch historical Swap logs
      const swapFilter = uniswapPoolContract.filters.Swap();
      const swapLogs = await uniswapPoolContract.queryFilter(swapFilter, DEPLOY_BLOCK, "latest");

      const swapTrades: TradeData[] = [];
      for (const evt of swapLogs) {
        const eventArgs = (evt as ethers.EventLog).args;
        if (!eventArgs) continue;

        // const sender = eventArgs.sender as string;
        const recipient = eventArgs.recipient as string;
        const block = await provider.getBlock(evt.blockNumber);

        // In V3, amount0 / amount1 are signed int256
        const amount0 = Number(eventArgs.amount0);
        const amount1 = Number(eventArgs.amount1);

        let eventType: EventType = "swap";
        let tokenAmount = 0;
        let price = 0;

        // Common interpretation (assuming token0=YourToken, token1=WETH or ETH):
        // - amount0 < 0 => pool is *sending out* token0 => user *bought* token0
        // - amount0 > 0 => pool is *receiving* token0 => user *sold* token0
        // - And vice versa for amount1.

        // If amount0 < 0 && amount1 > 0 => user buys token0
        if (amount0 < 0 && amount1 > 0) {
          eventType = "buy";
          tokenAmount = Math.abs(amount0) / 1e18; 
          const ethIn = amount1 / 1e18;
          price = ethIn / tokenAmount;
        }
        // If amount0 > 0 && amount1 < 0 => user sells token0
        else if (amount0 > 0 && amount1 < 0) {
          eventType = "sell";
          tokenAmount = amount0 / 1e18;
          const ethOut = Math.abs(amount1) / 1e18;
          price = ethOut / tokenAmount;
        }

        if (eventType !== "swap") {
          swapTrades.push({
            time: block?.timestamp ?? 0,
            eventType,
            account: recipient, // or sender
            amount: tokenAmount,
            price,
          });
        }
      }

      return swapTrades.sort((a, b) => a.time - b.time);
    };

    // ----------------------------------
    // 3) Combine BC + Uniswap trades
    // ----------------------------------
    const fetchAllHistoricalTrades = async () => {
      if (!agentAddress) return; // skip if no agent
      setLoading(true);
      setError(null);

      try {
        // Bonding curve trades
        const bcTrades = await fetchBondingCurveTrades();

        // Uniswap V3 trades (only if pool address is found)
        const uniTrades = await fetchUniswapV3Trades();
        // console.log("bcTrades", bcTrades);
        // console.log("uniTrades", uniTrades);

        // Merge & sort
        const allTrades = [...bcTrades, ...uniTrades].sort((a, b) => a.time - b.time);
        setTrades(allTrades);

        // Build initial OHLC data
        const cands = aggregateToCandles(allTrades, 60); // 1-min buckets TODO: update this
        setOhlcData(cands);
      } catch (err) {
        console.error("Error fetching trades:", err);
        setError("Error fetching trades");
      } finally {
        setLoading(false);
      }
    };

    // ---------------------------------------------
    // 4) Subscribe to real-time BC + Uniswap events
    // ---------------------------------------------
    const subscribeToBondingCurveEvents = () => {
      if (!curveContract) return;

      // --- BC "Buy"
      const handleBuyEvent = async (
        buyer: string,
        amountBig: bigint,
        costBig: bigint,
        evt: ethers.Log | ethers.EventLog
      ) => {
        if (!provider) return;
        try {
          const block = await provider.getBlock(evt.blockNumber);

          const amount = Number(amountBig);
          const costEth = Number(ethers.formatEther(costBig));
          const newTrade: TradeData = {
            time: block?.timestamp ?? 0,
            eventType: "buy",
            account: buyer,
            amount,
            price: costEth / (amount || 1),
          };
          setTrades((prev) => [...prev, newTrade].sort((a, b) => a.time - b.time));
        } catch (e) {
          console.error("Error handling BC Buy event:", e);
        }
      };

      // --- BC "Sell"
      const handleSellEvent = async (
        seller: string,
        amountBig: bigint,
        refundBig: bigint,
        evt: ethers.Log | ethers.EventLog
      ) => {
        if (!provider) return;
        try {
          const block = await provider.getBlock(evt.blockNumber);

          const amount = Number(amountBig);
          const refundEth = Number(ethers.formatEther(refundBig));
          const newTrade: TradeData = {
            time: block?.timestamp ?? 0,
            eventType: "sell",
            account: seller,
            amount,
            price: refundEth / (amount || 1),
          };
          setTrades((prev) => [...prev, newTrade].sort((a, b) => a.time - b.time));
        } catch (e) {
          console.error("Error handling BC Sell event:", e);
        }
      };

      curveContract.on("Buy", handleBuyEvent);
      curveContract.on("Sell", handleSellEvent);
    };

    const subscribeToUniswapEvents = async () => {
      if (!agentAddress) return;
      const uniswapPoolAddress = await getPoolAddress(agentAddress);
      if (!uniswapPoolAddress) return;

      // Minimal V3 ABI again
      const UNISWAP_V3_POOL_ABI = [
        "function token0() external view returns (address)",
        "function token1() external view returns (address)",
        "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
      ];

      uniswapPoolContract = new ethers.Contract(uniswapPoolAddress, UNISWAP_V3_POOL_ABI, provider);

      // Listen for new Swap events
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
            const block = await provider.getBlock(evt.blockNumber);

            const a0 = Number(amount0);
            const a1 = Number(amount1);

            let eventType: EventType = "swap";
            let tokenAmount = 0;
            let price = 0;

            // If amount0 < 0 && amount1 > 0 => user is buying token0
            if (a0 < 0 && a1 > 0) {
              eventType = "buy";
              tokenAmount = Math.abs(a0) / 1e18;
              const ethIn = a1 / 1e18;
              price = ethIn / tokenAmount;
            } 
            // If amount0 > 0 && amount1 < 0 => user is selling token0
            else if (a0 > 0 && a1 < 0) {
              eventType = "sell";
              tokenAmount = a0 / 1e18;
              const ethOut = Math.abs(a1) / 1e18;
              price = ethOut / tokenAmount;
            }

            if (eventType !== "swap") {
              const newTrade: TradeData = {
                time: block?.timestamp ?? 0,
                eventType,
                account: recipient,
                amount: tokenAmount,
                price,
              };
              setTrades((prev) => [...prev, newTrade].sort((a, b) => a.time - b.time));
            }
          } catch (e) {
            console.error("Error in Uniswap V3 Swap event:", e);
          }
        }
      );
    };

    // 5) Kick off everything
    fetchAllHistoricalTrades().then(() => {
      subscribeToBondingCurveEvents();
      if (agentAddress) {
        subscribeToUniswapEvents();
      }
    });

    // Cleanup listeners on unmount or re‐render
    return () => {
      curveContract?.removeAllListeners();
      uniswapPoolContract?.removeAllListeners();
    };
  }, [curveAddress, agentAddress]);

  // ----------------------------------------
  // 6) Re-aggregate Candles when trades update
  // ----------------------------------------
  useEffect(() => {
    if (!trades.length) return;
    const newCandles = aggregateToCandles(trades, 60); // 1-min buckets
    setOhlcData(newCandles);
  }, [trades]);

  return {
    trades,
    ohlcData,
    loading,
    error,
  };
}

/**
 * A naive candlestick aggregator that groups trades by a given bucket size (seconds).
 * We do not differentiate between buys and sells here; we just treat them all as "trades."
 */
function aggregateToCandles(trades: TradeData[], bucketSizeSeconds: number): Candlestick[] {
  const sorted = [...trades].sort((a, b) => a.time - b.time);
  if (!sorted.length) return [];

  const csticks: Candlestick[] = [];
  let currentBucketStart = sorted[0].time - (sorted[0].time % bucketSizeSeconds);
  let currentBucketTrades: number[] = [];

  for (const t of sorted) {
    const bucket = t.time - (t.time % bucketSizeSeconds);
    if (bucket === currentBucketStart) {
      currentBucketTrades.push(t.price);
    } else {
      // finalize the previous bucket
      if (currentBucketTrades.length) {
        csticks.push(buildCandle(currentBucketStart, currentBucketTrades));
      }
      currentBucketStart = bucket;
      currentBucketTrades = [t.price];
    }
  }

  // finalize last bucket
  if (currentBucketTrades.length) {
    csticks.push(buildCandle(currentBucketStart, currentBucketTrades));
  }

  return csticks;
}

function buildCandle(time: number, prices: number[]): Candlestick {
  const open = prices[0];
  const close = prices[prices.length - 1];
  const high = Math.max(...prices);
  const low = Math.min(...prices);

  return {
    time,
    open,
    high,
    low,
    close,
  };
}
