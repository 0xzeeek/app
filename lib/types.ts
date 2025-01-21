// lib/types.ts

export interface Agent {
    name: string;
    image: string;
    ticker: string;
    username: string;
    password?: string;
    bio: string;
    address: `0x${string}`;
    curve: `0x${string}`;
    user: `0x${string}`;
  }
  
  export interface Message {
    text: string;
    from: string;
  }
  
  export interface CreateResult {
    token: `0x${string}`;
    curve: `0x${string}`;
  }

  export interface ErrorResult {
    message: string;
  }