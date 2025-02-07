'use client';

import { notFound, useParams } from "next/navigation";
import AgentDetails from "@/components/agent/AgentDetails";
import styles from "./page.module.css";
import { Agent } from "@/lib/types";
import axios from "axios";
import { useEffect, useState } from "react";
import Loading from "@/components/layout/Loading";
export default function AgentPage() {
  const params = useParams();
  const agentId = params.agentId as string;
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchAgent = async () => {
      try {
        const response = await axios.get(`/api/agent/${agentId}`);
        const result = response.data;

        if (!result.success || !result.data) {
          setError(true);
          return;
        }

        setAgent(result.data);
      } catch (error) {
        console.error(error);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [agentId]);

  if (loading) {
    return <Loading />;
  }

  if (error || !agent) {
    notFound();
  }

  return (
    <div className={styles.container}>
      <div className={styles.infoRow}>
        <AgentDetails key={agent.agentId} agent={agent} />
      </div>
      <div className={styles.details}>
        <p>
          <strong>Address:</strong> {agent.agentId}
        </p>
        <p>
          <strong>Creator:</strong> {agent.user}
        </p>
        <p>
          <strong>Curve:</strong> {agent.curve}
        </p>
      </div>
    </div>
  );
}
