"use client";

import { useMemo, useRef, useState } from "react";
import * as Icons from "@heroicons/react/24/outline";
import { useWavesurfer } from "@wavesurfer/react";
import Regions from "wavesurfer.js/dist/plugins/regions.esm.js";

const SKIP_STEP = 2;

const regions = Regions.create();

export default function AudioPlayer(props: { url: string }) {
    const [playbackSpeed, setPlaybackSpeed] = useState(1);
    const [breakpoints, setBreakpoints] = useState<number[]>([]);

    const waveRef = useRef(null);

    const { wavesurfer, isPlaying, currentTime, isReady } = useWavesurfer({
        container: waveRef,
        url: props.url,
        waveColor: "#9ca3af",
        progressColor: "#fb923c",
        dragToSeek: true,
        normalize: true,
        barGap: 1,
        height: 60,
        barHeight: 20,
        autoCenter: true,
        autoScroll: true,
        cursorColor: "#c2410c",
        plugins: useMemo(() => {
            regions.clearRegions();
            return [regions];
        }, [props.url]),
    });

    return (
        <div className="mx-auto flex max-w-xl flex-col items-center">
            <div
                id="commands"
                className="flex w-full items-center justify-end space-x-2 py-2"
            >
                <button
                    className="rounded border bg-gray-50 p-1 text-xs"
                    onClick={() => {
                        const newBreakpoints = [
                            ...breakpoints,
                            currentTime,
                        ].sort((a, b) => a - b);

                        if (breakpoints.length === 0) {
                            regions.addRegion({
                                start: 0,
                                end: currentTime,
                                drag: true,
                                resize: true,
                            });
                        } else if (currentTime > breakpoints.slice(-1)[0]) {
                            console.log({
                                breakpoints,
                                last: breakpoints.slice(-1)[0],
                                currentTime,
                            });
                            regions.addRegion({
                                start: breakpoints.slice(-1)[0],
                                end: currentTime,
                                drag: true,
                                resize: true,
                            });
                        } else {
                            regions.clearRegions();
                            newBreakpoints.forEach((breakpoint, index) => {
                                regions.addRegion({
                                    start:
                                        index === 0
                                            ? 0
                                            : newBreakpoints[index - 1],
                                    end: breakpoint,
                                    drag: true,
                                    resize: true,
                                });
                            });
                        }

                        setBreakpoints(newBreakpoints);
                    }}
                >
                    <Icons.ScissorsIcon width={16} />
                </button>
            </div>
            <div className="w-full">
                <div ref={waveRef} id="waveform" />
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
                        wavesurfer && wavesurfer.setPlaybackRate(value);
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
                        {wavesurfer && wavesurfer.getDuration().toFixed(2)}
                    </span>
                </div>
            </div>
        </div>
    );
}
