import { useMemo, useRef, useState } from "react";
import { useWavesurfer } from "@wavesurfer/react";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import Toolbar from "./toolbar";
import Controls from "./controls";

interface EditorProps {
    track: {
        url: string;
        start: number;
        end: number;
        source?: string;
    };
}

type Block = {
    id?: string;
    from: number;
    to: number;
    text: string;
};

export default function Editor(props: EditorProps) {
    const [transcript, setTranscript] = useState({
        startTime: props.track.start,
        endTime: props.track.end,
        blocks: [] as Block[],
    });
    const [isHighlighting, setIsHighlighting] = useState(false);
    const [highlightStart, setHighlightStart] = useState<number>();
    const [activeBlockId, setActiveBlockId] = useState<string | undefined>(
        undefined,
    );

    const waveRef = useRef(null);

    const regionsPlugin = useMemo(() => {
        const regionsPlugin = new RegionsPlugin();
        regionsPlugin.on("region-updated", (region) => {
            // TODO: update the associated block (use the created id?)
        });

        regionsPlugin.on("region-in", (region) => {
            setActiveBlockId(region.id);
        });
        regionsPlugin.on("region-out", (region) => {
            // FIXME: not sure this works properly (region.id does not match the expected activeBlockId)
            console.log("region-out", { region, activeBlockId });
            if (activeBlockId === region.id) setActiveBlockId(undefined);
        });
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
            const newRegion = regionsPlugin.addRegion({
                start: highlightStart,
                end: currentTime,
            });
            setTranscript((prev) => ({
                ...prev,
                blocks: [
                    ...prev.blocks,
                    {
                        id: newRegion.id,
                        from: newRegion.start + prev.startTime,
                        to: newRegion.end + prev.startTime,
                        text: "",
                    },
                ].sort((a, b) => a.from - b.from),
            }));
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
                key={activeBlockId}
                name="transcription"
                rows={10}
                placeholder="Start transcribing"
                disabled={activeBlockId === undefined}
                defaultValue={
                    transcript.blocks.find(
                        (block) => block.id === activeBlockId,
                    )?.text ?? ""
                }
                onChange={(e) => {
                    if (!activeBlockId) return;
                    setTranscript((prev) => ({
                        ...prev,
                        blocks: prev.blocks.map((block) =>
                            block.id !== activeBlockId
                                ? block
                                : {
                                      ...block,
                                      text: e.target.value,
                                  },
                        ),
                    }));
                }}
                className="w-full resize-y rounded border p-2 text-sm"
            />
            <pre className="w-full rounded border bg-gray-100 p-2 font-mono text-xs">
                <code>{JSON.stringify(transcript, null, 2)}</code>
            </pre>
        </div>
    );
}
