import axios from "axios";
import { Agent } from "@/lib/types";

export default async function getAgentDetails(
  address: string
): Promise<{ success: boolean; data?: Agent; message?: string }> {
  try {
    const response = await axios.get(`${process.env.SERVER_URL}/agent?agentId=${address}`);
    const result = response.data;
    if (!result.success) {
      return { success: false, message: "Agent not found" };
    }
    const agent = result.data;

    return { success: true, data: agent };
  } catch (error) {
    console.error(new Error(`Agent details error: ${error}`));
    return { success: false, message: "Internal server error during agent details" };
  }
}
