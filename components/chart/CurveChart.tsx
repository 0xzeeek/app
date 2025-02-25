"use client";

import React, { useEffect, useRef } from "react";
import { createChart, IChartApi, ISeriesApi, LineData, Time } from "lightweight-charts";
import { useDataFeed } from "@/hooks/useDataFeed";
import { useEthPrice } from "@/hooks/useEthPrice";

interface CurveChartProps {
  tokenAddress: string;
  curveAddress: string;
  block: string;
}

export default function CurveChart({ tokenAddress, curveAddress, block }: CurveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { ohlcData, trades, loading, error: dataError, poolAddress } = useDataFeed(curveAddress, tokenAddress, block);
  const { ethPrice, error: priceError } = useEthPrice();

  // const geckoTerminalRef = useRef<HTMLDivElement>(<div><</div>);

  useEffect(() => {
    if (!chartContainerRef.current || !ethPrice) return;

    // 1. Create the chart
    const chart: IChartApi = createChart(chartContainerRef.current, {
      width: 600,
      height: 400,
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

    // 2. Decide whether to show candles or a line based on data length
    let series: ISeriesApi<"Candlestick"> | ISeriesApi<"Line">;
    const CANDLE_THRESHOLD = 10; // or whatever number you want

    console.log("ohlcData", ohlcData);
    console.log("trades", trades);

    if (ohlcData.length < CANDLE_THRESHOLD) {
      // ---- Use Line series ----
      series = chart.addLineSeries({
        color: "#26a69a", // or your preferred line color
        lineWidth: 2,
      });

      // Convert OHLC data to an array of { time, value } for the line
      const lineData: LineData[] = ohlcData.map((candle) => ({
        time: candle.time as Time,
        value: candle.close * ethPrice,
      }));

      if (!lineData.length) {
        // If absolutely no data, set a dummy data point for the chart
        const now = Math.floor(Date.now() / 1000);
        series.setData([
          { time: (now - 3600) as Time, value: 0 },
          { time: now as Time, value: 0 },
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
          minMove: 0.0000000001,
        },
      });

      // Convert OHLC data to candle format in dollar terms
      const finalChartData = ohlcData.map((c) => ({
        time: c.time as Time,
        open: c.open * ethPrice,
        high: c.high * ethPrice,
        low: c.low * ethPrice,
        close: c.close * ethPrice,
      }));

      if (!finalChartData.length) {
        // If absolutely no data, set a dummy candle
        const now = Math.floor(Date.now() / 1000);
        series.setData([
          { time: (now - 3600) as Time, open: 0, high: 0, low: 0, close: 0 },
          { time: now as Time, open: 0, high: 0, low: 0, close: 0 },
        ]);
      } else {
        series.setData(finalChartData);
      }
    }

    // 3. Auto-scale after setting the data
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
    };
  }, [ohlcData, trades, ethPrice]);

  if (priceError) return <div className="p-4 text-red-500">Error loading ETH price: {priceError}</div>;
  if (!ethPrice) return <div className="p-4">Loading ETH price...</div>;
  if (loading) return <div className="p-4">Loading chart data…</div>;
  if (dataError) return <div className="p-4 text-red-500">Error loading data: {dataError}</div>;

  // TODO: test bonded pool address with GeckoTerminal

  return (
    <div>
      {poolAddress ? (
        <iframe
          height="400px"
          width="600px"
          id="geckoterminal-embed"
          title="GeckoTerminal Embed"
          src={`https://www.geckoterminal.com/base/pools/${poolAddress}?embed=1&info=0&swaps=0&grayscale=1&light_chart=0&chart_type=price&resolution=15m`}
          frameBorder="0"
          allow="clipboard-write"
          allowFullScreen
        ></iframe>
      ) : (
        <div ref={chartContainerRef} />
      )}
    </div>
  );
}
