"use client";

import { useState } from "react";
import WavesurferPlayer from "@wavesurfer/react";
import WaveSurfer from "wavesurfer.js";

import * as Icons from "@heroicons/react/24/outline";

const SKIP_STEP = 2;

export default function AudioPlayer(props: { url: string }) {
    const [wavesurfer, setWavesurfer] = useState<WaveSurfer>();
    const [isPlaying, setIsPlaying] = useState(false);
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(1);
    const [breakpoints, setBreakpoints] = useState<number[]>([]);

    return (
        <div className="mx-auto flex max-w-xl flex-col items-center">
            <div
                id="commands"
                className="flex w-full items-center justify-end space-x-2 py-2"
            >
                <button
                    className="rounded border bg-gray-50 p-1 text-xs"
                    onClick={() => {
                        setBreakpoints((prev) => [...prev, currentTime].sort());
                    }}
                >
                    <Icons.ScissorsIcon width={16} />
                </button>
            </div>
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
                        setCurrentTime(wave.getCurrentTime());
                        setDuration(wave.getDuration());
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeupdate={(wave) =>
                        setCurrentTime(wave.getCurrentTime())
                    }
                />
            </div>
            <div
                id="controls"
                className="grid w-full grid-cols-3 gap-4 py-4 font-mono text-sm"
            >
                <select
                    name="playback-speed"
                    className="w-min text-xs text-gray-800"
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

                <div className="mx-auto flex items-center space-x-4">
                    <button
                        onClick={() =>
                            wavesurfer && wavesurfer.skip(-SKIP_STEP)
                        }
                    >
                        <Icons.BackwardIcon width={16} />
                    </button>
                    <button
                        onClick={() => wavesurfer && wavesurfer.playPause()}
                    >
                        {isPlaying ? (
                            <Icons.PauseIcon width={16} />
                        ) : (
                            <Icons.PlayIcon width={16} />
                        )}
                    </button>
                    <button
                        onClick={() => wavesurfer && wavesurfer.skip(SKIP_STEP)}
                    >
                        <Icons.ForwardIcon width={16} />
                    </button>
                </div>

                <div className="ml-auto w-fit rounded border p-1 font-mono text-xs text-gray-600">
                    <input
                        type="text"
                        className="w-12 focus:outline-none"
                        value={currentTime.toFixed(2)}
                        onChange={(e) => {
                            wavesurfer &&
                                wavesurfer.setTime(Number(e.target.value));
                        }}
                    />
                    <span className="text-gray-300">/</span>
                    <span className="inline-block w-12 text-right">
                        {duration.toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}
