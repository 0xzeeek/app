import { Resource } from "sst";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import * as Sentry from '@sentry/nextjs'; 

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const RATE_LIMIT = 150; // Max requests allowed
const TIME_FRAME = 24 * 60 * 60 * 1000; // Time frame in milliseconds (1 day)

export default async function rateLimit(ip: string): Promise<{ success: boolean; message: string }> {
  try {
    const now = Date.now();

    // Fetch rate limit data for this IP address
    const rateLimitResult = await ddb.send(
      new GetCommand({
        TableName: Resource.RateLimitData.name,
        Key: { ip },
      })
    );

    if (rateLimitResult.Item) {
      const { count, timestamp } = rateLimitResult.Item;

      if (now - timestamp < TIME_FRAME && count >= RATE_LIMIT) {
        return { success: false, message: "Rate limit exceeded" };
      }

      // Update the count and timestamp
      await ddb.send(
        new PutCommand({
          TableName: Resource.RateLimitData.name,
          Item: {
            ip,
            count: count + 1,
            timestamp: now,
          },
        })
      );
    } else {
      // Create a new rate limit record
      await ddb.send(
        new PutCommand({
          TableName: Resource.RateLimitData.name,
          Item: {
            ip,
            count: 1,
            timestamp: now,
          },
        })
      );
    }

    return { success: true, message: "Request allowed" };
  } catch (error) {
    console.error(new Error(`Rate limiting error: ${error}`));
    Sentry.captureException("Rate limiting error", {
      extra: {
        error: error,
      },
    });
    return { success: false, message: "Internal server error during rate limiting" };
  }
}
