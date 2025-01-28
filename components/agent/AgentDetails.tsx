"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import CurveChart from "@/components/chart/CurveChart";
import TradingForm from "@/components/agent/TradingForm";
import AgentChat from "@/components/agent/AgentChat";

import { Agent } from "@/lib/types";

import styles from "./AgentDetails.module.css";
import { useEthereum } from "@/hooks/useEthereum";

interface AgentDetailsProps {
  agent: Agent;
}

export default function AgentDetails({ agent }: AgentDetailsProps) {
  const { fetchPriceAndMarketCap } = useEthereum({ agent });
  const [price, setPrice] = useState(0);
  const [marketCap, setMarketCap] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      const result = await fetchPriceAndMarketCap();
      if (result) {
        const { priceInETH, marketCapInETH } = result;
        setPrice(priceInETH);
        setMarketCap(marketCapInETH);
      }
    };

    fetchData();
  }, [agent]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          {agent.image && (
            <div className={styles.imageWrapper}>
              <Image
                src={agent.image}
                alt={agent.name}
                width={64}
                height={64}
                className={styles.agentImage}
              />
            </div>
          )}
          <div className={styles.headerInfo}>
            <div className={styles.headerInfoLeft}>
              <h1>{agent.name}</h1>
              <h3>${agent.ticker}</h3>
            </div>

            <div className={styles.tokenInfo}>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Price:</span>
                  <span className={styles.value}>${price}</span>
                </div>
                <div className={styles.infoItem}>
                  <span className={styles.label}>Market Cap:</span>
                  <span className={styles.value}>{marketCap}</span>
                </div>
              </div>
            
            <div className={styles.headerInfoRight}>
              {agent.username && (
                <a
                  href={`https://twitter.com/${agent.username}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.twitterLink}
                >
                  <svg 
                    viewBox="0 0 24 24" 
                    width="24" 
                    height="24" 
                    className={styles.xIcon}
                  >
                    <path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                  <span>@{agent.username}</span>
                </a>
              )}
              {agent.bio && (
                <p className={styles.bio}>{agent.bio}</p>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <div className={styles.mainContent}>
        <div className={styles.chartSection}>
          <CurveChart agent={agent} />
        </div>
        
        <div className={styles.tradingForm}>
          <TradingForm agent={agent} />
        </div>
      </div>

      <div className={styles.chatSection}>
        <AgentChat agent={agent} />
      </div>
    </div>
  );
}
