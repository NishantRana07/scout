import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Scout — Student Opportunity Scout",
  description:
    "Scout is your personal AI opportunity assistant on iMessage. Find internships, hackathons, grants, open source programs, and developer bounties — all through a conversation.",
  keywords: ["internship", "hackathon", "student", "opportunities", "iMessage", "AI"],
  openGraph: {
    title: "Scout — Student Opportunity Scout",
    description: "Find your next internship, hackathon, or grant through iMessage.",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={spaceGrotesk.variable}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
