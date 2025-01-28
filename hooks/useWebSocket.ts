import { useRef, useState } from "react";

interface WebSocketMessage {
  type: "init" | "message" | "response" | "init_success";
  agentId: string;
  message?: [
    {
      user: string;
      text: string;
      action: string;
    }
  ];
  text?: string;
  characterFile?: string;
  username?: string;
  userId?: string;
}

export function useWebSocket(url: string, onMessage: (data: WebSocketMessage) => void, onDisconnect?: () => void) {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  const connect = (agentId: string, characterFile: string, username: string, userId: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      // If already connected, just send init
      sendMessage({
        type: "init",
        agentId,
        characterFile,
        username,
        userId,
      });
      return;
    }

    // Create new connection
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      // Once connected, send init message
      sendMessage({
        type: "init",
        agentId,
        characterFile,
        username,
        userId,
      });
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data) as WebSocketMessage;
      if (data.type === "init_success") {
        setIsConnected(true);
      }
      onMessage(data);
    };

    ws.current.onerror = (error: Event) => {
      console.error("WebSocket error:", error);
      setIsConnected(false);
      onDisconnect?.();
    };

    ws.current.onclose = () => {
      setIsConnected(false);
      onDisconnect?.();
    };
  };

  const sendMessage = (message: WebSocketMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  };

  return { sendMessage, connect, isConnected };
}
