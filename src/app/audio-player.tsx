"use client";

import { useEffect, useRef } from "react";
import WaveSurfer from "wavesurfer.js";

const SKIP_STEP = 2;

export default function AudioPlayer(props: { url: string }) {
    const waveformRef = useRef(null);
    let wavesurfer: undefined | WaveSurfer;

    // TODO: refactor without using `useEffect` (https://react.dev/learn/you-might-not-need-an-effect)
    useEffect(() => {
        if (!waveformRef.current) return;

        wavesurfer = WaveSurfer.create({
            container: waveformRef.current,
            url: props.url,
            waveColor: "#9ca3af",
            progressColor: "#fb923c",
            dragToSeek: true,
            //   hideScrollbar: true,
            normalize: true,
            barGap: 1,
            height: 60,
            barHeight: 20,
            autoCenter: true,
            autoScroll: true,
            cursorColor: "#c2410c",
            // audioRate aka playback speed
        });

        return () => wavesurfer?.destroy();
    });

    return (
        <div className="mx-auto flex max-w-xl flex-col items-center">
            <div ref={waveformRef} className="w-full rounded border p-2" />
            <div
                id="controls"
                className="flex w-full justify-center space-x-4 py-2 font-mono text-sm"
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
                        {wavesurfer && wavesurfer.isPlaying()
                            ? "pause"
                            : "play"}
                    </button>
                    <button
                        onClick={() => wavesurfer && wavesurfer.skip(SKIP_STEP)}
                    >
                        {">>"}
                    </button>
                </div>
            </div>
        </div>
    );
}
