import React from "react";
import AgentCard from "@/components/agent/AgentCard";
import { Agent } from "@/lib/types";

import styles from "./page.module.css";

export default async function HomePage() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/agents`, { cache: "no-store" });
  const result = await response.json();

  if (!result.success) {
    console.error(new Error("Failed to fetch agents", { cause: result.error }));
  }

  const agents: Agent[] = result.data;
  agents.reverse();

  return (
    <div className={styles.main}>
      <div className={styles.contentContainer}>
        <div className={styles.headerSection}>
          <h1>Recently Deployed Agents</h1>
          <p className={styles.subtitle}>Agent tokens are deployed on base. Agents die if not bonded within 48 hours.</p>
        </div>
        <div className={styles.agentsContainer}>
          {agents.map((agent) => (
            <AgentCard key={agent.agentId} agent={agent} />
          ))}
        </div>
      </div>
    </div>
  );
}
