// components/CurveChart.tsx
import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  //   BarData, // or CandlestickData, etc.
  Time,
} from "lightweight-charts";
import { useDataFeed } from "@/hooks/useDataFeed";

// type CandlestickData = {
//   time: number; // Unix timestamp in seconds
//   open: number;
//   high: number;
//   low: number;
//   close: number;
// };

interface CurveChartProps {
  address: `0x${string}`;
}

export default function CurveChart({ address }: CurveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Pull candlestick data (ohlcData) and other state from the useDataFeed hook
  const { ohlcData, trades, loading, error } = useDataFeed(address);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Create the chart instance
    const chart: IChartApi = createChart(chartContainerRef.current, {
      width: 600,
      height: 400,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#333",
      },
      grid: {
        vertLines: {
          color: "#eee",
        },
        horzLines: {
          color: "#eee",
        },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      rightPriceScale: {
        borderVisible: false,
      },
    });

    // 2. Add a candlestick series
    const candlestickSeries: ISeriesApi<"Candlestick"> = chart.addCandlestickSeries();

    // 3. Convert ohlcData to the format lightweight-charts expects:
    candlestickSeries.setData(
      ohlcData.map((candle) => ({
        time: candle.time as Time,  // Cast to Time type
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }))
    );

    // 4. On unmount or curveAddress change, clean up the chart
    return () => {
      chart.remove();
    };
  }, [ohlcData, trades]);

  // Optional: Use trades for a separate line series or to display raw trade data in the UI.
  // Example: console.log("Latest trades", trades);

  if (loading) return <div>Loading chart data…</div>;
  if (error) return <div>Error loading data: {error}</div>;

  return (
    <div>
      <div ref={chartContainerRef} />
    </div>
  );
}
