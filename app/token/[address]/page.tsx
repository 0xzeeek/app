"use client";

import { useEffect, useState, use } from "react";
import CurveChart from "@/components/chart/CurveChart";
import TradingForm from "@/components/trade/TradingForm";
import styles from "./page.module.css";
import { ethers } from "ethers";
import { useRouter } from "next/navigation";
import axios from "axios";
import { Agent } from "@/lib/types";
import Loading from "@/components/layout/Loading";
import { useEthereum } from "@/hooks/useEthereum";

export default function TokenTradingPage({ params }: { params: Promise<{ address: string }> }) {
  const [isValidAddress, setIsValidAddress] = useState(true);
  const [loading, setLoading] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [price, setPrice] = useState<string | undefined>(undefined);
  const [marketCap, setMarketCap] = useState<string | undefined>(undefined);
  const { address } = use(params);
  const router = useRouter();
  const { fetchPriceAndMarketCap } = useEthereum();

  useEffect(() => {
    async function checkAddressAndAgent() {
      setLoading(true);
      try {
        // Validate the Ethereum address
        ethers.getAddress(address);
        setIsValidAddress(true);

        // Check if address is an agent
        const response = await axios.get(`/api/agent/${address}?showRemoved=true`);
        if (response.data.success) {
          const agent = response.data.data;
          if (agent.remove === "true") {
            setAgent(agent);
          } else {
            // If agent exists, redirect to agent page
            router.push(`/agent/${address}`);
            return;
          }
        }
      } catch {
        setIsValidAddress(false);
      }
      setLoading(false);
    }

    checkAddressAndAgent();
  }, [address, router]);

  useEffect(() => {
    const fetchData = async () => {
      const result = await fetchPriceAndMarketCap(agent!);
      if (result) {
        const { price, marketCap } = result;
        setPrice(price);
        setMarketCap(marketCap);
      }
    };

    if (agent) {
      fetchData();
    }
  }, [agent, fetchPriceAndMarketCap]);

  if (loading) {
    return <Loading />;
  }

  if (!isValidAddress) {
    return (
      <div className={styles.container}>
        <h1>Invalid Token Address</h1>
        <p>The provided address is not a valid Ethereum address.</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className={styles.container}>
        <h1>Agent Not Found</h1>
        <p>The provided address is not a valid agent.</p>
      </div>
    );
  }

  return (
    <div className={styles.main}>
      <div className={styles.container}>
        <div className={styles.warningBanner}>
          <p>This agent has been removed from the marketplace, but you can still trade its tokens.</p>
        </div>

        <div className={styles.metrics}>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Price</span>
            <span className={styles.metricValue}>${price || "---"}</span>
          </div>
          <div className={styles.metricItem}>
            <span className={styles.metricLabel}>Market Cap</span>
            <span className={styles.metricValue}>${marketCap || "---"}</span>
          </div>
        </div>

        <div className={styles.tradingLayout}>
          <div className={styles.chartSection}>
            <CurveChart tokenAddress={address} curveAddress={agent.curve} block={agent.block} />
          </div>

          <div className={styles.tradeSection}>
            <TradingForm agent={agent} />
          </div>
        </div>
        <div className={styles.details}>
          <p>
            <strong>Address:</strong> {agent?.agentId}
          </p>
          <p>
            <strong>Curve:</strong> {agent?.curve}
          </p>
        </div>
      </div>
    </div>
  );
}
