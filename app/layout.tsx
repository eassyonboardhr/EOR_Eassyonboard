import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EassyonBoard EOR Portal",
  description: "Employer onboarding, workforce records, and employee access.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkAppearance = {
    variables: {
      colorPrimary: "#1d4ed8",
      colorForeground: "#0f172a",
      colorMutedForeground: "#64748b",
      colorBackground: "#ffffff",
      colorInputBackground: "#ffffff",
      colorInputText: "#0f172a",
      borderRadius: "0.375rem",
      fontFamily: "var(--font-geist-sans)",
    },
    options: {
      socialButtonsPlacement: "top" as const,
      socialButtonsVariant: "blockButton" as const,
    },
    elements: {
      cardBox: "shadow-none border border-slate-200",
      formButtonPrimary: "bg-blue-700 hover:bg-blue-800 text-sm font-semibold",
      footerActionLink: "text-blue-700 hover:text-blue-800",
    },
  };

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider dynamic appearance={clerkAppearance}>
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
