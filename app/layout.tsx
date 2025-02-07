// app/layout.tsx
import "./globals.css";
import Header from "@/components/layout/Header";
import { Metadata, Viewport } from "next";
import Sidebar from "@/components/layout/Sidebar";

import { WalletProvider } from "./WalletProvider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "3agent",
  description: "Deploy autonomous agents on Base.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "3agent",
  },
  openGraph: {
    title: "3agent",
    description: "Deploy autonomous agents on Base.",
    url: "https://3agent.fun",
    siteName: "3agent",
    images: [
      {
        url: "https://3agent.fun/og-image.png",
        width: 1200,
        height: 630,
        alt: "3agent - Deploy autonomous agents on Base",
      },
    ],
  },
  manifest: "/manifest.json",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <WalletProvider>
          <Header />
          <Sidebar />
          {children}
          {/* <Footer /> */}
        </WalletProvider>
      </body>
    </html>
  );
}
