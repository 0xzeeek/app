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

  return (
    <div className={styles.main}>
      <h1>Recent Agents</h1>
      <div className={styles.agentsContainer}>
        {agents.map((agent) => (
          <AgentCard key={agent.address} agent={agent} />
        ))}
      </div>
    </div>
  );
}
