import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: {
    default: "TransitOps",
    template: "%s | TransitOps",
  },
  description:
    "Fleet & transport operations platform — manage vehicles, drivers, trips, and expenses in one place.",
  keywords: ["fleet management", "transport operations", "dispatch", "logistics"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
