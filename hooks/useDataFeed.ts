import { useEffect, useState } from "react";
import { ethers } from "ethers";
import CURVE_ABI from "@/lib/curveAbi.json";
import { sepoliaUrl } from "@/lib/wagmiConfig";

const DEPLOY_BLOCK = 7401335;

/**
 * We'll store both Buy and Sell trades in the same structure.
 * eventType indicates which event it came from.
 */
type EventType = "buy" | "sell";

interface TradeData {
  time: number; // Unix timestamp
  eventType: EventType;
  account: string; // buyer or seller
  amount: number; // number of tokens
  price: number; // price per token in ETH
}

interface Candlestick {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function useDataFeed(curveAddress?: string) {
  const [trades, setTrades] = useState<TradeData[]>([]);
  const [ohlcData, setOhlcData] = useState<Candlestick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (!curveAddress) return;

    let curveContract: ethers.Contract | null = null;
    const provider: ethers.WebSocketProvider | null = new ethers.WebSocketProvider(sepoliaUrl);

    /**
     * 1) Fetch historical 'Buy' and 'Sell' events once.
     */
    const fetchHistoricalTrades = async () => {
      setLoading(true);
      try {
        // Create a contract instance
        curveContract = new ethers.Contract(curveAddress, CURVE_ABI, provider);

        // ------------------------------------------
        // 1a) Query all past Buy events
        //     Adjust fromBlock to your contract deployment block if needed.
        const buyFilter = curveContract.filters.Buy();
        const buyLogs = await curveContract.queryFilter(buyFilter, DEPLOY_BLOCK, "latest");

        const buyTrades: TradeData[] = [];
        for (const evt of buyLogs) {
          // Type assertion to EventLog
          const [buyer, amountBig, costBig] = (evt as ethers.EventLog).args ?? [];
          const block = await provider.getBlock(evt.blockNumber);

          const amount = Number(ethers.formatUnits(amountBig, 18));
          const totalCostEth = Number(ethers.formatEther(costBig));

          buyTrades.push({
            time: block?.timestamp ?? 0,
            eventType: "buy",
            account: buyer,
            amount,
            // e.g. "price per token" in ETH
            price: totalCostEth / (amount || 1),
          });
        }

        // ------------------------------------------
        // 1b) Query all past Sell events
        const sellFilter = curveContract.filters.Sell();
        const sellLogs = await curveContract.queryFilter(sellFilter, DEPLOY_BLOCK, "latest");

        const sellTrades: TradeData[] = [];
        for (const evt of sellLogs) {
          // Type assertion to EventLog
          const [seller, amountBig, refundBig] = (evt as ethers.EventLog).args ?? [];
          const block = await provider.getBlock(evt.blockNumber);

          const amount = Number(ethers.formatUnits(amountBig, 18));
          const totalRefundEth = Number(ethers.formatEther(refundBig));

          sellTrades.push({
            time: block?.timestamp ?? 0,
            eventType: "sell",
            account: seller,
            amount,
            // e.g. "price per token" in ETH
            price: totalRefundEth / (amount || 1),
          });
        }

        // ------------------------------------------
        // 1c) Merge buyTrades & sellTrades, then sort by time
        const allTrades = [...buyTrades, ...sellTrades].sort((a, b) => a.time - b.time);

        setTrades(allTrades);

        // 1d) Build initial OHLC data
        const cands = aggregateToCandles(allTrades, 5 * 60); // 5-min buckets
        setOhlcData(cands);
      } catch (error: unknown) {
        if (error instanceof Error) {
          console.error(new Error(`Failed to save user info: ${error.message}`));
          setError(error.message || "Error fetching historical data");
        }

        console.error(new Error("An unknown error occurred:"));
        setError("Error fetching historical data");
      } finally {
        setLoading(false);
      }
    };

    /**
     * 2) Subscribe to new 'Buy' and 'Sell' events in real-time.
     */
    const subscribeToEvents = () => {
      if (!curveContract) return;

      // ------------------------------------------
      // 2a) Handler for new Buy events
      const handleBuyEvent = async (
        buyer: string,
        amountBig: bigint,
        costBig: bigint,
        evt: ethers.Log | ethers.EventLog
      ) => {
        try {
          if (!provider) return;
          const block = await provider.getBlock(evt.blockNumber);

          const amount = Number(ethers.formatUnits(amountBig, 18));
          const totalCostEth = Number(ethers.formatEther(costBig));

          const newTrade: TradeData = {
            time: block?.timestamp ?? 0,
            eventType: "buy",
            account: buyer,
            amount,
            price: totalCostEth / (amount || 1),
          };

          setTrades((prev) => {
            const updated = [...prev, newTrade].sort((a, b) => a.time - b.time);
            return updated;
          });
        } catch (e) {
          console.error("Error handling Buy event:", e);
        }
      };

      // ------------------------------------------
      // 2b) Handler for new Sell events
      const handleSellEvent = async (
        seller: string,
        amountBig: bigint,
        refundBig: bigint,
        evt: ethers.Log | ethers.EventLog
      ) => {
        try {
          if (!provider) return;
          const block = await provider.getBlock(evt.blockNumber);

          const amount = Number(ethers.formatUnits(amountBig, 18));
          const totalRefundEth = Number(ethers.formatEther(refundBig));

          const newTrade: TradeData = {
            time: block?.timestamp ?? 0,
            eventType: "sell",
            account: seller,
            amount,
            price: totalRefundEth / (amount || 1),
          };

          setTrades((prev) => {
            const updated = [...prev, newTrade].sort((a, b) => a.time - b.time);
            return updated;
          });
        } catch (e) {
          console.error("Error handling Sell event:", e);
        }
      };

      // Attach listeners
      curveContract.on("Buy", handleBuyEvent);
      curveContract.on("Sell", handleSellEvent);

      // Cleanup
      return () => {
        curveContract?.off("Buy", handleBuyEvent);
        curveContract?.off("Sell", handleSellEvent);
      };
    };

    // 3) Fire it all: fetch historical events, then subscribe
    fetchHistoricalTrades().then(() => {
      subscribeToEvents();
    });

    // Cleanup if curveAddress changes or component unmounts
    return () => {
      if (curveContract) {
        curveContract.removeAllListeners("Buy");
        curveContract.removeAllListeners("Sell");
      }
    };
  }, [curveAddress]);

  /**
   * 3) Re‐aggregate OHLC whenever `trades` changes
   *    (i.e. when new trades come in from subscriptions).
   */
  useEffect(() => {
    if (!trades.length) return;
    const newCandles = aggregateToCandles(trades, 5 * 60); // 5-min buckets
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
  // Sort trades by time
  const sorted = [...trades].sort((a, b) => a.time - b.time);

  const csticks: Candlestick[] = [];
  if (!sorted.length) return csticks;

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
      // start a new bucket
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
