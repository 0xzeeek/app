import { notFound } from "next/navigation";
import AgentDetails from "@/components/agent/AgentDetails";

import styles from "./page.module.css";
import { Agent } from "@/lib/types";

interface AgentPageProps {
  params: Promise<{ agentId: string }>;
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { agentId } = await params;
  // const agent: Agent | undefined = (await getAgentDetails(address)).data;

  const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/agent/${agentId}`);
  const result = await response.json();

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
        {/* <h1 className={styles.title}>{agent?.name} ({agent?.ticker})</h1> */}
        <div className={styles.infoRow}>
          {/* <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Chart</h2>
          <Chart agentAddress={agent!.address} />
        </div>
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Chat</h2>
          <Chat agentAddress={agent!.address} />
        </div>
      </div> */}
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
