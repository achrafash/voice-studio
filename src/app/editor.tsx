import { useMemo, useRef, useState } from "react";
import { useWavesurfer } from "@wavesurfer/react";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import Toolbar from "./toolbar";
import Controls from "./controls";

interface EditorProps {
    track: {
        url: string;
        start: number;
        source?: string;
    };
}

export default function Editor(props: EditorProps) {
    const waveRef = useRef(null);
    const [isHighlighting, setIsHighlighting] = useState(false);
    const [highlightStart, setHighlightStart] = useState<number>();

    const regionsPlugin = useMemo(() => {
        const regionsPlugin = new RegionsPlugin();
        return regionsPlugin;
    }, []);

    const { wavesurfer, isPlaying, currentTime, isReady } = useWavesurfer({
        url: props.track.url,
        container: waveRef,
        waveColor: "#9ca3af",
        progressColor: "#fb923c",
        dragToSeek: true,
        interact: true,
        normalize: true,
        barGap: 1,
        height: 60,
        barHeight: 20,
        autoCenter: true,
        autoScroll: true,
        cursorColor: "#c2410c",
        plugins: useMemo(() => {
            return [regionsPlugin];
        }, []),
    });

    function handleHighlight() {
        if (isHighlighting && highlightStart) {
            regionsPlugin.addRegion({
                start: highlightStart,
                end: currentTime,
            });
        } else if (!isHighlighting) {
            setHighlightStart(currentTime);
        }
        setIsHighlighting((prev) => !prev);
    }

    return (
        <div className="mx-auto w-full max-w-xl p-8">
            {wavesurfer && isReady && <Toolbar onHighlight={handleHighlight} />}

            <div id="waveform" ref={waveRef} />

            {wavesurfer && isReady && (
                <Controls
                    currentTime={currentTime}
                    duration={wavesurfer.getDuration()}
                    isPlaying={isPlaying}
                    onChange={(kv) => console.log({ kv })}
                    onPlayPause={() => wavesurfer.playPause()}
                    onSkip={(step) => wavesurfer.skip(step)}
                />
            )}

            <textarea
                name="transcription"
                rows={10}
                placeholder="Start transcribing"
                className="w-full resize-y rounded border p-2 text-sm"
            />
        </div>
    );
}
