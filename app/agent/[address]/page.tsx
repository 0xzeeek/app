import { notFound } from 'next/navigation'
import { Agent } from '@/lib/types'
// import Chart from '@/components/Chart'
// import Chat from '@/components/Chat'
import styles from './page.module.css';
import AgentDetails from '@/components/agent/AgentDetails'

interface AgentPageProps {
  params: { address: string };
}

export default async function AgentPage({ params }: AgentPageProps) {
  const { address } = await params;
  // const agent: Agent | undefined = (await getAgentDetails(address)).data;

  // TODO: fetch agent data from route

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
      <AgentDetails agent={agent} />
      </div>
      <div className={styles.details}>
        <p><strong>Address:</strong> {agent?.address}</p>
        <p><strong>Creator:</strong> {agent?.user}</p>
        <p><strong>Curve:</strong> {agent?.curve}</p>
      </div>
    </div>
    </>
  );
}
