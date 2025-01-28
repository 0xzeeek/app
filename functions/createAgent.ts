import axios from "axios";
import { encryptPassword, getTwitterData, createCharacterFile } from "@/functions";

export default async function createAgent({
  token,
  name,
  ticker,
  curve,
  user,
  image,
  background,
  username,
  email,
  password,
}: {
  token: `0x${string}`;
  name: string;
  ticker: string;
  curve: `0x${string}`;
  user: `0x${string}`;
  image: string;
  background: string;
  username: string;
  email: string;
  password: string;
}) {
  try {
    const [characterFile, twitterData] = await Promise.all([
      createCharacterFile(name, background),
      getTwitterData(username),
    ]);
    const encryptedPassword = encryptPassword(password);

    const createResponse = await axios.post(`${process.env.SERVER_URL}/create`, {
      agentId: token,
      name,
      ticker,
      curve,
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
      return { success: false, message: "Failed to create agent" };
    }

    // TODO: turn on start agent
    // const startResponse = await axios.post(`${process.env.SERVER_URL}/start`, {
    //   agentId: token,
    //   characterFile,
    //   twitterCredentials: {
    //     username,
    //     email,
    //     password: encryptedPassword,
    //   },
    // });

    // if (!startResponse.data?.success) {
    //   console.error(new Error(startResponse.data.error));
    //   return { success: false, message: "Failed to start agent" };
    // }

    return { success: true };
  } catch (error) {
    console.error(new Error("An unknown error occurred:", { cause: error }));
    return { success: false, message: "An unknown error occurred in createAgent" };
  }
}
