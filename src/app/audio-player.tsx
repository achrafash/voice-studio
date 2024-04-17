"use client";

import { useState } from "react";
import WavesurferPlayer from "@wavesurfer/react";
import WaveSurfer from "wavesurfer.js";

const SKIP_STEP = 2;

export default function AudioPlayer(props: { url: string }) {
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer>();
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);

    return (
        <div className="mx-auto flex max-w-xl flex-col items-center">
            <div className="w-full">
                <WavesurferPlayer
                    url={props.url}
                    waveColor={"#9ca3af"}
                    progressColor={"#fb923c"}
                    dragToSeek={true}
                    normalize={true}
                    barGap={1}
                    height={60}
                    barHeight={20}
                    autoCenter={true}
                    autoScroll={true}
                    cursorColor={"#c2410c"}
                    audioRate={playbackSpeed}
                    onReady={(wave) => {
                        setWavesurfer(wave);
                        setIsPlaying(false);
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                />
            </div>
            <div
                id="controls"
                className="flex w-full justify-between space-x-4 py-2 font-mono text-sm"
            >
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() =>
                            wavesurfer && wavesurfer.skip(-SKIP_STEP)
                        }
                    >
                        {"<<"}
                    </button>
                    <button
                        onClick={() => wavesurfer && wavesurfer.playPause()}
                    >
                        {isPlaying ? "pause" : "play"}
                    </button>
                    <button
                        onClick={() => wavesurfer && wavesurfer.skip(SKIP_STEP)}
                    >
                        {">>"}
                    </button>
                </div>
                <select
                    name="playback-speed"
                    value={playbackSpeed}
                    onChange={(e) => {
                        const value = Number(e.target.value) ?? 1;
                        setPlaybackSpeed(value);
                    }}
                >
                    <option value={0.7}>0.7</option>
                    <option value={1}>1</option>
                    <option value={1.5}>1.5</option>
                    <option value={2}>2</option>
                </select>

            </div>
        </div>
    );
}
