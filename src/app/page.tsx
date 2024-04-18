"use client";

import { useState } from "react";
import Editor from "./editor";

function parseFilename(fname: string) {
    // <start_ts>-<end_ts>-<source>.wav
    const [start, end, source] = fname.replace(".wav", "").split("-");
    return { start, end, source };
}

export default function App() {
    const [track, setTrack] = useState<{
        start: number;
        source: string;
        url: string;
    }>();

    async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const { start, end, source } = parseFilename(files[0].name);

        setTrack({
            start: Number(start),
            source,
            url: URL.createObjectURL(files[0]),
        });
    }

    return (
        <>
            <form className="mx-auto flex max-w-xl flex-col items-end space-y-4 px-8 py-12">
                <div className="flex w-full flex-col">
                    <label
                        className="mb-1 text-sm font-medium text-gray-400"
                        htmlFor="audio_files"
                    >
                        Audio Files
                    </label>
                    <input
                        type="file"
                        multiple
                        name="audio_files"
                        id="audio_files"
                        className="border p-2 text-sm"
                        accept=".wav"
                        onChange={onUpload}
                    />
                </div>
            </form>

            {track && <Editor track={track} />}
        </>
    );
}
