"use client";

import { useState } from "react";
import Notification from "@/components/utils/Notification";
import { useEthereum } from "@/hooks/useEthereum";
import { Agent } from "@/lib/types";

import styles from "./TradingForm.module.css";

interface TradingFormProps {
  agent: Agent;
}

export default function TradingForm({ agent }: TradingFormProps) {
  const [amount, setAmount] = useState("");
  const [isBuying, setIsBuying] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState("");
  const { loading: notificationLoading, buy, sell, approve, approved } = useEthereum({ agent });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isBuying) {
        await buy(amount);
        setAmount("");
      } else {
        if (!approved) {
          await approve();
        } else {
          await sell(amount);
          setAmount("");
        }
      }
    } catch (error) {
      setShowError("Transaction failed: " + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {showError && <Notification message={showError} type="error" />}
      {notificationLoading.isLoading && <Notification message={notificationLoading.message} type="info" />}
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.tabs}>
          <button
            type="button"
            className={`${styles.tab} ${isBuying ? styles.active : ""}`}
            onClick={() => setIsBuying(true)}
            disabled={isLoading}
          >
            Buy
          </button>
          <button
            type="button"
            className={`${styles.tab} ${!isBuying ? styles.active : ""}`}
            onClick={() => setIsBuying(false)}
            disabled={isLoading}
          >
            Sell
          </button>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="amount">Amount</label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter amount"
            min="0"
            step="1"
            required
            disabled={isLoading}
          />
        </div>

        <button type="submit" className={styles.submitButton} disabled={isLoading}>
          {isLoading ? "Processing..." : isBuying ? "Buy Tokens" : approved ? "Sell Tokens" : "Approve Sell"}
        </button>
      </form>
    </>
  );
}
