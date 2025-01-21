"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Agent } from "@/lib/types";
import styles from "./AgentCard.module.css";

interface AgentCardProps {
  agent: Agent;
}

export default function AgentCard({ agent }: AgentCardProps) {
  const xHandle = agent.username?.startsWith('@') ? agent.username : `@${agent.username}`;
  const xBio = agent.bio && agent.bio.length > 100 ? `${agent.bio.substring(0, 100)}...` : agent.bio;

  return (
    <Link href={`/agent/${agent.address}`} className={styles.card}>
      <div className={styles.imageContainer}>
        <Image
          src={agent.image || '/default-agent.png'}
          alt={`${agent.name} logo`}
          width={100}
          height={100}
          className={styles.agentImage}
        />
      </div>
      <div className={styles.content}>
        <h3>{agent.name} <span className={styles.ticker}>${agent.ticker}</span></h3>
        <div className={styles.xHandle}>
          {xHandle}
        </div>
        <div className={styles.xBio}>
          {xBio}
        </div>
      </div>
    </Link>
  );
}
