import { ethers } from "ethers";
import { Agent } from "@/lib/types";

import FACTORY_ABI from "@/lib/factoryAbi.json";
import { getAgentDetails } from "@/functions";

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
const RPC_URL = process.env.SERVER_RPC_URL;

export async function GET(request: Request, { params }: { params: Promise<{ page: number }> }) {
  try {
    const { page } = await params;
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const factory = new ethers.Contract(FACTORY_ADDRESS, FACTORY_ABI, provider);

    const totalAgentsBigInt = await factory.getDeploymentsCount();
    const totalAgents = Number(totalAgentsBigInt);

    // Define items per page
    const ITEMS_PER_PAGE = 20;
    
    // Calculate start and end indices for pagination
    const startIndex = totalAgents - (page * ITEMS_PER_PAGE) - 1;
    const endIndex = Math.max(startIndex - ITEMS_PER_PAGE + 1, 0);

    console.log("page", page);
    console.log("startIndex", startIndex);
    console.log("endIndex", endIndex);
    console.log("totalAgents", totalAgents);
    
    const agents: Agent[] = [];

    for (let i = startIndex; i >= endIndex; i--) {
      const { token: agentId } = await factory.deployments(i);
      const { success, data } = await getAgentDetails(agentId);

      if (!success || !data) {
        continue; 
      }

      agents.push(data);
    }

    // Calculate total pages
    const totalPages = Math.ceil(totalAgents / ITEMS_PER_PAGE);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: agents,
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: totalAgents,
          itemsPerPage: ITEMS_PER_PAGE
        }
      }), 
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    console.error(new Error(`Unable to generate response: ${error}`));
    return new Response(
      JSON.stringify({ success: false, message: "Unable to generate response" }), 
      { status: 500 }
    );
  }
}
