"use client";
import { useState, useEffect, useRef } from "react";
import { Agent, Message } from "@/lib/types";
import styles from "./AgentChat.module.css";

interface AgentChatProps {
  agent: Agent;
}

export default function AgentChat({ agent }: AgentChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");

  // Instead of ref for the "end" div, ref the container:
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      // Scroll the container to its own bottom
      container.scrollTo({
        top: container.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      text: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    // Simulate agent response
    setTimeout(() => {
      const agentMessage: Message = {
        id: Date.now(),
        text: `Hello! I'm ${agent.name}. How can I help you?`,
        sender: "agent",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
    }, 1000);
  };

  return (
    <div className={styles.chatContainer}>
      {/* Attach the ref here */}
      <div ref={containerRef} className={styles.messages}>
        {messages.map((message) => (
          <div
            key={message.id}
            className={`${styles.message} ${message.sender === "agent" ? styles.agent : styles.user}`}
          >
            <div className={styles.messageContent}>{message.text}</div>
            <div className={styles.timestamp}>{message.timestamp.toLocaleTimeString()}</div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className={styles.inputForm}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className={styles.input}
        />
        <button type="submit" className={styles.sendButton}>
          Send
        </button>
      </form>
    </div>
  );
}
