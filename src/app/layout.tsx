import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Outreach Planner",
  description:
    "Rank target employers, organize LinkedIn connections, and run focused weekly outreach sessions.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
