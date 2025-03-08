import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { WebGPUProvider } from "./contexts/WebGPUContext";
import { LLMProvider } from "./contexts/LLMContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Wikipedia Game...but with LLMs",
  description: "Play the Wikipedia game with the help of an LLM running in your browser",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <WebGPUProvider>
          <LLMProvider>
            {children}
          </LLMProvider>
        </WebGPUProvider>
      </body>
    </html>
  );
}
