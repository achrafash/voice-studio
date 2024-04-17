import type { Metadata } from "next";
import "./globals.css";
import VERSION from "../version";

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="fixed inset-x-0 bottom-0 border-t px-8 py-4 text-xs text-gray-500">
          <p>
            Quill Annote{" "}
            <span className="w-min rounded bg-gray-200/50 px-1.5 py-0.5 text-gray-400">
              v{VERSION}
            </span>
          </p>
        </footer>
      </body>
    </html>
  );
}
