import { useEffect, useMemo, useRef, useState } from "react";
import { useWavesurfer } from "@wavesurfer/react";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";
import CursorPlugin from "wavesurfer.js/dist/plugins/hover.esm.js";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
import MinimapPlugin from "wavesurfer.js/dist/plugins/minimap.esm.js";
import Toolbar from "./toolbar";
import Controls from "./controls";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    const regionsPlugin = useMemo(() => new RegionsPlugin(), []);

    const { wavesurfer, isPlaying, currentTime, isReady } = useWavesurfer({
        url: props.track.url,
        container: waveRef,
        waveColor: "#9ca3af",
        progressColor: "#fb923c",
        dragToSeek: true,
        interact: true,
        normalize: true,
        barGap: 1,
        height: 120,
        barHeight: 20,
        autoCenter: true,
        // autoScroll: true,
        cursorColor: "#c2410c",
        minPxPerSec: 10,
        plugins: useMemo(() => {
            return [
                regionsPlugin,
                new TimelinePlugin({
                    insertPosition: "afterend",
                }),
                new MinimapPlugin({
                    height: 20,
                }), // takes same options as the wavesurfer
                new CursorPlugin({
                    lineColor: "#ff0000",
                    lineWidth: 2,
                    labelBackground: "#555",
                    labelColor: "#fff",
                    labelSize: "11px",
                }),
            ];
        }, []),
    });

    useEffect(() => {
        if (!isReady) return;

        regionsPlugin.on("region-updated", (region) => {
            setTranscript((prev) => ({
                ...prev,
                blocks: prev.blocks.map((block) =>
                    block.id !== region.id
                        ? block
                        : {
                              ...block,
                              from: region.start,
                              to: region.end,
                          },
                ),
            }));
        });

        regionsPlugin.on("region-in", (region) => {
            console.log("region-in", { region, activeBlockId });
            setActiveBlockId(region.id);
        });

        regionsPlugin.on("region-out", (region) => {
            console.log("region-out", { region, activeBlockId });
            if (activeBlockId === region.id) setActiveBlockId(undefined);
        });

        return () => regionsPlugin.unAll();
    }, [isReady, activeBlockId]);

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
        <div className="flex max-h-full items-stretch overflow-hidden">
            <div className="flex max-h-full flex-grow flex-col overflow-hidden px-4">
                <div className="mt-12 flex max-h-full flex-grow flex-col overflow-hidden rounded-xl border bg-white">
                    <div className="max-h-full w-full flex-grow overflow-y-scroll p-8">
                        {transcript.blocks.map((currentBlock) => (
                            <div
                                key={currentBlock.id}
                                className="mx-auto max-w-lg"
                            >
                                {/* TODO: use react-textarea-autosize */}
                                <textarea
                                    name="transcription"
                                    // disabled={currentBlock.id !== activeBlockId}
                                    autoFocus={
                                        currentBlock.id === activeBlockId
                                    }
                                    placeholder="Start transcribing"
                                    defaultValue={currentBlock.text}
                                    onChange={(e) => {
                                        setTranscript((prev) => ({
                                            ...prev,
                                            blocks: prev.blocks.map((block) =>
                                                block.id !== currentBlock.id
                                                    ? block
                                                    : {
                                                          ...currentBlock,
                                                          text: e.target.value,
                                                      },
                                            ),
                                        }));
                                    }}
                                    className="w-full resize-none bg-white p-2 text-slate-900 focus:outline-none disabled:text-opacity-50"
                                />
                            </div>
                        ))}
                    </div>
                    <div className="border-b border-t p-4">
                        <div id="waveform" ref={waveRef} />
                    </div>
                    {wavesurfer && isReady && (
                        <Toolbar
                            onHighlight={handleHighlight}
                            onExport={() => ({
                                ...transcript,
                                blocks: transcript.blocks.sort(
                                    (a, b) => a.from - b.from,
                                ),
                            })}
                        />
                    )}
                </div>

                {wavesurfer && isReady && (
                    <Controls
                        currentTime={currentTime}
                        duration={wavesurfer.getDuration()}
                        isPlaying={isPlaying}
                        onChange={(kv) => {
                            if (kv["playbackSpeed"]) {
                                wavesurfer.setOptions({
                                    audioRate: kv["playbackSpeed"],
                                });
                            }
                            if (kv["time"]) {
                                wavesurfer.setTime(kv["time"]);
                            }
                            if (kv["zoom"]) {
                                wavesurfer.zoom(kv["zoom"]);
                            }
                        }}
                        onPlayPause={() => wavesurfer.playPause()}
                        onSkip={(step) => wavesurfer.skip(step)}
                    />
                )}
                {/* TODO: move this preview on the right side panel like Figma with multiple tabs
            <pre className="w-full rounded border bg-gray-100 p-2 font-mono text-xs">
                <code>{JSON.stringify(transcript, null, 2)}</code>
            </pre> */}
            </div>
            <nav className="flex w-[calc(min(20rem,30vw))] flex-shrink-0 flex-col border bg-white">
                <div className="px-4 py-2">
                    <span>Labels</span>
                </div>
                <div className="px-4 py-2">
                    <Label htmlFor="">Selection</Label>
                    <div className="flex">
                        <Input type="text" />
                        <Input type="text" />
                    </div>
                </div>
                <div className="px-4 py-2">
                    <Label htmlFor="">Speaker</Label>
                    <Input type="text" />
                </div>
            </nav>
        </div>
    );
}
