import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CommandPalette } from "@/components/command-palette";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LinuxGSM Web UI",
  description: "Web interface for managing LinuxGSM game servers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {children}
          <CommandPalette />
        </AuthProvider>
      </body>
    </html>
  );
}
