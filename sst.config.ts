// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "3agent",
      region: "us-east-1",
      providers: {
        aws: {
          profile: "3agent",
        },
      },
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
    };
  },
  async run() {
    // Create a rate limit dynamo table
    const rateLimitTable = new sst.aws.Dynamo("RateLimitData", {
      fields: {
        ip: "string", // Partition key
      },
      primaryIndex: { hashKey: "ip" },
    });

    // S3 Buckets
    const agentImage = new sst.aws.Bucket("AgentImage", {
      access: "public",
    });

    const characterFile = new sst.aws.Bucket("CharacterFile", {
      access: "public",
    });

    const createAgent = new sst.aws.Function("CreateAgent", {
      handler: "lambda/createAgent.handler",
      link: [characterFile, rateLimitTable],
      url: true,
      timeout: "5 minutes",
      environment: {
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
        SERVER_URL: process.env.SERVER_URL || "",
        ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || "",
      },
    });

    new sst.aws.Nextjs("Next", {
      link: [agentImage],
      environment: {
        NEXT_PUBLIC_CREATE_AGENT_URL: createAgent.url,
        NEXT_PUBLIC_WEBSOCKET_URL: process.env.NEXT_PUBLIC_WEBSOCKET_URL || "",
        NEXT_PUBLIC_DEPLOY_BLOCK: process.env.NEXT_PUBLIC_DEPLOY_BLOCK || "",

        // RPC URLs
        NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || "",
        NEXT_PUBLIC_WEBSOCKET_RPC_URL: process.env.NEXT_PUBLIC_WEBSOCKET_RPC_URL || "",

        // Private variables
        SERVER_RPC_URL: process.env.SERVER_RPC_URL || "",
        SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN || "",

        // ADDRESSES
        NEXT_PUBLIC_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "",
        NEXT_PUBLIC_WETH_ADDRESS: process.env.NEXT_PUBLIC_WETH_ADDRESS || "",
        NEXT_PUBLIC_UNISWAP_V3_FACTORY_ADDRESS: process.env.NEXT_PUBLIC_UNISWAP_V3_FACTORY_ADDRESS || "",
        NEXT_PUBLIC_UNISWAP_V3_QUOTER_ADDRESS: process.env.NEXT_PUBLIC_UNISWAP_V3_QUOTER_ADDRESS || "",
        NEXT_PUBLIC_CHAINLINK_ETH_USD_FEED: process.env.NEXT_PUBLIC_CHAINLINK_ETH_USD_FEED || "",
      },
      domain: {
        name: "3agent.fun",
        redirects: ["www.3agent.fun"],
      },
    });
  },
});
