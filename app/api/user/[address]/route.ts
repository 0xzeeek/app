import axios from "axios";

// POST USER INFO ENDPOINT
export async function GET(request: Request, { params }: { params: Promise<{ address: string }> }) {
  const { address } = await params;

  try {
    const response = await axios.get(`${process.env.SERVER_URL}/agent?userId=${address}`);
    const result = response.data;
    if (!result.success) {
      return new Response(JSON.stringify({ success: false, message: "Agents not found" }), { status: 404 });
    }
    const agents = result.data;

    return new Response(JSON.stringify({ success: true, data: agents }), { status: 200 });
  } catch (error) {
    console.error(new Error(`User agents error: ${error}`));
    return new Response(JSON.stringify({ success: false, message: "Unable to generate response" }), { status: 500 });
  }
}
