import { createAgent, rateLimit } from "@/functions";

// POST CREATE AGENT ENDPOINT
export async function POST(request: Request, { params }: { params: Promise<{ user: `0x${string}` }> }) {
  try {
    // Extract IP address
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || // Handles proxy headers
      request.headers.get("cf-connecting-ip") || // Cloudflare
      request.headers.get("client-ip") || // AWS ALB
      "unknown";

    if (ip === "unknown") {
      return new Response(JSON.stringify({ success: false, message: "Unable to determine IP address" }), {
        status: 400,
      });
    }

    // Apply rate limiting
    const { success, message } = await rateLimit(ip);

    if (!success) {
      return new Response(JSON.stringify({ success: false, message }), { status: 429 });
    }
  } catch (error) {
    console.error(new Error(`Internal server error during rate limiting: ${error}`));
    return new Response(JSON.stringify({ success: false, message: "Internal server error during rate limiting" }), {
      status: 500,
    });
  }

  try {
    const { user } = await params;
    const { name, ticker, token, curve, image, background, username, email, password } = await request.json();

    const result = await createAgent({ name, ticker, user, token, curve, image, background, username, email, password });

    if (!result.success) {
      return new Response(JSON.stringify({ success: false, message: result.message }), { status: 200 });
    }

    return new Response(JSON.stringify({ success: true, data: {} }), { status: 200 });
  } catch (error) {
    console.error(new Error(`Unable to create agent`, { cause: error }));
    if (error instanceof Error) {
      return new Response(JSON.stringify({ success: false, message: error.message }), { status: 200 });
    }
    return new Response(JSON.stringify({ success: false, message: "An unknown error occurred" }), { status: 200 });
  }
}
