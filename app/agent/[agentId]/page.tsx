import { notFound } from "next/navigation";
import AgentDetails from "@/components/agent/AgentDetails";

import styles from "./page.module.css";
import { Agent } from "@/lib/types";
import axios from "axios";

interface AgentPageProps {
  params: Promise<{ agentId: string }>;
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { agentId } = await params;
  // const agent: Agent | undefined = (await getAgentDetails(address)).data;

  const response = await axios.get(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/agent/${agentId}`);
  const result = response.data;

  if (!result.success) {
    notFound();
  }

  const agent: Agent = await result.data;

  if (!agent) {
    notFound();
  }

  return (
    <>
      <div className={styles.container}>
        <div className={styles.infoRow}>
          <AgentDetails key={agent.agentId} agent={agent} />
        </div>
        <div className={styles.details}>
          <p>
            <strong>Address:</strong> {agent?.agentId}
          </p>
          <p>
            <strong>Creator:</strong> {agent?.user}
          </p>
          <p>
            <strong>Curve:</strong> {agent?.curve}
          </p>
        </div>
      </div>
    </>
  );
}
