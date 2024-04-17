"use client";

import { useState } from "react";
import AudioPlayer from "./audio-player";

function parseFilename(fname: string) {
    // <start_ts>-<end_ts>-<source>.wav
    const [start, end, source] = fname.replace(".wav", "").split("-");
    return { start, end, source };
}

export default function Home() {
    const [audio, setAudio] = useState<File[]>([]);

    function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        setAudio(Array.from(files));
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
                        className="border p-2 text-sm"
                        accept=".wav"
                        onChange={onUpload}
                    />
                </div>
                <div className="w-full font-mono text-xs">
                    {audio.map((audio, index) => {
                        const { start, end, source } = parseFilename(
                            audio.name,
                        );
                        return (
                            <p key={index}>
                                {start} | {end} ({source})
                            </p>
                        );
                    })}
                </div>
            </form>
            <div>
                {audio.length > 0 && (
                    <AudioPlayer url={URL.createObjectURL(audio[0])} />
                )}
            </div>
        </>
    );
}
