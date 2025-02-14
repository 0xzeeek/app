import axios from "axios";
import { Agent } from "@/lib/types";

export default async function getAgentDetails(
  agentId: string,
  showRemoved: boolean = false
): Promise<{ success: boolean; data?: Agent; message?: string }> {
  try {
    const response = await axios.get(`${process.env.SERVER_URL}/agent?agentId=${agentId}`);
    const result = response.data;
    if (!result.success) {
      return { success: false, message: "Agent not found" };
    }
    const agent = result.data;

    if (agent.remove === "true" && !showRemoved) {
      return { success: false, message: "Agent removed" };
    }

    return { success: true, data: agent };
  } catch (error) {
    console.error(new Error(`Agent details error`, { cause: error }));
    return { success: false, message: "Internal server error during agent details" };
  }
}
