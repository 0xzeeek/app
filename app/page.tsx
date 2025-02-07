"use client";
import React, { useEffect, useState } from "react";
import axios from "axios";
import LoadingMultiple from "@/components/layout/LoadingMultiple";
import AgentCard from "@/components/agent/AgentCard";
import Popup from "@/components/common/Popup";
import { Agent } from "@/lib/types";
import * as Sentry from '@sentry/nextjs';

import styles from "./page.module.css";

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}

export default function HomePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showPopup, setShowPopup] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginationData, setPaginationData] = useState<PaginationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch agents
  const fetchAgents = async (page: number) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`/api/agents/${page}`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error("Failed to fetch agents", { cause: result.error });
      }
      
      setAgents(result.data);
      setPaginationData(result.pagination);
    } catch (error) {
      console.error("Error fetching agents:", error);
      Sentry.captureException("Error fetching agents", {
        extra: {
          error: error,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const hasSeenPopup = localStorage.getItem('hasSeenPopup');
    if (!hasSeenPopup) {
      setShowPopup(true);
    }

    fetchAgents(currentPage);
  }, [currentPage]);

  const handleClosePopup = () => {
    setShowPopup(false);
    localStorage.setItem('hasSeenPopup', 'true');
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.main}>
      {showPopup && <Popup onClose={handleClosePopup} />}
      <div className={styles.contentContainer}>
        <div className={styles.headerSection}>
          <h1>Recently Deployed Agents</h1>
          <p className={styles.subtitle}>All agent $TOKENS are deployed on Base | Agents that don&apos;t bond within 48 hours are killed</p>
        </div>
        
        {isLoading ? (
          <LoadingMultiple />
        ) : (
          <div className={styles.agentsContainer}>
            {agents.map((agent) => (
              <AgentCard key={agent.agentId} agent={agent} />
            ))}
          </div>
        )}

        {paginationData && paginationData.totalPages > 1 && (
          <div className={styles.pagination}>
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1 || isLoading}
              className={styles.pageButton}
            >
              ←
            </button>
            
            <span className={styles.pageInfo}>
              Page {currentPage} of {paginationData.totalPages}
            </span>

            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === paginationData.totalPages || isLoading}
              className={styles.pageButton}
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
