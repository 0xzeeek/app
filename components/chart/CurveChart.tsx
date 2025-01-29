import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time,
} from "lightweight-charts";
import { useDataFeed } from "@/hooks/useDataFeed";
import { Agent } from "@/lib/types";
import { useEthPrice } from "@/hooks/useEthPrice";

interface CurveChartProps {
  agent: Agent;
}

export default function CurveChart({ agent }: CurveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { ohlcData, trades, loading, error: dataError } = useDataFeed(agent.curve, agent.agentId);
  const { ethPrice, error: priceError } = useEthPrice();

  useEffect(() => {
    if (!chartContainerRef.current || !ethPrice) return;

    // 1. Create the chart instance with modified configuration
    const chart: IChartApi = createChart(chartContainerRef.current, {
      width: 600,
      height: 400,
      layout: {
        background: { color: '#1a1b1e' },  // Dark background
        textColor: '#d1d5db',  // Light gray text
      },
      grid: {
        vertLines: { color: '#2d2d2d' },  // Darker grid lines
        horzLines: { color: '#2d2d2d' },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        autoScale: true,
        scaleMargins: {
          top: 0.1,  // Reduced top margin
          bottom: 0.1, // Reduced bottom margin
        },
        ticksVisible: true,
        borderColor: '#2d2d2d',  // Darker border
        mode: 0, // Normal mode (not logarithmic)
      },
      localization: {
        priceFormatter: (price: number) => {
          if (price < 0.000001) {
            return `$${price.toFixed(15)}`;
          }
          if (price < 0.01) {
            return `$${price.toFixed(8)}`;
          }
          return `$${price.toFixed(4)}`;
        },
      },
    });

    // 2. Add a candlestick series with specific options
    const candlestickSeries: ISeriesApi<"Candlestick"> = chart.addCandlestickSeries({
      upColor: '#26a69a',      // Keeping green for up
      downColor: '#ef5350',    // Keeping red for down
      borderVisible: false,
      wickUpColor: '#26a69a',  // Matching up color
      wickDownColor: '#ef5350', // Matching down color
      priceFormat: {
        type: 'price',
        precision: 10,
        minMove: 0.0000000001,
      },
    });

    // Add this block to set initial range if there's no data
    if (!ohlcData.length) {
      const currentTime = Math.floor(Date.now() / 1000) as Time;
      const oneDayAgo = (currentTime as number - (24 * 60 * 60)) as Time;
      
      candlestickSeries.setData([{
        time: oneDayAgo,
        open: 0,
        high: 0,
        low: 0,
        close: 0,
      }]);
      
    } else {
      // Existing data processing code
      const finalChartData = ohlcData.map((candle) => ({
        time: candle.time as Time,
        open: candle.open * ethPrice,
        high: candle.high * ethPrice,
        low: candle.low * ethPrice,
        close: candle.close * ethPrice,
      }));

      candlestickSeries.setData(finalChartData);
      chart.timeScale().fitContent();
    }

    return () => {
      chart.remove();
    };
  }, [ohlcData, trades, ethPrice]);

  if (priceError) return <div className="p-4 text-red-500">Error loading ETH price: {priceError}</div>;
  if (!ethPrice) return <div className="p-4">Loading ETH price...</div>;
  if (loading) return <div className="p-4">Loading chart data…</div>;
  if (dataError) return <div className="p-4 text-red-500">Error loading data: {dataError}</div>;

  return (
    <div className="border rounded-lg p-4">
      <div ref={chartContainerRef} />
    </div>
  );
}