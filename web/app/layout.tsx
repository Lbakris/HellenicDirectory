import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Libre_Baskerville } from "next/font/google";
import Providers from "../components/layout/Providers";
import "../styles/globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const libreBaskerville = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  style: ["normal", "italic"],
  variable: "--font-libre-baskerville",
});

export const metadata: Metadata = {
  title: "Hellenic Directory of America",
  description:
    "The premier directory for Greek Americans and Greek Canadians — parishes, community members, and Greek-owned businesses.",
  keywords: ["Greek Orthodox", "Greek American", "parish directory", "GOARCH", "Hellenic community"],
  openGraph: {
    title: "Hellenic Directory of America",
    description:
      "Connect with Greek Orthodox parishes, community members, and businesses across North America.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${libreBaskerville.variable} font-sans antialiased`}>
        {/*
         * Providers mounts QueryClientProvider and AuthContext.
         * Both must wrap the entire tree so every page and component can call
         * useQuery() and useAuth() without additional setup.
         */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
