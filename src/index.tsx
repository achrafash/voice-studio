import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app";
import "./globals.css";

import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuSeparator,
    DropdownMenuItem,
    Button,
} from "@/components";

import VERSION from "./version";

function InfoMenu() {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-full text-sm"
                >
                    ?
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="text-xs">
                <DropdownMenuItem asChild>
                    <a
                        href="http://achrafash.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs"
                    >
                        What&apos;s new?
                    </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <a
                        href="http://achrafash.com"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs"
                    >
                        Keyboard shortcuts
                    </a>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                    <a
                        href="mailto:aitsidihammou.achraf@gmail.com?subject=Voice%20Studio%20Feedback"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs"
                    >
                        Feedback
                    </a>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled className="text-xs">
                    Voice Studio {VERSION}
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function Layout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <>
            {children}
            <div className="absolute bottom-0 right-0 m-4">
                <InfoMenu />
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
