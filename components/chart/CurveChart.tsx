import React, { useEffect, useRef } from "react";
import {
  createChart,
  IChartApi,
  ISeriesApi,
  Time,
} from "lightweight-charts";
import { useDataFeed } from "@/hooks/useDataFeed";
import { Agent } from "@/lib/types";

interface CurveChartProps {
  agent: Agent;
}

export default function CurveChart({ agent }: CurveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const { ohlcData, trades, loading, error } = useDataFeed(agent.curve, agent.agentId);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // 1. Create the chart instance with modified configuration
    const chart: IChartApi = createChart(chartContainerRef.current, {
      width: 600,
      height: 400,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#333",
      },
      grid: {
        vertLines: { color: "#eee" },
        horzLines: { color: "#eee" },
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
        borderColor: "#eee",
        mode: 0, // Normal mode (not logarithmic)
      },
      localization: {
        priceFormatter: (price: number) => {
          // For very small numbers, use scientific notation
          if (price < 0.000001) {
            return price.toFixed(15);
          }
          // For small but not tiny numbers, use more decimal places
          if (price < 0.01) {
            return price.toFixed(8);
          }
          // For larger numbers, use fewer decimal places
          return price.toFixed(4);
        },
      },
    });

    // 2. Add a candlestick series with specific options
    const candlestickSeries: ISeriesApi<"Candlestick"> = chart.addCandlestickSeries({
      upColor: '#26a69a',
      downColor: '#ef5350',
      borderVisible: false,
      wickUpColor: '#26a69a',
      wickDownColor: '#ef5350',
      priceFormat: {
        type: 'price',
        precision: 10,
        minMove: 0.0000000001,
      },
    });

    // 3. Process and set the data
    const finalChartData = ohlcData.map((candle) => ({
      time: candle.time as Time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
    }));

    console.log("Setting chart data:", finalChartData);
    candlestickSeries.setData(finalChartData);

    // 4. Additional configurations for better visibility
    chart.timeScale().fitContent();

    // 5. Optional: Add price line for better reference
    // candlestickSeries.createPriceLine({
    //   price: finalChartData[finalChartData.length - 1]?.close || 0,
    //   color: '#2196F3',
    //   lineWidth: 1,
    //   lineStyle: 2, // Dashed
    //   axisLabelVisible: true,
    // });

    return () => {
      chart.remove();
    };
  }, [ohlcData, trades]);

  if (loading) return <div className="p-4">Loading chart data…</div>;
  if (error) return <div className="p-4 text-red-500">Error loading data: {error}</div>;

  return (
    <div className="border rounded-lg p-4">
      <div ref={chartContainerRef} />
    </div>
  );
}