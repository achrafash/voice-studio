import { useEffect, useMemo, useRef, useState } from "react";
// Wavesurfer
import { useWavesurfer } from "@wavesurfer/react";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
import MinimapPlugin from "wavesurfer.js/dist/plugins/minimap.esm.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

import TextareaAutosize from "react-textarea-autosize";
import { Button, Input, Label, Icons } from "@/components";

import Controls from "./controls";
import Player from "./player";

export type Block = {
    id?: string;
    from: number;
    to: number;
    text: string;
    source: "mic" | "system";
    speaker_id?: number;
};
export interface Transcript {
    startTime: number;
    endTime: number;
    blocks: Block[];
}

function parseFilename(fname: string) {
    // <start_ts>-<end_ts>-<source>.wav
    const [start, end, source] = fname.replace(".wav", "").split("-");
    return { start, end, source };
}

export default function App() {
    const [transcript, setTranscript] = useState<Transcript>();
    const [track, setTrack] = useState<{
        start: number;
        end: number;
        source: Block["source"];
        url: string;
    }>();
    const [activeBlockId, setActiveBlockId] = useState<string>();

    const playerRef = useRef<HTMLDivElement>(null);
    const regionsPlugin = useMemo(() => {
        const regionsPlugin = new RegionsPlugin();
        regionsPlugin.on("region-in", (region) => {
            setActiveBlockId(region.id);
        });
        regionsPlugin.on("region-out", (region) => {
            if (activeBlockId === region.id) setActiveBlockId(undefined);
        });
        regionsPlugin.on("region-updated", (region) => {
            setTranscript(
                (prev) =>
                    prev && {
                        ...prev,
                        blocks: prev.blocks
                            .map((block) => {
                                if (block.id !== region.id) return block;

                                return {
                                    ...block,
                                    from: region.start + prev.startTime,
                                    to: region.end + prev.startTime,
                                };
                            })
                            .sort((a, b) => a.from - b.from),
                    },
            );
        });

        return regionsPlugin;
    }, []);

    const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
        url: track?.url,
        container: playerRef,
        waveColor: "#9ca3af",
        progressColor: "#fb923c",
        dragToSeek: true,
        interact: true,
        normalize: true,
        barGap: 2,
        barWidth: 2,
        barRadius: 2,
        height: 120,
        autoCenter: true,
        cursorColor: "#c2410c",
        minPxPerSec: 10,
        plugins: useMemo(() => {
            return [
                regionsPlugin,
                new TimelinePlugin({
                    insertPosition: "afterend",
                    // TODO: provide a container to put it where I want
                }),
                new MinimapPlugin({
                    cursorWidth: 0,
                    waveColor: "#cbd5e1",
                    overlayColor: "transparent",
                    progressColor: "#0f172a",
                    barGap: 0,
                    barWidth: 1,
                    // TODO: provide a container to put it where I want
                }),
            ];
        }, []),
    });

    // Registering wavesurfer events
    useEffect(() => {
        if (!wavesurfer) return;

        const unsubscribe = wavesurfer.on("ready", () => {
            if (transcript?.blocks) {
                transcript.blocks.forEach((block) => {
                    regionsPlugin.addRegion({
                        id: block.id,
                        start: block.from - transcript.startTime,
                        end: block.to - transcript.startTime,
                    });
                    console.log(`created region #${block.id}`);
                });
            }
        });

        return () => {
            unsubscribe();
        };
    }, [wavesurfer]);

    async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;

        const { start, end, source } = parseFilename(files[0].name);

        // Initialize transcript
        setTranscript({
            startTime: Number(start),
            endTime: Number(end),
            blocks: [],
        });

        const audioURL = URL.createObjectURL(files[0]);
        setTrack({
            start: Number(start),
            end: Number(end),
            source: source as Block["source"],
            url: audioURL,
        });
    }

    if (track && transcript) {
        return (
            <div className="h-screen flex-grow overflow-hidden border bg-slate-50">
                <div className="flex h-full items-stretch overflow-hidden">
                    <div className="flex h-full flex-grow flex-col overflow-hidden px-4">
                        <div className="mt-12 flex h-full flex-grow flex-col overflow-hidden rounded-xl border bg-white">
                            <div className="h-full w-full flex-grow overflow-y-scroll p-8">
                                {transcript.blocks.map((currentBlock) => (
                                    <TextareaAutosize
                                        key={currentBlock.id}
                                        minRows={1}
                                        name="transcription"
                                        disabled={
                                            currentBlock.id !== activeBlockId
                                        }
                                        autoFocus={
                                            currentBlock.id === activeBlockId
                                        }
                                        placeholder="Start transcribing"
                                        defaultValue={currentBlock.text}
                                        onChange={(e) => {
                                            setTranscript(
                                                (prev) =>
                                                    prev && {
                                                        ...prev,
                                                        blocks: prev.blocks.map(
                                                            (block) =>
                                                                block.id !==
                                                                currentBlock.id
                                                                    ? block
                                                                    : {
                                                                          ...currentBlock,
                                                                          text: e
                                                                              .target
                                                                              .value,
                                                                      },
                                                        ),
                                                    },
                                            );
                                        }}
                                        className="mx-auto flex w-full max-w-lg resize-none bg-white p-2 text-slate-900 focus:outline-none disabled:text-opacity-50"
                                    />
                                ))}
                            </div>
                            <Player ref={playerRef} />

                            <Button
                                title="Add Segment"
                                variant="outline"
                                className="m-2 mx-auto rounded-full"
                                onClick={() => {
                                    const newRegion = regionsPlugin.addRegion({
                                        start: currentTime,
                                        end: currentTime + 5,
                                        resize: true,
                                        drag: true,
                                    });
                                    setTranscript(
                                        (prev) =>
                                            prev && {
                                                ...prev,
                                                blocks: [
                                                    ...prev.blocks,
                                                    {
                                                        id: newRegion.id,
                                                        from:
                                                            newRegion.start +
                                                            prev.startTime,
                                                        to:
                                                            newRegion.end +
                                                            prev.startTime,
                                                        text: "",
                                                        source:
                                                            track?.source ??
                                                            "system",
                                                    },
                                                ].sort(
                                                    (a, b) => a.from - b.from,
                                                ), // FIXME: fails to properly sort the blocks
                                            },
                                    );
                                }}
                            >
                                <Icons.Plus width={16} />
                                &nbsp;
                                <span className="text-xs">Add Segment</span>
                            </Button>
                        </div>

                        <Controls
                            currentTime={currentTime}
                            duration={wavesurfer?.getDuration() || 0}
                            isPlaying={isPlaying}
                            onChange={(kv) => {
                                if (kv["playbackSpeed"]) {
                                    wavesurfer?.setOptions({
                                        audioRate: kv["playbackSpeed"],
                                    });
                                }
                                if (kv["time"]) {
                                    wavesurfer?.setTime(kv["time"]);
                                }
                                if (kv["zoom"]) {
                                    wavesurfer?.zoom(kv["zoom"]);
                                }
                            }}
                            onPlayPause={() => {
                                wavesurfer?.playPause();
                            }}
                            onSkip={(step) => {
                                wavesurfer?.skip(step);
                            }}
                        />
                    </div>

                    {/* Label Panel */}
                    <nav className="flex w-[calc(min(20rem,30vw))] flex-shrink-0 flex-col border bg-white">
                        <div className="flex-1">
                            {activeBlockId ? (
                                <>
                                    <div className="px-4 py-2">
                                        <span className="text-sm font-medium">
                                            Labels
                                        </span>
                                    </div>
                                    <div className="px-4 py-2">
                                        <Label htmlFor="" className="text-xs">
                                            Selection
                                        </Label>
                                        <div className="flex">
                                            <Input type="text" />
                                            <Input type="text" />
                                        </div>
                                    </div>
                                    <div className="px-4 py-2">
                                        <Label htmlFor="">Speaker</Label>
                                        <Input type="text" />
                                    </div>
                                </>
                            ) : (
                                <div className="p-4">
                                    <span className="text-sm font-medium">
                                        Segments
                                    </span>
                                    <div className="divide-y rounded-md border">
                                        {transcript.blocks.map((block) => (
                                            <div
                                                key={block.id}
                                                className="grid grid-cols-2 divide-x px-2"
                                            >
                                                <span className="py-2 text-center text-xs">
                                                    {block.from}
                                                </span>
                                                <span className="py-2 text-center text-xs">
                                                    {block.to}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="h-full overflow-hidden p-4">
                            <pre className="h-full overflow-auto rounded-lg bg-slate-800 px-4 py-2">
                                <code className="font-mono text-xs text-slate-100">
                                    {JSON.stringify(transcript, null, 2)}
                                </code>
                            </pre>
                        </div>
                    </nav>
                </div>
            </div>
        );
    }

    // Onboarding Form
    return (
        <main className="flex h-screen flex-col">
            <header className="absolute inset-x-0 top-0 mx-auto max-w-xs p-4">
                <nav className="mx-auto flex w-max items-center space-x-1 rounded-md border bg-white/0 p-0.5 shadow-sm backdrop-blur-sm">
                    <Button variant="ghost" size="icon" className="relative">
                        <Icons.FolderOpen width={16} strokeWidth={2} />
                        <input
                            className="absolute inset-0 opacity-0"
                            type="file"
                            multiple
                            name="audio_files"
                            id="audio_files"
                            accept=".wav"
                            onChange={(e) => {
                                onUpload(e);
                            }}
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
                        <Icons.Eraser width={16} strokeWidth={2} />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                            // TODO: move the export logic here
                            // this will require a global store to access the transcript object from here
                        }}
                    >
                        <Icons.HardDriveDownload width={16} strokeWidth={2} />
                    </Button>
                </nav>
            </header>
        </main>
    );
}
