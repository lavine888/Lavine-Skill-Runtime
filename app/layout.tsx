import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lavine Skill Runtime",
  description: "Turn SKILL.md into runnable products.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
