"use client";

import React, { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, LineData, UTCTimestamp } from "lightweight-charts";
import { useDataFeed } from "@/hooks/useDataFeed";
import { useEthPrice } from "@/hooks/useEthPrice";
import styles from './CurveChart.module.css';

interface CurveChartProps {
  tokenAddress: string;
  curveAddress: string;
  block: string;
}

export default function CurveChart({ tokenAddress, curveAddress, block }: CurveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { ohlcData, trades, loading, error: dataError, poolAddress, isDummyToken } = useDataFeed(curveAddress, tokenAddress, block);
  const { ethPrice, error: priceError } = useEthPrice();
  
  useEffect(() => {
    if (!chartContainerRef.current || !ethPrice) return;

    // Force a layout reflow to ensure dimensions are calculated
    const containerElement = chartContainerRef.current;
    const parentElement = containerElement.parentElement;
    
    if (!parentElement) return;
    
    // Get the parent's width
    const parentWidth = parentElement.clientWidth;
    
    // 1. Create the chart with parent's dimensions
    const chart: IChartApi = createChart(containerElement, {
      width: parentWidth,
      height: 500,
      layout: {
        background: { color: "#1a1b1e" },
        textColor: "#d1d5db",
      },
      grid: {
        vertLines: { color: "#2d2d2d" },
        horzLines: { color: "#2d2d2d" },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
      },
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
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

    // 2. Candlesticks if we have enough data; otherwise a line
    let series: ISeriesApi<"Candlestick"> | ISeriesApi<"Line">;
    const CANDLE_THRESHOLD = 10;

    if (ohlcData.length < CANDLE_THRESHOLD) {
      // ---- Use Line series ----
      series = chart.addLineSeries({
        color: "#26a69a",
        lineWidth: 2,
      });

      // Convert OHLC data to { time, value }
      const lineData: LineData[] = ohlcData.map((candle) => ({
        time: candle.time as UTCTimestamp,
        value: candle.close * ethPrice, // multiply by ethPrice => USD
      }));

      if (!lineData.length) {
        const now = Math.floor(Date.now() / 1000);
        series.setData([
          { time: (now - 3600) as UTCTimestamp, value: 0 },
          { time: now as UTCTimestamp, value: 0 },
        ]);
      } else {
        series.setData(lineData);
      }
    } else {
      // ---- Use Candlestick series ----
      series = chart.addCandlestickSeries({
        upColor: "#26a69a",
        downColor: "#ef5350",
        borderVisible: false,
        wickUpColor: "#26a69a",
        wickDownColor: "#ef5350",
        priceFormat: {
          type: "price",
          precision: 10,
          minMove: 0.000001,
        },
      });

      const finalChartData = ohlcData.map((c) => ({
        time: c.time as UTCTimestamp,
        open: c.open * ethPrice,
        high: c.high * ethPrice,
        low: c.low * ethPrice,
        close: c.close * ethPrice,
      }));

      if (!finalChartData.length) {
        const now = Math.floor(Date.now() / 1000);
        series.setData([
          { time: (now - 3600) as UTCTimestamp, open: 0, high: 0, low: 0, close: 0 },
          { time: now as UTCTimestamp, open: 0, high: 0, low: 0, close: 0 },
        ]);
      } else {
        series.setData(finalChartData);
      }
    }

    // 3. Auto-scale after setting data
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
    };
  }, [ohlcData, trades, ethPrice, isDummyToken]);

  // Handle loading/errors
  if (priceError) return <div className="p-4 text-red-500">Error loading ETH price: {priceError}</div>;
  if (!ethPrice) return <div className="p-4">Loading ETH price...</div>;
  if (loading) return <div className="p-4">Loading chart data…</div>;
  if (dataError) return <div className="p-4 text-red-500">Error loading data: {dataError}</div>;

  // If not a dummy token, show geckoterminal embed (your existing code)
  const showGeckoTerminal = poolAddress && !isDummyToken;

  return (
    <div style={{ width: '100%' }}>
      {showGeckoTerminal ? (
        <iframe
          height="400px"
          width="100%"
          id="geckoterminal-embed"
          title="GeckoTerminal Embed"
          src={`https://www.geckoterminal.com/base/pools/${poolAddress}?embed=1&info=0&swaps=0&grayscale=1&light_chart=0&chart_type=price&resolution=15m`}
          frameBorder="0"
          allow="clipboard-write"
          allowFullScreen
        ></iframe>
      ) : (
        <div className={styles.chartContainer}>
          <div 
            ref={chartContainerRef} 
            style={{ width: '100%', height: '500px' }} 
          />
        </div>
      )}
    </div>
  );
}
