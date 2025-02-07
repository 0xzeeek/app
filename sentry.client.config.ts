// This file configures the initialization of Sentry on the client.
// The config you add here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://c1c0023d3dd9ea358b14721b3c5bb3a6@o4508775337885696.ingest.us.sentry.io/4508775339327488",

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: false,
});
