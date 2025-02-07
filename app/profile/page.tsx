"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import AgentCard from "@/components/agent/AgentCard";
import { Agent } from "@/lib/types";
import Notification from "@/components/utils/Notification";
import axios from "axios";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import * as Sentry from '@sentry/nextjs';
export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showError, setShowError] = useState<string | null>(null);
  const [hasPressedDelete, setHasPressedDelete] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`.${styles.deleteButton}`)) {
        setHasPressedDelete(null);
      }
    };

    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    const fetchAgents = async () => {
      if (!address) return;

      try {
        const response = await axios.get(`/api/user/${address}`);
        const result = response.data;

        if (!result.success) {
          throw new Error(result.error || "Failed to fetch agents");
        }

        setAgents(result.data.reverse());
      } catch (error) {
        console.error(error);
        setShowError(error instanceof Error ? error.message : "Failed to fetch agents");
      }
    };

    fetchAgents();
  }, [address]);

  const deleteAgent = async (agentId: string) => {
    if (hasPressedDelete !== agentId) {
      setShowError("Are you sure you want to delete this agent? This action cannot be undone.");
      setHasPressedDelete(agentId);
      return;
    }

    try {
      const response = await axios.delete(`/api/agent/${agentId}`);

      if (response.data.success) {
        setAgents(agents.filter((agent) => agent.agentId !== agentId));
        setHasPressedDelete(null); // Reset after successful deletion
      } else {
        setShowError(response.data.message);
      }
    } catch (error) {
      console.error(error);
      Sentry.captureException("Failed to delete agent", {
        extra: {
          error: error,
        },
      });
      setShowError("Failed to delete agent");
    }
  };

  if (!isConnected) {
    return (
      <div className={styles.main}>
        <div className={styles.container}>
          <h1 className={styles.title}>Profile</h1>
          <p className={styles.subtitle}>Connect your wallet to view your agents</p>
          <button onClick={() => connect({ connector: injected() })} className={styles.connectButton}>
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showError && <Notification message={showError} type="error" />}
      <div className={styles.main}>
        <div className={styles.contentContainer}>
          <div className={styles.headerSection}>
            <h1>Profile</h1>
            <p className={styles.subtitle}>Your Agents</p>
          </div>

          <div className={styles.agentGrid}>
            {agents.map((agent) => (
              <div key={agent.agentId} className={styles.agentCardContainer}>
                <AgentCard agent={agent} />
                <div className={styles.deleteContainer}>
                  <button className={styles.deleteButton} onClick={() => deleteAgent(agent.agentId)}>
                    {hasPressedDelete === agent.agentId ? "Delete" : "X"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
