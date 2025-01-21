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

    new sst.aws.Nextjs("Next", {
      environment: {
        // VERIFY_API_URL: service.url,
      },
      // domain: {
      //   name: "3agent.fun",
      //   redirects: ["www.3agent.fun"]
      // },
      link: [agentImage, characterFile, rateLimitTable],
    });
  },
});
