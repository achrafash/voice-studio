import type { Metadata } from "next";
import "@/styles/globals.css";
import VERSION from "../version";

export const metadata: Metadata = {
    title: "Quill Annote",
    description: "Label studio for ASR data labeling | by Quill",
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
                <div className="absolute bottom-0 right-0 m-4">
                    <div className="inline-flex w-min cursor-default rounded-full border border-slate-200 bg-slate-100/50 px-2.5 py-1 text-xs text-slate-400 backdrop-blur-lg">
                        <span className="">v</span>
                        &thinsp;
                        <span className="slashed-zero tabular-nums">
                            {VERSION}
                        </span>
                    </div>
                </div>
            </body>
        </html>
    );
}
