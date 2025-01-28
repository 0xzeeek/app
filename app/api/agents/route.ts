import { ethers } from "ethers";
import { Agent } from "@/lib/types";

import FACTORY_ABI from "@/lib/factoryAbi.json";
// import ERC20_ABI from "@/lib/erc20Abi.json";
import { getAgentDetails } from "@/functions";

// TODO: update to env variable
// const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x") as `0x${string}`;

const FACTORY_ADDRESS = "0xc72e0cF6E650dAb2bd1f312C59F459A31046Fdc2";

export async function GET() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

    const totalAgentsBigInt = await factory.getDeploymentsCount();
    const totalAgents = Number(totalAgentsBigInt); // Convert from bigint to number

    // TODO: decide how to paginate the agents
    const count = Math.min(totalAgents, 10);
    console.log(`Total agents: ${totalAgents}`);

    const agents: Agent[] = [];

    // If totalAgents is 10, we get [0..9], last 20 means [0..9], if total 100 means [80..99]
    const startIndex = totalAgents > 0 ? totalAgents - count : 0;

    // Create an array of promises for parallel execution
    const agentPromises = Array.from({ length: count }, async (_, index) => {
      const i = startIndex + index;
      const { token: agentId } = await factory.deployments(i);
      const { success, data } = await getAgentDetails(agentId);

      if (!success || !data) {
        return null;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { password, ...rest } = data;

      return rest;
    });

    // Execute all promises in parallel and filter out null results
    const results = await Promise.all(agentPromises);
    agents.push(...results.filter(agent => agent !== null));

    return new Response(JSON.stringify({ success: true, data: agents }), { status: 200 });
  } catch (error) {
    console.error(error);
    console.error(new Error(`Unable to generate response: ${error}`));
    return new Response(JSON.stringify({ success: false, message: "Unable to generate response" }), { status: 500 });
  }
}
