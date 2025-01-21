import { encryptPassword, getTwitterData } from "@/functions";

export default async function createAgent(
  name: string,
  ticker: string,
  user: `0x${string}`,
  token: `0x${string}`,
  curve: `0x${string}`,
  image: string,
  background: string,
  username: string,
  password: string
) {
  try {
    const twitterData = await getTwitterData(username);

    if (!twitterData.success) {
      throw new Error('Failed to fetch twitter data'); // TODO: maybe remove this so if twitter data is failing we can still create an agent
    }

    // TODO: create and upload character file

    // update to call lambda function to create agent

    // await ddb.send(
    //   new PutCommand({
    //     TableName: Resource.AgentData.name,
    //     Item: {
    //       agent: token,
    //       name,
    //       ticker,
    //       user,
    //       curve,
    //       image,
    //       bio: twitterData.data?.bio || '',
    //       background,
    //       characterFile,
    //       username,
    //       password: encryptPassword(password),
    //       remove: false,
    //     },
    //   })
    // );

    return { success: true };
  } catch (error: unknown) {

    if (error instanceof Error) {
      console.error(error);
      console.error(new Error(`Failed to save user info: ${error.message}`));
      return { success: false, message: 'Failed to save user info' };
    }

    console.error('An unknown error occurred:', error);
    return { success: false, message: 'An unknown error occurred' };
  }
}
