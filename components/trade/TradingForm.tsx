"use client";

import { useState, useEffect } from "react";
import Notification from "@/components/utils/Notification";
import { useEthereum } from "@/hooks/useEthereum";
import { Agent } from "@/lib/types";
import { formatEther } from "viem";
import { readContract } from "@wagmi/core";
import config from "@/lib/wagmiConfig";
import CURVE_ABI from "@/lib/curveAbi.json";
import axios from "axios";
import ERC20_ABI from "@/lib/erc20Abi.json";
import * as Sentry from '@sentry/nextjs';
import styles from "./TradingForm.module.css";
import { useAccount } from "wagmi";

interface TradingFormProps {
  agent: Agent;
}

const UNISWAP_SWAP_URL = "https://app.uniswap.org/swap";

async function getEthPriceUSD(): Promise<number> {
  try {
    const response = await axios.get("/api/price");
    return response.data.data.price;
  } catch (error) {
    console.error("Failed to fetch ETH price:", error);
    Sentry.captureException("Failed to fetch ETH price", {
      extra: {
        error: error,
      },
    });
    return 0;
  }
}

export default function TradingForm({ agent }: TradingFormProps) {
  const [amount, setAmount] = useState("");
  const [isBuying, setIsBuying] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState("");
  const [pricePreview, setPricePreview] = useState<string>("");
  const [circulatingSupply, setCirculatingSupply] = useState<bigint>(0n);
  const [usdPrice, setUsdPrice] = useState<string>("");
  const [displayAmount, setDisplayAmount] = useState("");
  const [tokenBalance, setTokenBalance] = useState<bigint>(0n);

  
  const { loading: notificationLoading, buy, sell, finalized } = useEthereum({ agent });
  const { isConnected, address } = useAccount();

  useEffect(() => {
    updatePricePreview(amount);
  }, [amount, isBuying]);

  useEffect(() => {
    const fetchSupply = async () => {
      if (!agent) return;
      try {
        const supply = (await readContract(config, {
          abi: CURVE_ABI,
          address: agent.curve,
          functionName: "circulatingSupply",
          args: [],
        })) as bigint;
        setCirculatingSupply(supply);
      } catch (error) {
        console.error("Error fetching supply:", error);
        Sentry.captureException("Error fetching supply", {
          extra: {
            error: error,
          },
        });
      }
    };
    fetchSupply();
  }, [agent]);

  useEffect(() => {
    const fetchBalance = async () => {
      if (!agent || !isConnected) return;
      
      try {
        const balance = await readContract(config, {
          abi: ERC20_ABI,
          address: agent.agentId,
          functionName: 'balanceOf',
          args: [address],
        }) as bigint;
        
        setTokenBalance(balance);
      } catch (error) {
        console.error("Error fetching balance:", error);
        Sentry.captureException("Error fetching balance", {
          extra: {
            error: error,
          },
        });
      }
    };

    fetchBalance();
  }, [agent, isConnected, address]);

  if (finalized) {
    const uniswapUrl = `${UNISWAP_SWAP_URL}?outputCurrency=${agent.agentId}&chain=sepolia`;
    return (
      <div className={styles.finalizedMessage}>
        <p>This agent&apos;s bonding curve has been finalized.</p>
        <a href={uniswapUrl} target="_blank" rel="noopener noreferrer" className={styles.uniswapLink}>
          Trade on Uniswap ↗
        </a>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isBuying) {
        await buy(amount);
        setAmount("");
      } else {
        await sell(amount);
        setAmount("");
      }
    } catch (error) {
      setShowError("Transaction failed: " + error);
      Sentry.captureException("Transaction failed", {
        extra: {
          error: error,
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonText = () => {
    if (!isConnected) return "Connect Wallet";
    if (isLoading) return "Processing...";
    if (isBuying) return `Buy $${agent.ticker}`;
    return `Sell $${agent.ticker}`;
  };

  const updatePricePreview = async (newAmount: string) => {
    if (!newAmount || !agent || isLoading) {
      setPricePreview("");
      setUsdPrice("");
      return;
    }

    try {
      if (isBuying) {
        const [cost] = (await readContract(config, {
          abi: CURVE_ABI,
          address: agent.curve,
          functionName: "getBuyPrice",
          args: [circulatingSupply, newAmount],
        })) as [bigint];

        const ethPrice = Number(formatEther(cost)).toFixed(6);
        setPricePreview(ethPrice);

        const ethUsdPrice = await getEthPriceUSD();
        const usdValue = Number(ethPrice) * ethUsdPrice;
        setUsdPrice(usdValue.toLocaleString('en-US', { 
          style: 'currency', 
          currency: 'USD' 
        }));
      }
    } catch (error) {
      console.error("Error fetching price preview:", error);
      Sentry.captureException("Error fetching price preview", {
        extra: {
          error: error,
        },
      });
      setPricePreview("");
      setUsdPrice("");
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/,/g, '');
    if (rawValue === '') {
      setAmount('');
      setDisplayAmount('');
      return;
    }
    
    const number = Number(rawValue);
    if (!isNaN(number) && number <= 1_000_000_000) {
      setAmount(rawValue);
      setDisplayAmount(number.toLocaleString('en-US'));
    }
  };

  const setPercentageAmount = (percentage: number) => {
    if (tokenBalance === 0n) return;
    
    const amount = (tokenBalance * BigInt(percentage)) / 100n;
    const formattedAmount = Number(amount) / 1e18; // Convert from wei to token units
    setAmount(formattedAmount.toString());
    setDisplayAmount(formattedAmount.toLocaleString('en-US'));
  };

  const clearAmounts = () => {
    setAmount('');
    setDisplayAmount('');
    setPricePreview('');
    setUsdPrice('');
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
            onClick={() => {
              setIsBuying(true);
              clearAmounts();
            }}
            disabled={isLoading}
          >
            Buy
          </button>
          <button
            type="button"
            className={`${styles.tab} ${!isBuying ? styles.active : ""}`}
            onClick={() => {
              setIsBuying(false);
              clearAmounts();
            }}
            disabled={isLoading}
          >
            Sell
          </button>
        </div>

        <div className={styles.inputGroup}>
          <label htmlFor="amount">Amount</label>
          {!isBuying && (
            <div className={styles.percentageButtons}>
              <button type="button" onClick={() => setPercentageAmount(25)}>25%</button>
              <button type="button" onClick={() => setPercentageAmount(50)}>50%</button>
              <button type="button" onClick={() => setPercentageAmount(75)}>75%</button>
              <button type="button" onClick={() => setPercentageAmount(100)}>Max</button>
            </div>
          )}
          {isBuying && pricePreview && (
            <div className={styles.pricePreview}>
              Cost: {pricePreview} ETH ({usdPrice})
            </div>
          )}
          <input
            key={isBuying ? 'buy' : 'sell'}
            type="text"
            id="amount"
            value={displayAmount}
            onChange={handleAmountChange}
            placeholder="Enter amount"
            disabled={isLoading}
          />
        </div>

        <button type="submit" className={styles.submitButton} disabled={isLoading || !isConnected}>
          {getButtonText()}
        </button>
      </form>
    </>
  );
}
