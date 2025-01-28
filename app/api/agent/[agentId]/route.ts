import { getAgentDetails } from "@/functions";

// POST USER INFO ENDPOINT
export async function GET(request: Request, { params }: { params: Promise<{ agentId: string }> }) {
  try {

    const { agentId } = await params;

    const { success, data } = await getAgentDetails(agentId);

    if (!success || !data) {
      return new Response(JSON.stringify({ success: false, message: "Agent not found" }), { status: 404 });
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