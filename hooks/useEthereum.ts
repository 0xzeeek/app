// useEthereum.ts

import { useState } from "react";
import { usePublicClient, useWriteContract, useWalletClient, useReadContract } from "wagmi";
import { readContract } from "@wagmi/core";
import { ethers } from "ethers";
import * as Sentry from "@sentry/nextjs";

import CURVE_ABI from "@/lib/curveAbi.json";
import FACTORY_ABI from "@/lib/factoryAbi.json";
import ERC20_ABI from "@/lib/erc20Abi.json";

import { base } from "@wagmi/core/chains";
import { Agent, CreateResult, ErrorResult } from "@/lib/types";
import config from "@/lib/wagmiConfig";
import { getPoolData } from "@/utils";

import { TradeType, CurrencyAmount, Token, BigintIsh } from "@uniswap/sdk-core";
import { Route, SwapQuoter } from "@uniswap/v3-sdk";
import axios from "axios";

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}`;
const WETH_ADDRESS = process.env.NEXT_PUBLIC_WETH_ADDRESS as `0x${string}`;
const QUOTER_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_UNISWAP_V3_QUOTER_ADDRESS as `0x${string}`;

const POOL_FEE = 100;

// List of dummy token addresses that should show simulated data
const DUMMY_TOKEN_ADDRESSES = [
  {
    address: "0xB6350d91D3d3E9E5E3E53C482e25B2c106E421a6",
    balance: 1n * 10n ** 18n,
    price: 0.00932367,
    marketCap: "35,261.26",
  },
  {
    address: "0x8d82e7c0a2982011CEC7062A520E6345395F3239",
    balance: 2n * 10n ** 18n,
    price: 0.00936895,
    marketCap: "45,760.31",
  },
  {
    address: "0x4A759348ef15eCB659ff62DD3D3D8d7e2D519DBD",
    balance: 3n * 10n ** 18n,
    price: 0.09624794,
    marketCap: "53,463.75",
  },
  {
    address: "0x8AA5c799ED8C29Ec24f85db1048Bf306164aa32B",
    balance: 4n * 10n ** 18n,
    price: 0.00134684,
    marketCap: "11,439.86",
  },
  {
    address: "0xC29448E2821b75DcD1383bf9ce595f21C7baBDd8",
    balance: 5n * 10n ** 18n,
    price: 0.008345,
    marketCap: "21,870.00",
  },
  {
    address: "0x4467bAe6A3FFd9Fc6290226DA5cD339d161F951D",
    balance: 6n * 10n ** 18n,
    price: 0.007665,
    marketCap: "16,666.66",
  },
  {
    address: "0xC87653F0E52CfC0C7726c953D3fae966387Ceb97",
    balance: 4n * 10n ** 18n,
    price: 0.000156,
    marketCap: "14,220.20",
  },
];

/**
 * Helper to parse a decimal string amount to BigInt with 18 decimals
 */
function parseAmount(amount: string, decimals = 18): bigint {
  return ethers.parseUnits(amount, decimals);
}

/**
 * Create a Uniswap Token object for your Agent's token
 */
function getAgentTokenObject(agentAddr: string, symbol: string) {
  return new Token(base.id, agentAddr, 18, symbol || "AGT", "AgentToken");
}

/**
 * Create a Uniswap Token object for WETH
 */
function getWethTokenObject() {
  return new Token(base.id, WETH_ADDRESS, 18, "WETH", "Wrapped ETH");
}

/**
 * Quote a swap using the Uniswap V3 Quoter
 */
async function getQuote(route: Route<Token, Token>, amountIn: BigintIsh, provider: ethers.Provider): Promise<bigint> {
  // Construct the Quoter calldata
  const { calldata } = SwapQuoter.quoteCallParameters(
    route,
    CurrencyAmount.fromRawAmount(route.input, amountIn),
    TradeType.EXACT_INPUT,
    { useQuoterV2: true }
  );

  // Call the quoter contract
  const quoteCallReturnData = await provider.call({
    to: QUOTER_CONTRACT_ADDRESS,
    data: calldata,
  });

  // Decode the quoted output
  const result = ethers.AbiCoder.defaultAbiCoder().decode(["uint256"], quoteCallReturnData);
  const quotedAmountOut = result[0] as bigint;

  return quotedAmountOut;
}

interface UseEthereumProps {
  agent?: Agent;
}

type LoadingMessage = {
  isLoading: boolean;
  message: string;
};

/**
 * Fetch current ETH price in USD from our API
 */
async function getEthPriceUSD(): Promise<number> {
  try {
    const response = await axios.get("/api/price");
    const result = response.data;

    if (!result.success) {
      throw new Error("Failed to fetch ETH price");
    }

    const data = result.data;
    return data.price;
  } catch (error) {
    console.error("Failed to fetch ETH price:", error);
    return 0;
  }
}

export function useEthereum({ agent }: UseEthereumProps = {}) {
  const [loading, setLoading] = useState<LoadingMessage>({
    isLoading: false,
    message: "",
  });
  const [hasAddedTokenInfo, setHasAddedTokenInfo] = useState(false);

  const { writeContractAsync } = useWriteContract();
  const { data: walletClient } = useWalletClient();
  // const { data: signer } = useSigner();
  // Wagmi read client
  const publicClient = usePublicClient({ chainId: base.id });
  // or you could do: new ethers.providers.Web3Provider(...) to get a provider

  // The read for whether the bonding curve is finalized
  const { data: finalized } = useReadContract({
    address: agent?.curve,
    abi: CURVE_ABI,
    functionName: "finalized",
  });

  // --------------------------------------------------------------------------------
  // create: calls factory to create new agent + curve
  // --------------------------------------------------------------------------------
  const create = async (agentName: string, symbol: string): Promise<CreateResult | ErrorResult> => {
    try {
      const contractResult = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: FACTORY_ABI,
        functionName: "createTokenAndCurve",
        args: [agentName, symbol],
      });

      // Wait for the transaction to be mined
      const txReceipt = await publicClient?.waitForTransactionReceipt({
        hash: contractResult,
      });

      // Parse logs to get token & curve
      const factoryInterface = new ethers.Interface(FACTORY_ABI);
      for (const log of txReceipt?.logs ?? []) {
        try {
          const parsedLog = factoryInterface.parseLog(log);
          if (parsedLog?.name === "TokenAndCurveCreated") {
            const { token, curve } = parsedLog.args;
            if (!token || !curve) {
              return { message: "Error creating agent - no token or curve found" };
            }
            return { token, curve, block: Number(txReceipt?.blockNumber ?? 0) };
          }
        } catch (error) {
          console.error("Error parsing factory log:", error);
        }
      }

      return { message: "Error creating agent" };
    } catch (error) {
      console.error("Error creating agent:", error);
      Sentry.captureException("Error creating agent token and curve", {
        extra: {
          error: error,
          agent: agent,
        },
      });
      return { message: `Error creating agent: ${error}` };
    }
  };

  // --------------------------------------------------------------------------------
  // buy: if finalized => use uniswap (ETH -> Agent), else use bonding curve
  // --------------------------------------------------------------------------------
  const buy = async (amount: string) => {
    if (!agent) {
      console.error("No agent found");
      return;
    }
    // Otherwise, do your existing bonding curve buy
    try {
      // check supply
      const supply = (await readContract(config, {
        abi: CURVE_ABI,
        address: agent.curve,
        functionName: "circulatingSupply",
        args: [],
      })) as bigint;

      // get buy price
      const [cost] = (await readContract(config, {
        abi: CURVE_ABI,
        address: agent.curve,
        functionName: "getBuyPrice",
        args: [supply, amount],
      })) as [bigint];

      // Send buy
      const contractResult = await writeContractAsync({
        address: agent.curve,
        abi: CURVE_ABI,
        functionName: "buy",
        args: [amount],
        value: cost, // already a bigint
      });

      if (!hasAddedTokenInfo) {
        await addTokenToWallet(agent);
        setHasAddedTokenInfo(true);
      }

      setLoading({ isLoading: true, message: "Finalizing Buy" });

      await publicClient?.waitForTransactionReceipt({
        hash: contractResult,
      });

      setLoading({ isLoading: false, message: "" });

      console.log("Bonding curve buy transaction hash:", contractResult);
    } catch (error) {
      if (error instanceof Error && error.message.includes("User rejected the request.")) {
        return;
      } else {
        console.error(error);
        Sentry.captureException("Error buying agent token", {
          extra: {
            error: error,
            agent: agent,
          },
        });
      }
    }
  };

  // --------------------------------------------------------------------------------
  // sell: if finalized => use uniswap (Agent -> ETH), else use bonding curve
  // --------------------------------------------------------------------------------
  const sell = async (amount: string) => {
    if (!agent) {
      console.error("No agent found");
      return;
    }

    try {
      // Check if approved
      const isApproved = await checkAllowance();

      // Approve if needed
      if (!isApproved) {
        await approve();
      }

      const sellHash = await writeContractAsync({
        address: agent.curve,
        abi: CURVE_ABI,
        functionName: "sell",
        args: [amount],
      });

      setLoading({ isLoading: true, message: "Finalizing Sell" });

      await publicClient?.waitForTransactionReceipt({
        hash: sellHash,
      });

      setLoading({ isLoading: false, message: "" });
    } catch (error) {
      console.error(error);
      Sentry.captureException("Error selling agent token", {
        extra: {
          error: error,
          agent: agent,
        },
      });
    }
  };

  // --------------------------------------------------------------------------------
  // Approve bonding curve contract for your token (non-finalized path)
  // --------------------------------------------------------------------------------
  const approve = async () => {
    if (!agent) {
      console.error("No agent found");
      return;
    }

    try {
      setLoading({ isLoading: true, message: "Approving Sell" });

      const maxAllowance = ethers.MaxUint256;

      const approveHash = await writeContractAsync({
        address: agent.agentId, // agent token
        abi: ERC20_ABI,
        functionName: "approve",
        args: [agent.curve, maxAllowance],
      });

      const approveReceipt = await publicClient?.waitForTransactionReceipt({
        hash: approveHash,
      });

      if (approveReceipt) {
        setHasAddedTokenInfo(true);
      }

      setLoading({ isLoading: false, message: "" });
    } catch (error) {
      console.error(error);
      Sentry.captureException("Error approving agent token", {
        extra: {
          error: error,
          agent: agent,
        },
      });
    }
  };

  // --------------------------------------------------------------------------------
  // isTokenInWallet & addTokenToWallet remain the same
  // --------------------------------------------------------------------------------
  const isTokenInWallet = async (tokenAddress: string) => {
    try {
      if (!walletClient || !publicClient) return false;

      const balance = (await readContract(config, {
        address: tokenAddress as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [walletClient.account.address],
      })) as bigint;

      return balance > 0n;
    } catch (error) {
      console.error("Failed to check token balance:", error);
      return false;
    }
  };

  const addTokenToWallet = async (agent: { agentId: string; ticker: string; image: string }) => {
    try {
      if (!walletClient) return;

      // Check if user already has token balance
      const hasToken = await isTokenInWallet(agent.agentId);
      if (hasToken) {
        setHasAddedTokenInfo(true);
        return true;
      }

      // If not, prompt to add token
      const tokenExists = await walletClient.request({
        method: "wallet_watchAsset",
        params: {
          type: "ERC20",
          options: {
            address: agent.agentId,
            symbol: agent.ticker,
            decimals: 18,
            image: agent.image,
          },
        },
      });

      if (tokenExists) {
        setHasAddedTokenInfo(true);
      }

      return tokenExists;
    } catch (error) {
      console.error("Failed to add token to wallet:", error);
      return false;
    }
  };

  // ----------------------------------------------------------------
  // Fetch Price & Market Cap
  // ----------------------------------------------------------------
  /**
   * Returns { priceInUSD, marketCapInUSD } if successful,
   * or undefined if something fails.
   */
  const fetchPriceAndMarketCap = async (agent?: Agent): Promise<{ price: string; marketCap: string }> => {
    try {
      if (!agent) return { price: "0", marketCap: "0" };

      const agentId = agent.agentId as string;
      if (DUMMY_TOKEN_ADDRESSES.some(token => token.address === agentId)) {
        const dummyToken = DUMMY_TOKEN_ADDRESSES.find(token => token.address === agentId);
        return {
          price: dummyToken?.price.toString() ?? "0",
          marketCap: dummyToken?.marketCap.toString() ?? "0",
        };
      }

      let priceInETH = 0;
      let tradesExist = false;
      const supply = 1_000_000_000;

      if (!finalized) {
        const curveSupply = (await readContract(config, {
          abi: CURVE_ABI,
          address: agent.curve,
          functionName: "circulatingSupply",
          args: [],
        })) as bigint;

        if (curveSupply > 0n) {
          tradesExist = true;
        }

        const oneToken = 1n;
        const [cost] = (await readContract(config, {
          abi: CURVE_ABI,
          address: agent.curve,
          functionName: "getBuyPrice",
          args: [curveSupply, oneToken],
        })) as [bigint];

        // This is the cost in Wei to buy exactly 1 token
        const nextPriceETH = Number(ethers.formatEther(cost));
        priceInETH = nextPriceETH;
      } else {
        tradesExist = true;
        // If finalized, use Uniswap
        if (!walletClient) {
          throw new Error("No wallet signer available to read from Uniswap");
        }
        const ethersProvider = new ethers.BrowserProvider(walletClient.transport);

        const agentToken = getAgentTokenObject(agent.agentId, agent.ticker);
        const wethToken = getWethTokenObject();

        // We want the price of 1 AGENT in ETH, so let's do a route: Agent->WETH
        const pool = await getPoolData(agentToken, wethToken, POOL_FEE, ethersProvider);
        const route = new Route([pool], agentToken, wethToken);

        // Quote how many WETH we get for EXACT_INPUT=1 token
        const oneTokenInWei = parseAmount("1", 18);
        const quotedOut = await getQuote(route, oneTokenInWei.toString(), ethersProvider);
        // `quotedOut` is how many WETH (wei) for 1 agent token
        priceInETH = Number(ethers.formatEther(quotedOut));
      }

      // Get ETH/USD price
      const ethPriceUSD = await getEthPriceUSD();

      // Calculate USD values
      const priceInUSD = priceInETH * ethPriceUSD;
      const marketCapInUSD = tradesExist ? priceInUSD * supply : 0;

      const formatPrice = (price: number) => {
        if (price < 0.01) {
          return price.toFixed(8);
        }
        return Number(price.toFixed(2)).toLocaleString();
      };

      return {
        price: formatPrice(priceInUSD),
        marketCap: formatPrice(marketCapInUSD),
      };
    } catch (error) {
      console.error("Failed to fetch price & market cap:", error);
      Sentry.captureException("Error fetching price & market cap", {
        extra: {
          error: error,
          agent: agent,
        },
      });
      return { price: "0", marketCap: "0" };
    }
  };

  // Add new function to check allowance
  const checkAllowance = async (): Promise<boolean> => {
    if (!agent || !walletClient) return false;

    try {
      const allowance = (await readContract(config, {
        address: agent.agentId,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [walletClient.account.address, agent.curve],
      })) as bigint;

      return allowance > 0n;
    } catch (error) {
      console.error("Error checking allowance:", error);
      return false;
    }
  };

  const getCurveEthBalance = async (): Promise<bigint> => {   
    if (!agent?.curve || !agent?.agentId || !publicClient) return 0n;

    const agentId = agent.agentId as string;
    if (DUMMY_TOKEN_ADDRESSES.some(token => token.address === agentId)) {
      return DUMMY_TOKEN_ADDRESSES.find(token => token.address === agentId)?.balance ?? 0n;
    }

    try {
      // Using wagmi's public client to get the balance
      const balance = await publicClient.getBalance({
        address: agent.curve,
      });

      return balance;
    } catch (error) {
      console.error("Error fetching curve ETH balance:", error);
      Sentry.captureException("Error fetching curve ETH balance", {
        extra: { error },
      });
      return 0n;
    }
  };

  return {
    create,
    buy,
    sell,
    approve,
    loading,
    checkAllowance,
    addTokenToWallet,
    fetchPriceAndMarketCap,
    finalized,
    getCurveEthBalance,
  };
}
