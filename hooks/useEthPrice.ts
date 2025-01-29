import axios from "axios";
import { useState, useEffect } from "react";

export function useEthPrice() {
  const [ethPrice, setEthPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await axios.get("/api/price");
        const result = response.data;
        if (!result.success) {
          throw new Error("Failed to fetch ETH price");
        }
        setEthPrice(result.data.price);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch ETH price");
      }
    };

    fetchPrice();
  }, []);

  return { ethPrice, error };
}
