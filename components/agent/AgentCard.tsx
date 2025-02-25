"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Agent } from "@/lib/types";
import styles from "./AgentCard.module.css";
import { useEthereum } from "@/hooks/useEthereum";
interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  const xHandle = agent.username?.startsWith("@") ? agent.username : `@${agent.username}`;
  const xBio = agent.bio && agent.bio.length > 50 ? `${agent.bio.substring(0, 50)}...` : agent.bio;

  const [marketCap, setMarketCap] = useState<string>("0");
  const { fetchPriceAndMarketCap } = useEthereum({ agent});

  useEffect(() => {
    const fetchData = async () => {
      const result = await fetchPriceAndMarketCap(agent);
      if (result) {
        const { marketCap } = result;
        setMarketCap(marketCap);
      }
    };


    if (agent) {
      fetchData();
    }
  }, [agent, fetchPriceAndMarketCap]);

  return (
    <div>
      <Link href={`/agent/${agent.agentId}`} className={styles.card}>
        <div className={styles.imageContainer}>
          <img
            src={agent.image || "/default-agent.png"}
            alt={`${agent.name} logo`}
            width={100}
            height={100}
            className={styles.agentImage}
          />
        </div>
        <div className={styles.content}>
          <h3>
            {agent.name} <span className={styles.ticker}>${agent.ticker}</span>
          </h3>
          <div className={styles.xHandle}>{xHandle}</div>
          <div className={styles.xBio}>{xBio}</div>
        </div>
      </Link>
      {marketCap !== "0.00000000" && marketCap !== "0" && (
        <div className={styles.priceContainer}>
          <p>Market Cap: ${marketCap}</p>
        </div>
      )}
    </div>
  );
}
