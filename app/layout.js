import { DM_Sans, Space_Mono } from "next/font/google";
import "@/styles/globals.css";
import AppProviders from "@/components/AppProviders";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceMono = Space_Mono({
  variable: "--font-space-mono",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata = {
  title: "Net-Lens | Network Operations",
  description: "Network monitoring dashboard for device health, topology visibility, and alert triage.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${spaceMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--canvas)] text-[var(--text-primary)]"><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
