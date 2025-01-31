import { getAgentDetails } from "@/functions";
import axios from "axios";

// POST USER INFO ENDPOINT
export async function GET(request: Request, { params }: { params: Promise<{ agentId: string }> }) {

  // get Url params
  const url = new URL(request.url);
  const showRemoved = url.searchParams.get("showRemoved") === "true";

  try {

    const { agentId } = await params;

    const { success, data } = await getAgentDetails(agentId, showRemoved);

    if (!success || !data) {
      return new Response(JSON.stringify({ success: false, message: "Agent not found" }), { status: 200 });
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...rest } = data;

    return new Response(JSON.stringify({ success: true, data: rest }), { status: 200 });
  } catch (error) {
    console.error(error);
    console.error(new Error(`Unable to generate response: ${error}`));
    return new Response(JSON.stringify({ success: false, message: "Unable to generate response" }), { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  const { agentId } = await params;

  const response = await axios.delete(`${process.env.SERVER_URL}/remove?agentId=${agentId}`);
  const result = response.data;
  if (result.success) {
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } else {
    return new Response(JSON.stringify({ success: false, message: result.message }), { status: 500 });
  }
}