import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contract Clear — Smart Contract Explainer",
  description: "Understand any Ethereum smart contract in seconds. Get plain English explanations, risk scores, and permission breakdowns.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: "#080c10" }}>
        {children}
      </body>
    </html>
  );
}