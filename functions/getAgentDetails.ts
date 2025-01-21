import { Agent } from "@/lib/types";

export default async function getAgentDetails(
  address: string
): Promise<{ success: boolean; data?: Agent; message?: string }> {
  try {
    // Fetch the agent data from DynamoDB

    // TODO: update to lambda function call
    // const result = await ddb.send(
    //   new GetCommand({
    //     TableName: Resource.AgentData.name,
    //     Key: { agent: address },
    //   })
    // );

    // Check if the user exists
    // if (!result.Item) {
    //   return { success: false, message: "User not found" };
    // }

    return {
      success: true,
      data: {
        name: result.Item.name,
        ticker: result.Item.ticker,
        address: result.Item.agent,
        user: result.Item.user,
        curve: result.Item.curve,
        image: result.Item.image,
        username: result.Item.username,
        bio: result.Item.bio,
      },
    };
  } catch (error) {
    console.error(new Error(`Agent details error: ${error}`));
    return { success: false, message: "Internal server error during agent details" };
  }
}
