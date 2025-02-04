"use client";

import { useState, useEffect, useRef } from "react";
import { Agent, Message } from "@/lib/types";
import styles from "./AgentChat.module.css";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAccount } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

interface AgentChatProps {
  agent: Agent;
}

export default function AgentChat({ agent }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { address, isConnected } = useAccount();
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const {
    connect,
    sendMessage,
    isConnected: websocketConnected,
  } = useWebSocket(
    process.env.NEXT_PUBLIC_WEBSOCKET_URL || "", 
    (data) => {
      if (data.type === "response") {
        setIsTyping(false);
        console.log("data", data);
        const agentMessage: Message = {
          id: Date.now(),
          text: data.message?.[0].text || "hello",
          sender: "agent",
          timestamp: new Date(),
        };
        // Keep all messages except the last one if it's a pending message
        setMessages((prev) => {
          const messages = prev.slice();
          if (messages.length > 0 && messages[messages.length - 1].text === "...") {
            messages.pop();
          }
          return [...messages, agentMessage];
        });
      } else if (data.type === "init_success") {
        const connectionMessage: Message = {
          id: Date.now(),
          text: `Connected to ${agent.name}`,
          sender: "agent",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, connectionMessage]);
      }
    },
    () => {
      // Clear messages on disconnect
      setMessages([]);
      setIsTyping(false);
    }
  );

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;

    const userMessage: Message = {
      id: Date.now(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsTyping(true);

    // Add a temporary "typing" message
    const typingMessage: Message = {
      id: Date.now() + 1,
      text: "...",
      sender: "agent",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, typingMessage]);

    // Send message through WebSocket
    sendMessage({
      type: "message",
      agentId: agent.agentId,
      text: input,
      username: address,
      userId: address,
    });

    console.log("address", address);
  };

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();

    console.log("Connecting to WebSocket");
    if (!address) return;
    connect(agent.agentId, agent.characterFile, address, address);
    console.log("Connected to WebSocket");
    console.log("address", address);
  };

  if (!isConnected) {
    return (
      <div className={styles.connectWallet}>
        <p>Please connect your wallet to chat</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className={styles.chatContainer}>
      <div ref={containerRef} className={styles.messages}>
        {messages.map((message) => {
          return (
            <div
              key={message.id}
              className={`${styles.message} ${message.sender === "agent" ? styles.agent : styles.user}`}
            >
              <div className={styles.messageContent}>
                {message.text === "..." ? (
                  <div className={styles.typingIndicator}>
                    <span>.</span>
                    <span>.</span>
                    <span>.</span>
                  </div>
                ) : (
                  message.text
                )}
              </div>
              <div className={styles.timestamp}>{message.timestamp.toLocaleTimeString()}</div>
            </div>
          );
        })}
      </div>

      <form onSubmit={(e) => websocketConnected ? handleSubmit(e) : handleConnect(e)} className={styles.inputForm}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className={styles.input}
          disabled={isTyping}
        />
          <button type="submit" className={styles.sendButton} disabled={isTyping}>
            {websocketConnected ? "Send" : "Connect"}
          </button>
      </form>
      <p className={styles.betaDisclaimer}>* Chat is in beta right now and can be unstable</p>
    </div>
  );
}
