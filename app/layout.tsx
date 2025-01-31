// app/layout.tsx
import "./globals.css";
import Header from "@/components/layout/Header";
import { Metadata } from "next";
import Sidebar from "@/components/layout/Sidebar";

import { WalletProvider } from "./WalletProvider";

export const metadata: Metadata = {
  title: "Your App Name",
  description: "Your app description",
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Your App Name',
    startupImage: [
      // You can add startup images here if needed
    ],
  },
  openGraph: { // TODO: update this show it shows image on twitter
    title: 'Your App Name',
    description: 'Your app description',
    url: 'https://yourapp.com',
    siteName: 'Your App Name',
    images: [
      { url: 'https://yourapp.com/og-image.png' }
    ]
  },
  manifest: '/manifest.json',
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
