"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import AgentCard from "@/components/agent/AgentCard";
import Popup from "@/components/common/Popup";
import { Agent } from "@/lib/types";

import styles from "./page.module.css";

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('hasSeenPopup');
    if (!hasSeenPopup) {
      setShowPopup(true);
    }
    
    // Fetch agents
    const fetchAgents = async () => {
      try {
        const response = await axios.get(`/api/agents`);
        const result = response.data;
        
        if (!result.success) {
          throw new Error("Failed to fetch agents", { cause: result.error });
        }
        
        setAgents(result.data.reverse());
      } catch (error) {
        console.error("Error fetching agents:", error);
      }
    };

    fetchAgents();
  }, []);

  const handleClosePopup = () => {
    setShowPopup(false);
    localStorage.setItem('hasSeenPopup', 'true');
  };

  return (
    <div className={styles.main}>
      {showPopup && <Popup onClose={handleClosePopup} />}
      <div className={styles.contentContainer}>
        <div className={styles.headerSection}>
          <h1>Recently Deployed Agents</h1>
          <p className={styles.subtitle}>All agent $TOKENS are deployed on Base | Agents that don&apos;t bond within 48 hours are killed</p>
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
