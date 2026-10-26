import { ClerkProvider } from "@clerk/nextjs";
import Header from "@/components/layout/header";
import { config as clientConfig } from "@/lib/config/client";
import "./globals.css";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // Show fallback text immediately, swap when font loads
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.className} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          publishableKey={clientConfig.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
        >
          <Header />
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
