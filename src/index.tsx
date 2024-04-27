import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./globals.css";

import VERSION from "./version";

// export const metadata: Metadata = {
//     title: "Quill Annote",
//     description: "Label studio for ASR data labeling | by Quill",
// };

function Layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            {children}
            <div className="absolute bottom-0 right-0 m-4">
                <div className="inline-flex w-min cursor-default rounded-full border border-slate-200 bg-slate-100/50 px-2.5 py-1 text-xs text-slate-400 backdrop-blur-lg">
                    <span className="">v</span>
                    &thinsp;
                    <span className="slashed-zero tabular-nums">{VERSION}</span>
                </div>
            </div>
        </>
    );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <Layout>
            <App />
        </Layout>
    </React.StrictMode>,
);
