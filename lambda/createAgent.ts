import { APIGatewayProxyHandlerV2, APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { rateLimit, createCharacterFile, getTwitterData, encryptPassword } from "./utils";
import axios from "axios";
import { Agent } from "@/lib/types";

export const handler: APIGatewayProxyHandlerV2 = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  try {
    // Extract IP address
    const ip = event.requestContext?.http?.sourceIp || "unknown";

    if (ip === "unknown") {
      return { statusCode: 400, body: JSON.stringify({ success: false, message: "Unable to determine IP address" }) };
    }

    // Apply rate limiting
    const { success, message } = await rateLimit(ip);

    if (!success) {
      return { statusCode: 429, body: JSON.stringify({ success: false, message }) };
    }
  } catch (error) {
    console.error(new Error(`Internal server error during rate limiting: ${error}`));
    return {
      statusCode: 500,
      body: JSON.stringify({ success: false, message: "Internal server error during rate limiting" }),
    };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Request body is required" }),
      };
    }

    const data = JSON.parse(event.body);

    const { user, name, ticker, agentId, curve, block, image, background, username, email, password }: Agent = data;

    const [characterFile, twitterData] = await Promise.all([
      createCharacterFile(name, background),
      getTwitterData(username),
    ]);
    const encryptedPassword = encryptPassword(password!);

    const startResponse = await axios.post(`${process.env.SERVER_URL}/start`, {
      agentId,
      characterFile,
      twitterCredentials: {
        username,
        email,
        password: encryptedPassword,
      },
    });

    if (!startResponse.data?.success) {
      console.error(new Error(startResponse.data.error));
      return { statusCode: 200, body: JSON.stringify({ success: false, message: "Failed to start agent" }) };
    }

    const createResponse = await axios.post(`${process.env.SERVER_URL}/create`, {
      agentId,
      name,
      ticker,
      curve,
      block,
      user,
      characterFile,
      image,
      background,
      bio: twitterData.data?.bio || "",
      username,
      email,
      password: encryptedPassword,
    });

    if (!createResponse.data?.success) {
      console.error(new Error(createResponse.data.error));
      return { statusCode: 200, body: JSON.stringify({ success: false, message: "Failed to create agent" }) };
    }

    return { statusCode: 200, body: JSON.stringify({ success: true, data: {} }) };
  } catch (error) {
    console.error("Error creating agent", { cause: error });
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: false,
        message: "Internal server error occurred while creating the agent",
      }),
    };
  }
};
