// CREATE CHARACTER FILE

import axios from "axios";
import { v4 as uuidv4 } from "uuid";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { Resource } from "sst";

export default async function createCharacterFile(name: string, description: string) {

    try {
  const s3Client = new S3Client({});

  const config = {
    headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
  };

  const prompt = `
    Hello!
    I'd like you to act as a character file creator for AI agents. You are given a description and name of a character and you need to create a character file for them.
    The character file should be in JSON format.
    The character file should include the following fields: 
    name - the name of the character,
    bio - topics that make up the agent bio, 
    lore - some facts about the agent that adds to their backstory, 
    postExamples - some things they might post about on twitter, 
    topics - some topics they might enjoy talking about, 
    adjectives - ways that you would describe this agent.
    system - the system prompt for the agent, ex "Roleplay and generate responses as {name} in the style of {style you come up with}"
    all fields should be formatted as an array of strings except for the system field and the following fields:
    messageExamples - some examples of messages they might send in the following format:
    "messageExamples": [
      [
        {
            "user": "{{user1}}",
            "content": {
            "text": "{{Some question posed by the user}}?"
            }
        },
        {
            "user": "{{agent name}}",
            "content": {
            "text": "{{The answer to the question posed by the user}}"
            }
        }
      ],
    style - the style of the character's communication.
    "style": {
      "all": [
        "style for all communication"
      ],
      "chat": [
        "the tone of the character"
      ],
      "post": [
        "post examples"
      ]
    }

    here is the name of the character: ${name}
    here is the description of the character: ${description}
    please be as verbose as possible for the bio, lore, postExamples, topics, and adjectives fields and don't include any emojis.
    please be as concise as possible for the messageExamples field.
    in the messageExamples the user1 should be formatted like this: {{user1}}.
    you can infer the style of the character and the tone of the character from the description.
    you can infer the gender of the character from the name.
    Thank you!
  `;

  const body = {
    model: "anthropic/claude-3.5-sonnet",
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  };

  const response = await axios.post(`https://openrouter.ai/api/v1/chat/completions`, body, config);

  if (!response.data.choices) {
    throw new Error("Invalid character file response");
  }

  const characterFileResponse = JSON.parse(response.data.choices[0].message.content);

  // Create a new object with the desired field order
  const characterFile = {
    name: name,
    id: uuidv4(),
    modelProvider: "openrouter",
    plugins: [],
    clients: [],
    system: characterFileResponse.system,
    bio: characterFileResponse.bio,
    lore: characterFileResponse.lore,
    postExamples: characterFileResponse.postExamples,
    topics: characterFileResponse.topics,
    adjectives: characterFileResponse.adjectives,
    style: characterFileResponse.style,
    messageExamples: characterFileResponse.messageExamples,
  };

  const key = `${characterFile.id}.json`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: Resource.CharacterFile.name,
      Key: key,
      Body: JSON.stringify(characterFile),
      ContentType: "application/json",
    })
  );

    const fileUrl = `https://${Resource.CharacterFile.name}.s3.amazonaws.com/${key}`;

    return fileUrl;
  } catch (error) {
    console.error("Error creating character file", { cause: error });
    throw new Error("Error creating character", { cause: error });
  }
}
