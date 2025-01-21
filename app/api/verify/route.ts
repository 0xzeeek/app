// POST VERIFY TWITTER ENDPOINT
import { Scraper } from "agent-twitter-client";

export async function POST(request: Request) {
  try {
    const { username, password, email } = await request.json();
    console.log(username, password, email);

    const scraper = new Scraper(username);
    await scraper.login(username, password, email);

    return new Response(JSON.stringify({ success: true }), { status: 200 });
  } catch (error) {
    console.error(error);
    console.error(new Error(`Unable to verify twitter account: ${error}`));
    return new Response(JSON.stringify({ success: false, message: "Unable to verify twitter account" }), {
      status: 500,
    });
  }
}
