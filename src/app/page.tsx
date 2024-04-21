"use client";

import { useState } from "react";
import Editor from "./editor";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Icons from "@/components/ui/icons";

function parseFilename(fname: string) {
    // <start_ts>-<end_ts>-<source>.wav
    const [start, end, source] = fname.replace(".wav", "").split("-");
    return { start, end, source };
}

export default function App() {
    const [track, setTrack] = useState<{
        start: number;
        end: number;
        source: string;
        url: string;
    }>();

    async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const { start, end, source } = parseFilename(files[0].name);

        setTrack({
            start: Number(start),
            end: Number(end),
            source,
            url: URL.createObjectURL(files[0]),
        });
    }

    return (
        <main className="flex h-screen flex-col">
            <header className="absolute inset-x-0 top-0 mx-auto max-w-xs p-4">
                <nav className="mx-auto flex w-max items-center space-x-1 rounded-md border bg-white p-0.5 shadow-sm">
                    <Button variant="ghost" size="icon" className="relative">
                        <Icons.FolderOpenIcon width={16} strokeWidth={2} />
                        <input
                            className="absolute inset-0 opacity-0"
                            type="file"
                            multiple
                            name="audio_files"
                            id="audio_files"
                            accept=".wav"
                            onChange={onUpload}
                        />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            // TODO: reset the transcript object
                            // TODO: make sure to first open an alert box to confirm
                            // TODO: trigger a toast once done
                        }}
                    >
                        <Icons.TrashIcon width={16} strokeWidth={2} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            // TODO: move the export logic here
                            // this will require a global store to access the transcript object from here
                        }}
                    >
                        <Icons.ArrowDownCircleIcon width={16} strokeWidth={2} />
                    </Button>
                </nav>
            </header>

            {track && (
                <div className="h-full flex-grow overflow-hidden border bg-slate-50">
                    <Editor track={track} />
                </div>
            )}
        </main>
    );
}
