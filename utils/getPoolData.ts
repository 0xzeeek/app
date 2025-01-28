/* uniswapUtils.ts */

// Example minimal ABIs for Uniswap V3 factory + pool:
const IUniswapV3FactoryAbi = [
  {
    inputs: [
      { internalType: "address", name: "tokenA", type: "address" },
      { internalType: "address", name: "tokenB", type: "address" },
      { internalType: "uint24", name: "fee", type: "uint24" },
    ],
    name: "getPool",
    outputs: [{ internalType: "address", name: "pool", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

const IUniswapV3PoolAbi = [
  {
    inputs: [],
    name: "slot0",
    outputs: [
      { internalType: "uint160", name: "sqrtPriceX96", type: "uint160" },
      { internalType: "int24", name: "tick", type: "int24" },
      { internalType: "uint16", name: "observationIndex", type: "uint16" },
      { internalType: "uint16", name: "observationCardinality", type: "uint16" },
      {
        internalType: "uint16",
        name: "observationCardinalityNext",
        type: "uint16",
      },
      { internalType: "uint8", name: "feeProtocol", type: "uint8" },
      { internalType: "bool", name: "unlocked", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "liquidity",
    outputs: [{ internalType: "uint128", name: "", type: "uint128" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "fee",
    outputs: [{ internalType: "uint24", name: "", type: "uint24" }],
    stateMutability: "view",
    type: "function",
  },
];

import { ethers } from "ethers";
import { Token } from "@uniswap/sdk-core";
import { Pool } from "@uniswap/v3-sdk";
import { Provider } from "ethers";

/**
 * Uniswap V3 factory address for your network.
 * Example: On Sepolia, the current deployment is:
 *  0x0227628f3F023bb0B980b67D528571c95c6DaC1c
 */
const UNISWAP_V3_FACTORY_ADDRESS = "0x0227628f3F023bb0B980b67D528571c95c6DaC1c"; // TODO: update to base

/**
 * Sort two tokens by address in ascending order.
 * This mimics your Solidity `_sortTokens` function, but for TypeScript.
 * Returns an array [token0, token1].
 */
function sortTokensByAddress(tokenA: Token, tokenB: Token): [Token, Token] {
  // Compare addresses as lowercase to avoid case-sensitivity issues
  if (tokenA.address.toLowerCase() < tokenB.address.toLowerCase()) {
    return [tokenA, tokenB];
  } else {
    return [tokenB, tokenA];
  }
}

function sortAddressesByAddress(addressA: string, addressB: string): [string, string] {
  // Compare addresses as lowercase to avoid case-sensitivity issues
  if (addressA.toLowerCase() < addressB.toLowerCase()) {
    return [addressA, addressB];
  } else {
    return [addressB, addressA];
  }
}

/**
 * Fetch on-chain data for a Uniswap V3 pool given two tokens + fee tier.
 * 1) Sort the tokens by address
 * 2) Call factory.getPool(token0, token1, fee) to find the pool address
 * 3) Read slot0, liquidity, and fee from that pool contract
 * 4) Create and return a Uniswap SDK `Pool` instance
 */
export async function getPoolData(
  tokenA: Token,
  tokenB: Token,
  fee: number, // e.g. 3000 for 0.3%
  provider: Provider
): Promise<Pool> {
  // Sort tokens by address to match Uniswap's internal token0 < token1 requirement
  const [sortedToken0, sortedToken1] = sortTokensByAddress(tokenA, tokenB);

  // The factory contract
  const factoryContract = new ethers.Contract(UNISWAP_V3_FACTORY_ADDRESS, IUniswapV3FactoryAbi, provider);

  // Query the pool address from the factory
  const poolAddress: string = await factoryContract.getPool(sortedToken0.address, sortedToken1.address, fee);

  if (poolAddress === ethers.ZeroAddress) {
    throw new Error(
      `No Uniswap V3 pool found for tokens [${sortedToken0.address}, ${sortedToken1.address}] and fee tier ${fee}.`
    );
  }

  // The pool contract
  const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolAbi, provider);

  // Read data from the pool contract
  const [slot0, liquidityBN, actualFee] = await Promise.all([
    poolContract.slot0(),
    poolContract.liquidity(),
    poolContract.fee(),
  ]);

  const { sqrtPriceX96, tick } = slot0;


  // Construct the `Pool` object.
  // The Uniswap v3-sdk docs say token0, token1 must be in ascending order.
  // Because we used `sortedToken0`/`sortedToken1`, this is correct.
  const pool = new Pool(
    sortedToken0,
    sortedToken1,
    Number(actualFee), // Convert BigInt to number
    sqrtPriceX96.toString(), // convert to string if it's a BigInt
    liquidityBN.toString(), // convert to string if it's a BigInt
    Number(tick)
  );

  return pool;
}

export async function getPoolAddress(agentAddress: string) {
  const provider = new ethers.JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL);
  const factoryContract = new ethers.Contract(UNISWAP_V3_FACTORY_ADDRESS, IUniswapV3FactoryAbi, provider);
  const wethAddress = "0xfff9976782d46cc05630d1f6ebab18b2324d6b14"; // TODO: use import from process.env
  const [token0, token1] = sortAddressesByAddress(agentAddress, wethAddress);
  const poolAddress: string = await factoryContract.getPool(token0, token1, 100);
  return poolAddress;
}
