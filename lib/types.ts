// lib/types.ts

export interface Agent {
  agentId: `0x${string}`;
  name: string;
  image: string;
  ticker: string;
  username: string;
  email: string;
  password?: string;
  bio: string;
  description: string;
  characterFile: string;
  curve: `0x${string}`;
  user: `0x${string}`;
}

export interface Message {
  id: number;
  text: string;
  sender: "user" | "agent";
  timestamp: Date;
}

export interface CreateResult {
  token: `0x${string}`;
  curve: `0x${string}`;
}

export interface ErrorResult {
  message: string;
}
