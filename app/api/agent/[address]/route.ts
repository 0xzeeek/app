import { getAgentDetails } from "@/functions";

// POST USER INFO ENDPOINT
export async function GET(request: Request, { params }: { params: Promise<{ address: string }> }) {
  try {

    const { address } = await params;

    const { success, data } = await getAgentDetails(address);

    if (!success || !data) {
      return new Response(JSON.stringify({ success: false, message: "Agent not found" }), { status: 404 });
    }

    const { name, ticker, user, curve, image, username, bio } = data;

    return new Response(JSON.stringify({ success: true, data: { name, ticker, address, user, curve, image, username, bio } }), { status: 200 });
  } catch (error) {
    console.error(error);
    console.error(new Error(`Unable to generate response: ${error}`));
    return new Response(JSON.stringify({ success: false, message: "Unable to generate response" }), { status: 500 });
  }
}