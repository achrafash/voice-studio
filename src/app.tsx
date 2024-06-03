import { useEffect, useMemo, useRef, useState } from "react";
// Wavesurfer
import { useWavesurfer } from "@wavesurfer/react";
import MinimapPlugin from "wavesurfer.js/dist/plugins/minimap.esm.js";
import RegionsPlugin from "wavesurfer.js/dist/plugins/regions.esm.js";

import TextareaAutosize from "react-textarea-autosize";
import { Button, Icons, Input, Label } from "@/components";

import Controls from "./controls";

import { Block } from "./types";
import * as wav from "./lib/wav";

const SAMPLE_RATE = 16_000;

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

const audioFilePattern = /^\d+\.\d+-\d+\.\d+-(mic|system)\.wav$/;

export default function App() {
    const [transcript, setTranscript] = useState<Transcript>();
    const [track, setTrack] = useState<Track>();
    const [files, setFiles] = useState<
        {
            name: string;
            type: string;
            startTime?: number;
            endTime?: number;
            source?: string;
        }[]
    >();
    const [project, setProject] = useState<string>();
    const [activeBlockId, setActiveBlockId] = useState<string>();

    const playerRef = useRef(null);
    const minimapRef = useRef(null);

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
        // normalize: true,
        barHeight: 0.8,
        barGap: 1.5,
        barWidth: 1.5,
        barRadius: 2,
        height: 100,
        autoCenter: true,
        cursorColor: "#dc2626",
        cursorWidth: 1.5,
        minPxPerSec: 10,
        plugins: useMemo(() => {
            return [
                regionsPlugin,
                new MinimapPlugin({
                    cursorWidth: 0,
                    waveColor: "#e7e5e4",
                    overlayColor: "transparent",
                    progressColor: "#292524",
                    barGap: 0,
                    barWidth: 1.5,
                    barAlign: "bottom",
                    normalize: true,
                    height: 24,
                    container: minimapRef.current ?? undefined,
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

        const projectName = files[0].webkitRelativePath.split("/")[0];
        setProject(projectName);

        const allFiles = await Promise.all(
            Array.from(files).map(async (f) => {
                const file: any = {
                    name: f.name,
                    type: f.type,
                };

                // TODO: move all of this out of the files state
                if (audioFilePattern.test(f.name)) {
                    const [startTime, endTime, source] = f.name.split("-");
                    file.startTime = parseFloat(startTime);
                    file.endTime = parseFloat(endTime);
                    file.source = source.split(".")[0];
                    file.arrayBuffer = await f.arrayBuffer();
                    const result = wav.decode(file.arrayBuffer);
                    if (!result) throw Error("Failed to load audio file");
                    file.data = Array.from(result.channelData[0]);
                }
                return file;
            }),
        );
        setFiles(allFiles);

        const audioFiles = allFiles.filter((f) =>
            audioFilePattern.test(f.name),
        );
        console.log({ audioFiles });

        // merge and mix audio files in one go
        const startTime = Math.min(...audioFiles.map((f) => f.startTime));
        const endTime = Math.max(...audioFiles.map((f) => f.endTime));

        const signalLength = Math.round((endTime - startTime) * SAMPLE_RATE);
        let mergedSignal = Array(signalLength).fill(0);
        for (const source of ["mic", "system"]) {
            const signal = Array(signalLength).fill(0);
            for (const audio of audioFiles.filter((f) => f.source === source)) {
                for (let i = 0; i < audio.data.length; i++) {
                    signal[
                        Math.round(
                            (audio.startTime - startTime) * SAMPLE_RATE,
                        ) + i
                    ] = audio.data[i];
                }
            }
            mergedSignal = mergedSignal.map((value, i) => value + signal[i]);
        }
        const mergedBuffer = wav.encode([Float32Array.from(mergedSignal)], {
            sampleRate: SAMPLE_RATE,
            bitDepth: 16,
        });

        const blob = new Blob([mergedBuffer], { type: "audio/wav" });
        const mergedAudioURL = URL.createObjectURL(blob);
        console.log({ mergedAudioURL });

        // Initialize transcript
        setTranscript({
            startTime,
            endTime,
            blocks: [],
        });
        setTrack({
            name: projectName,
            duration: endTime - startTime,
            audio: mergedAudioURL,
            offset: startTime,
        });
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-stone-50">
            <header className="grid grid-cols-3 border-b border-stone-200 bg-white">
                <div className="flex items-center px-4 py-2">
                    <button className="relative cursor-default rounded-md border border-stone-200 px-4 py-1.5 text-xs font-medium text-stone-800 hover:bg-stone-200/20 active:border-amber-400 active:ring-2 active:ring-amber-200/50">
                        Import audio
                        <input
                            className="absolute inset-0 opacity-0"
                            type="file"
                            name="project"
                            multiple
                            // @ts-expect-error
                            webkitdirectory=""
                            onChange={(e) => {
                                onUpload(e);
                            }}
                        />
                    </button>
                </div>
                <div className="flex items-center justify-center space-x-1 p-2 text-xs">
                    <div className="w-full rounded-md border border-stone-200 px-3 py-1.5 shadow-sm">
                        <input
                            placeholder={"Untitled"}
                            defaultValue={project}
                            className="w-full text-center text-xs text-stone-800 focus:outline-none"
                        />
                    </div>
                </div>
                <div className="flex justify-end px-4 py-2">
                    <div className="flex items-stretch divide-x divide-stone-200 overflow-hidden rounded-md border border-stone-200 bg-white focus-within:border-amber-400 focus-within:outline focus-within:outline-2 focus-within:outline-orange-300/20">
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
                            className="cursor-default px-3 py-1.5 text-xs font-medium text-stone-800 focus:bg-amber-100/50 focus:text-amber-950"
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
                            className="cursor-default p-1.5 focus:bg-amber-100/50"
                        >
                            <Icons.Clipboard
                                size={14}
                                className="text-stone-700"
                            />
                        </button>
                    </div>
                </div>
            </header>
            <div className="flex h-full flex-1 items-stretch overflow-hidden">
                {/* Main Area */}
                <div className="relative flex flex-grow flex-col divide-y overflow-hidden">
                    {/* File Explorer */}
                    {files && (
                        <div className="absolute inset-y-0 left-2 top-2 flex h-[50vh] max-w-[280px] overflow-y-hidden rounded-sm border border-stone-200 bg-white">
                            <ul className="overflow-y-auto p-2">
                                {files.map((file) => (
                                    <li
                                        key={file.name}
                                        className="flex w-full cursor-default items-center space-x-1.5 rounded p-1.5 pr-4 hover:bg-stone-100/80"
                                    >
                                        {file.type === "audio/wav" ? (
                                            <Icons.WavFile
                                                size={14}
                                                className="flex-shrink-0 text-stone-500"
                                            />
                                        ) : file.type === "application/json" ? (
                                            <Icons.TranscriptFile
                                                size={14}
                                                className="flex-shrink-0 text-stone-500"
                                                reference={
                                                    file.name ===
                                                    "groundTruth-transcript.json"
                                                }
                                            />
                                        ) : (
                                            <div className="h-4 w-4 rounded-sm border border-stone-200 bg-stone-50" />
                                        )}
                                        <span className="truncate text-xs text-stone-700">
                                            {file.name}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Editor */}
                    <div className="flex-1 overflow-y-auto">
                        <div className="relative mx-auto min-h-full w-full max-w-2xl space-y-0.5 divide-y divide-stone-50 border-x border-stone-200 bg-white py-8">
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
                                    className="group relative rounded outline outline-1 -outline-offset-1 outline-transparent ring-2 ring-transparent focus-within:outline-amber-400 focus-within:ring-orange-300/20 hover:outline-amber-400 hover:ring-orange-300/20"
                                >
                                    <div className="absolute left-2 top-0">
                                        <input
                                            type="text"
                                            name="speaker"
                                            className="max-w-[10ch] -translate-y-2/3 rounded-sm border border-stone-50 bg-white/50 px-1 py-0.5 text-xs text-stone-400 ring-orange-300/20 backdrop-blur-[2px] focus:visible focus:border-amber-400 focus:text-stone-600 focus:outline-none focus:ring-2"
                                            defaultValue={
                                                currentBlock.speaker_id
                                            }
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
                                                                              speaker_id:
                                                                                  e
                                                                                      .target
                                                                                      .value,
                                                                          },
                                                            ),
                                                        },
                                                );
                                            }}
                                        />
                                    </div>
                                    <TextareaAutosize
                                        key={currentBlock.id}
                                        minRows={1}
                                        name="transcription"
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
                                        className={`mx-auto flex w-full max-w-2xl resize-none rounded-lg bg-white pb-5 pl-6 pr-8 pt-4 text-sm text-stone-800 focus:outline-none ${activeBlockId === currentBlock.id ? "text-opacity-100" : "text-opacity-50"}`}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                    {/* Player */}
                    <div className="flex flex-col space-y-4 border-y border-stone-200 px-4 py-2">
                        <div id="waveform" ref={playerRef} />
                        <div
                            id="minimap"
                            ref={minimapRef}
                            className="overflow-hidden rounded-lg border border-stone-200/50"
                        />
                    </div>
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
                            <Icons.Plus size={16} />
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
            </div>
        </div>
    );
}
