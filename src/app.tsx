import { useEffect, useMemo, useRef, useState } from "react";
// Wavesurfer
import { useWavesurfer } from "@wavesurfer/react";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
import MinimapPlugin from "wavesurfer.js/dist/plugins/minimap.esm.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

import TextareaAutosize from "react-textarea-autosize";
import { Button, Icons, Input, Label } from "@/components";

import Controls from "./controls";
import Player from "./player";
import SegmentsMenu from "./segments-menu";

import { Block } from "./types";

interface Transcript {
    startTime: number;
    endTime: number;
    blocks: Block[];
}
interface Track {
    name: string;
    audio: string;
    duration: number;
    offset: number;
}

export default function App() {
    const [transcript, setTranscript] = useState<Transcript>();
    const [track, setTrack] = useState<Track>();
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
                                    from: region.start,
                                    to: region.end,
                                };
                            })
                            .sort((a, b) => a.from - b.from),
                    },
            );
        });

        return regionsPlugin;
    }, []);

    const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
        url: track?.audio,
        container: playerRef,
        waveColor: "#e7e5e4",
        progressColor: "#f59e0b",
        dragToSeek: true,
        interact: true,
        normalize: true,
        barGap: 2,
        barWidth: 2,
        barRadius: 2,
        height: 120,
        autoCenter: true,
        cursorColor: "#dc2626",
        cursorWidth: 1.5,
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
                    waveColor: "#e7e5e4",
                    overlayColor: "transparent",
                    progressColor: "#292524",
                    barGap: 0,
                    barWidth: 1.5,
                    barAlign: "bottom",
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
                        start: block.from,
                        end: block.to,
                    });
                    console.log(`created region #${block.id}`);
                });
            }
        });

        return () => {
            unsubscribe();
        };
    }, [wavesurfer]);

    // Prevent losing data when accidentally leaving the page
    useEffect(() => {
        if (!transcript || transcript.blocks.length === 0) return;

        function preventLeaving(event: BeforeUnloadEvent) {
            event.preventDefault();
            return (event.returnValue = "");
        }

        window.addEventListener("beforeunload", preventLeaving, {
            capture: true,
        });

        return () => {
            window.removeEventListener("beforeunload", preventLeaving, {
                capture: true,
            });
        };
    }, [transcript]);

    async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        const file = files[0];
        // Compute duration
        const audioContext = new window.AudioContext();
        const arrayBuffer = await file.arrayBuffer();
        const duration = await new Promise<number>((resolve) =>
            audioContext.decodeAudioData(arrayBuffer, (buffer) => {
                resolve(buffer.duration);
            }),
        );

        // Initialize transcript
        setTranscript((prev) => ({
            startTime: 0,
            // TODO: use ms timestamps for transcript
            endTime:
                prev?.endTime && prev.endTime > duration
                    ? prev.endTime
                    : duration,
            blocks: [],
        }));

        const audioURL = URL.createObjectURL(file);
        setTrack({
            name: file.name,
            duration,
            audio: audioURL,
            offset: 0,
        });
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-stone-50">
            <header className="grid grid-cols-3 border-b bg-white">
                <div className="">
                    <button className="relative h-full cursor-default p-3 hover:bg-stone-100">
                        <Icons.FileAudio2
                            size={18}
                            className="text-stone-700"
                        />
                        <input
                            className="absolute inset-0 opacity-0"
                            type="file"
                            name="audio_files"
                            id="audio_files"
                            accept=".wav"
                            onChange={(e) => {
                                onUpload(e);
                            }}
                        />
                    </button>
                </div>
                <div className="flex items-center justify-center space-x-1 p-2 text-xs">
                    <span className="text-stone-500">Drafts</span>
                    <span className="text-stone-500">/</span>
                    <input
                        placeholder="Untitled"
                        className="text-xs text-stone-800 focus:outline-none"
                    />
                </div>
                <div className="flex justify-end px-4 py-2">
                    <div className="flex items-stretch divide-x divide-stone-200 overflow-hidden rounded-md border border-stone-200 bg-white">
                        <button
                            disabled={!transcript}
                            onClick={() => {
                                if (!transcript) return;
                                const blob = new Blob(
                                    [
                                        // Convert timestamps to ms
                                        JSON.stringify(
                                            {
                                                startTime:
                                                    transcript.startTime *
                                                    1_000,
                                                endTime:
                                                    transcript.endTime * 1_000,
                                                blocks: transcript.blocks.map(
                                                    (block) => ({
                                                        ...block,
                                                        from:
                                                            block.from * 1_000,
                                                        to: block.to * 1_000,
                                                    }),
                                                ),
                                            },
                                            null,
                                            4,
                                        ),
                                    ],
                                    { type: "application/json" },
                                );
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = "groundTruth-transcript.json";
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                                URL.revokeObjectURL(url);
                            }}
                            className="cursor-default px-3 py-1.5 text-xs font-medium text-stone-800"
                        >
                            <span>Export</span>
                        </button>
                        <button
                            disabled={!transcript}
                            onClick={async () => {
                                if (!transcript) return;
                                await navigator.clipboard.writeText(
                                    // Convert timestamps to ms
                                    JSON.stringify(
                                        {
                                            startTime:
                                                transcript.startTime * 1_000,
                                            endTime: transcript.endTime * 1_000,
                                            blocks: transcript.blocks.map(
                                                (block) => ({
                                                    ...block,
                                                    from: block.from * 1_000,
                                                    to: block.to * 1_000,
                                                }),
                                            ),
                                        },
                                        null,
                                        4,
                                    ),
                                );
                                alert(
                                    "The transcript was copied to your clipboard.",
                                );
                            }}
                            className="cursor-default p-1.5"
                        >
                            <Icons.Copy size={14} className="text-stone-700" />
                        </button>
                    </div>
                </div>
            </header>
            <div className="flex h-full flex-1 items-stretch overflow-hidden">
                {/* Main Area */}
                <div className="flex flex-grow flex-col divide-y overflow-hidden">
                    {/* Transcription Area */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="relative mx-auto min-h-full w-full max-w-2xl space-y-0.5 divide-y divide-stone-50 border-x bg-white py-8">
                            {transcript?.blocks?.length === 0 && (
                                <div className="absolute inset-0 mx-auto flex w-max flex-col justify-center space-y-2 text-sm">
                                    <Label htmlFor="transcript">
                                        Already have a transcript? Start from
                                        there!
                                    </Label>
                                    <Input
                                        type="file"
                                        accept="json"
                                        name="transcript"
                                        id="transcript"
                                        className="text-sm"
                                        onChange={(e) => {
                                            if (
                                                !e.target.files ||
                                                e.target.files.length === 0
                                            )
                                                return;
                                            const file = e.target.files[0];
                                            if (
                                                file.type !== "application/json"
                                            )
                                                return;
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                                const content = event.target
                                                    ?.result as string;
                                                try {
                                                    const data =
                                                        JSON.parse(content);

                                                    // Convert timestamps ms -> sec
                                                    data.startTime /= 1_000;
                                                    data.endTime =
                                                        data.endTime / 1_000 -
                                                        data.startTime;
                                                    data.blocks =
                                                        data.blocks.map(
                                                            (block: Block) => ({
                                                                ...block,
                                                                id:
                                                                    block.id ||
                                                                    window.crypto.randomUUID(),
                                                                from:
                                                                    block.from /
                                                                        1_000 -
                                                                    data.startTime,
                                                                to:
                                                                    block.to /
                                                                        1_000 -
                                                                    data.startTime,
                                                            }),
                                                        );

                                                    setTranscript(data);
                                                    data.blocks.map(
                                                        (block: Block) => {
                                                            regionsPlugin.addRegion(
                                                                {
                                                                    id: block.id,
                                                                    start: block.from,
                                                                    end: block.to,
                                                                },
                                                            );
                                                        },
                                                    );
                                                } catch (error) {
                                                    console.error(error);
                                                }
                                            };
                                            reader.readAsText(file);
                                        }}
                                    />
                                </div>
                            )}

                            {transcript?.blocks.map((currentBlock) => (
                                <div
                                    key={currentBlock.id}
                                    className="relative rounded-md outline -outline-offset-1 outline-transparent ring-4 ring-transparent hover:outline-amber-400 hover:ring-amber-200/70"
                                >
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
                                        placeholder="…"
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
                                        className="mx-auto flex w-full max-w-xl resize-none bg-white px-4 py-3 text-sm text-stone-900 focus:outline-none disabled:text-opacity-50"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Track Players */}
                    <Player ref={playerRef} />

                    {/* Tools */}
                    <div className="flex justify-center bg-white p-2">
                        <Button
                            title="Add Segment"
                            variant="outline"
                            disabled={!track?.audio || !transcript}
                            onClick={() => {
                                if (!track?.audio || !transcript) return;
                                // Add a new region in the player
                                const newRegion = regionsPlugin.addRegion({
                                    start: currentTime,
                                    end: currentTime + 5,
                                    resize: true,
                                    drag: true,
                                });
                                // Add a new block in the transcript
                                setTranscript(
                                    (prev) =>
                                        prev && {
                                            ...prev,
                                            blocks: [
                                                ...prev.blocks,
                                                {
                                                    id: newRegion.id,
                                                    // TODO: use ms timestamps
                                                    from: newRegion.start,
                                                    to: newRegion.end,
                                                    text: "",
                                                    source: "system" as const,
                                                },
                                            ].sort((a, b) => a.from - b.from),
                                        },
                                );
                                setActiveBlockId(newRegion.id);
                            }}
                            className="rounded-full"
                        >
                            <Icons.Plus width={16} />
                            &nbsp;
                            <span className="text-xs">Add Segment</span>
                        </Button>
                    </div>

                    {/* Controls */}
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

                {/* Segments Menu */}
                <SegmentsMenu
                    blocks={
                        transcript?.blocks.map((block) => {
                            // FIXME: refactor to not always get all the regions
                            const regions = regionsPlugin.getRegions();
                            return {
                                ...block,
                                region: regions.find((r) => r.id === block.id),
                            };
                        }) ?? []
                    }
                    onBlockChange={(newBlock) => {
                        setTranscript(
                            (prev) =>
                                prev && {
                                    ...prev,
                                    blocks: prev.blocks.map((block) => {
                                        if (block.id === activeBlockId)
                                            return newBlock;
                                        return block;
                                    }),
                                },
                        );
                    }}
                    onBlockDelete={(blockId) => {
                        // Remove block from transcript
                        setTranscript(
                            (prev) =>
                                prev && {
                                    ...prev,
                                    blocks: prev.blocks.filter(
                                        (block) => block.id !== blockId,
                                    ),
                                },
                        );
                        // Remove region from player
                        regionsPlugin
                            .getRegions()
                            .find((r) => r.id === blockId)
                            ?.remove();
                    }}
                />
            </div>
        </div>
    );
}
