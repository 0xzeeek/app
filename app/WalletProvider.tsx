"use client";

import React from "react";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, Theme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import config from "@/lib/wagmiConfig";

const queryClient = new QueryClient();

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider modalSize="compact" theme={theme}>
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

const theme: Theme = {
  colors: {
    accentColor: "#fff",
    accentColorForeground: "#000",
    actionButtonBorder: "rgba(0, 0, 0, 0.04)",
    actionButtonBorderMobile: "rgba(0, 0, 0, 0.06)",
    actionButtonSecondaryBackground: "rgba(0, 0, 0, 0.06)",
    closeButton: "rgba(60, 66, 66, 0.8)",
    closeButtonBackground: "rgba(0, 0, 0, 0.06)",
    connectButtonBackground: "#171717",
    connectButtonBackgroundError: "#FF494A",
    connectButtonInnerBackground: "linear-gradient(0deg, rgba(0, 0, 0, 0.03), rgba(0, 0, 0, 0.06))",
    connectButtonText: "#fffef8",
    connectButtonTextError: "#fffef8",
    connectionIndicator: "#30E000",
    downloadBottomCardBackground: "linear-gradient(126deg, rgba(0, 0, 0, 0) 9.49%, rgba(0, 0, 0, 0.04) 71.04%)",
    downloadTopCardBackground: "linear-gradient(126deg, rgba(0, 0, 0, 0.05) 9.49%, rgba(0, 0, 0, 0) 71.04%)",
    error: "#FF494A",
    generalBorder: "rgba(0, 0, 0, 0.06)",
    generalBorderDim: "rgba(0, 0, 0, 0.03)",
    menuItemBackground: "rgba(60, 66, 66, 0.1)",
    modalBackdrop: "rgba(0, 0, 0, 0.3)",
    modalBackground: "#171717",
    modalBorder: "transparent",
    modalText: "#fff",
    modalTextDim: "rgba(60, 66, 66, 0.3)",
    modalTextSecondary: "rgba(60, 66, 66, 0.6)",
    profileAction: "rgba(60, 66, 66, 0.06)",
    profileActionHover: "rgba(60, 66, 66, 0.12)",
    profileForeground: "rgba(60, 66, 66, 0.06)",
    selectedOptionBorder: "rgba(60, 66, 66, 0.1)",
    standby: "#FFD641"
  },
  fonts: {
    body: 'var(--creato)'
  },
  radii: {
    actionButton: '0px',
    connectButton: '0px',
    menuButton: '0px',
    modal: '0px',
    modalMobile: '0px'
  },
  shadows: {
    connectButton: '0px 4px 12px rgba(0, 0, 0, 0.1)',
    dialog: '0px 8px 32px rgba(0, 0, 0, 0.32)',
    profileDetailsAction: '0px 2px 6px rgba(37, 41, 46, 0.04)',
    selectedOption: '0px 2px 6px rgba(0, 0, 0, 0.24)',
    selectedWallet: '0px 2px 6px rgba(0, 0, 0, 0.12)',
    walletLogo: '0px 2px 16px rgba(0, 0, 0, 0.16)'
  },
  blurs: {
    modalOverlay: '100px'
  }
};
