import { useState } from "react";
import { usePublicClient, useWriteContract } from "wagmi";
import { readContract } from "@wagmi/core";
import CURVE_ABI from "@/lib/curveAbi.json";
import FACTORY_ABI from "@/lib/factoryAbi.json";
import ERC20_ABI from "@/lib/erc20Abi.json";
import { sepolia } from "@wagmi/core/chains";
import { ethers } from "ethers";

import { Agent, CreateResult, ErrorResult } from "@/lib/types";

import config from "@/lib/wagmiConfig";

// TODO: update to env variable
// const FACTORY_ADDRESS = (process.env.NEXT_PUBLIC_FACTORY_ADDRESS || "0x") as `0x${string}`;

const FACTORY_ADDRESS = "0xc72e0cF6E650dAb2bd1f312C59F459A31046Fdc2";

interface UseEthereumProps {
  agent?: Agent;
}

type LoadingMessage = {
  isLoading: boolean;
  message: string;
};

export function useEthereum({ agent }: UseEthereumProps = {}) {
  const [loading, setLoading] = useState<LoadingMessage>({ isLoading: false, message: "" });
  const [approved, setApproved] = useState(false);
  const { writeContractAsync } = useWriteContract();

  // TODO: update this to base
  const publicClient = usePublicClient({ chainId: sepolia.id });
  // const provider = publicClient ? new ethers.WebSocketProvider(publicClient.transport?.url) : null;

  const create = async (agentName: string, symbol: string): Promise<CreateResult | ErrorResult> => {
    try {
      setLoading({ isLoading: true, message: "Creating agent..." });

      // Call the factory contract to create a new token and curve
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

      // Parse the logs to get the token and curve addresses
      const factoryInterface = new ethers.Interface(FACTORY_ABI);
      for (const log of txReceipt?.logs ?? []) {
        const parsedLog = factoryInterface.parseLog(log);
        if (parsedLog?.name === "TokenAndCurveCreated") {
          const { token, curve } = parsedLog.args;
          console.log(parsedLog.args);

          if (!token || !curve) {
            return { message: "Error creating agent - no token or curve found" };
          }

          // Return the token and curve addresses
          return { token, curve };
        }
      }

      return { message: "Error creating agent" };
    } catch (error) {
      console.error(new Error(`Error creating agent: ${error}`));
      return { message: `Error creating agent: ${error}` };
    } finally {
      setLoading({ isLoading: false, message: "" });
    }
  };

  const buy = async (amount: string) => {
    if (!agent) {
      console.error("No agent found");
      return;
    }

    try {
      const supply = (await readContract(config, {
        abi: CURVE_ABI,
        address: agent.curve,
        functionName: "circulatingSupply",
        args: [],
      })) as bigint;

      // No need to format supply for contract calls, supply is already a bigint
      // Just use supply and amountWei directly
      const price = (await readContract(config, {
        abi: CURVE_ABI,
        address: agent.curve,
        functionName: "getBuyPrice",
        args: [supply, amount],
      })) as bigint;

      console.log(price);

      // price and amountWei are now in smallest units, no conversion needed
      const contractResult = await writeContractAsync({
        address: agent.curve,
        abi: CURVE_ABI,
        functionName: "buy",
        args: [amount],
        value: price, // already a bigint
      });

      setLoading({ isLoading: true, message: "Finalizing Buy" });

      await publicClient?.waitForTransactionReceipt({
        hash: contractResult,
      });

      setLoading({ isLoading: false, message: "" });

      console.log("Transaction hash:", contractResult);
      console.log("Tx receipt awaited in another step if needed.");
    } catch (error) {
      // TODO: handle sentry here
      if (error instanceof Error && error.message.includes("User rejected the request.")) {
        return
      } else {
        console.error(error);
      }
    }
  };

  const sell = async (amount: string) => {
    try {
      if (!agent) {
        console.error("No agent found");
        return;
      }

      if (!approved) {
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
      // TODO: show error to the user
    }
  };

  const approve = async () => {
    if (!agent) {
      console.error("No agent found");
      return;
    }

    try {
      setLoading({ isLoading: true, message: "Approving Sell" });

      const maxAllowance = ethers.MaxUint256;

      const approveHash = await writeContractAsync({
        address: agent.address,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [agent.curve, maxAllowance],
      });

      const approveReceipt = await publicClient?.waitForTransactionReceipt({
        hash: approveHash,
      });

      if (approveReceipt) {
        setApproved(true);
      }

      setLoading({ isLoading: false, message: "" });
    } catch (error) {
      console.error(error);
    }
  };

  return {
    create,
    buy,
    sell,
    approve,
    loading,
    approved,
  };
}

const wait = async (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
