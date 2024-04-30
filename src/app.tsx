import { useEffect, useMemo, useRef, useState } from "react";
// Wavesurfer
import { useWavesurfer } from "@wavesurfer/react";
import TimelinePlugin from "wavesurfer.js/dist/plugins/timeline.esm.js";
import MinimapPlugin from "wavesurfer.js/dist/plugins/minimap.esm.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

import TextareaAutosize from "react-textarea-autosize";
import { Button, Icons } from "@/components";

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

    if (track && transcript) {
        return (
            <div className="flex h-screen flex-col overflow-hidden bg-slate-50">
                <header className="grid grid-cols-3 border-b bg-white">
                    <div className="">
                        <button className="relative h-full cursor-default p-3 hover:bg-slate-100">
                            <Icons.FileAudio2
                                size={18}
                                className="text-slate-700"
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
                        <span className="text-slate-500">Drafts</span>
                        <span className="text-slate-500">/</span>
                        <span>Untitled</span>
                    </div>
                    <div className="flex justify-end px-4 py-2">
                        <button
                            onClick={() => {
                                const blob = new Blob(
                                    [JSON.stringify(transcript, null, 4)],
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
                            className="flex cursor-default items-center space-x-1.5 rounded-md bg-indigo-600 py-1.5 pl-2 pr-3 text-xs font-medium text-white"
                        >
                            <Icons.FileJson2
                                size={14}
                                strokeWidth={2}
                                className="text-indigo-50"
                            />
                            <span>Export</span>
                        </button>
                    </div>
                </header>
                <div className="flex h-full flex-1 items-stretch overflow-hidden">
                    {/* Main Area */}
                    <div className="flex h-full flex-grow flex-col divide-y overflow-hidden">
                        {/* Transcription Area */}
                        <div className="mx-auto h-full w-full max-w-2xl flex-1 space-y-0.5 divide-y divide-slate-50 overflow-y-scroll border-x bg-white py-8">
                            {transcript.blocks.map((currentBlock) => (
                                <div
                                    key={currentBlock.id}
                                    className="relative px-8 outline -outline-offset-1 outline-transparent hover:outline-indigo-500"
                                >
                                    {/* <div className="absolute right-0 top-0 m-2 rounded border bg-slate-100 px-2 py-0.5 text-xs">
                                        speaker #0
                                    </div> */}
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
                                        className="mx-auto flex w-full max-w-xl resize-none bg-white py-4 text-sm text-slate-900 focus:outline-none disabled:text-opacity-50"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* Track Players */}
                        <Player ref={playerRef} />

                        {/* Tools */}
                        <div className="flex justify-center bg-white p-2">
                            <Button
                                title="Add Segment"
                                variant="outline"
                                onClick={() => {
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
                                                ].sort(
                                                    (a, b) => a.from - b.from,
                                                ),
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
                        blocks={transcript.blocks.map((block) => {
                            // FIXME: refactor to not always get all the regions
                            const regions = regionsPlugin.getRegions();
                            return {
                                ...block,
                                region: regions.find((r) => r.id === block.id),
                            };
                        })}
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
                    />
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
