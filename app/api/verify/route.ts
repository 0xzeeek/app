// POST VERIFY TWITTER ENDPOINT
import { Scraper } from "agent-twitter-client";
import * as Sentry from '@sentry/nextjs';
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
    Sentry.captureException("Unable to verify twitter account", {
      extra: {
        error: error,
      },
    });
    return new Response(JSON.stringify({ success: false, message: "Unable to verify twitter account" }), {
      status: 200,
    });
  }
}
