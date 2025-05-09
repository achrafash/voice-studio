import { useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
// Wavesurfer
import { useWavesurfer } from "@wavesurfer/react";
import MinimapPlugin from "wavesurfer.js/dist/plugins/minimap.esm.js";
import RegionsPlugin, {
    Region,
} from "wavesurfer.js/dist/plugins/regions.esm.js";

import TextareaAutosize from "react-textarea-autosize";
import { Icons } from "@/components";
import { FileUp, Info } from "lucide-react";

import Controls from "./controls";
import * as wav from "./lib/wav";

const SAMPLE_RATE = 16_000;

interface Block {
    id: string;
    from: number;
    to: number;
    text: string;
    source: "mic" | "system";
    speaker_id?: any;
}

interface Transcript {
    startTime: number;
    endTime: number;
    blocks: Block[];
}
interface Track {
    name: string;
    audio: string;
    duration: number;
}

export default function App() {
    const [transcript, setTranscript] = useState<Transcript>();
    const [track, setTrack] = useState<Track>();
    const [project, setProject] = useState<string>();
    const [activeBlockId, setActiveBlockId] = useState<string>();
    const activeBlockIdRef = useRef(activeBlockId);
    useEffect(() => {
        activeBlockIdRef.current = activeBlockId;
    }, [activeBlockId]);

    const playerRef = useRef(null);
    const minimapRef = useRef(null);

    const regionsPlugin = useMemo(() => {
        return new RegionsPlugin();
    }, []);

    const trackDropzone = useDropzone({
        accept: { "audio/wav": [".wav"] },
        maxFiles: 1,
        onDrop: async (files) => {
            if (!files || files.length === 0) return;
            if (files[0].type === "audio/wav") {
                const projectName = files[0].name
                    .split(".")
                    .slice(0, -1)
                    .join(".");
                setProject(projectName);
                const arrayBuffer = await files[0].arrayBuffer();
                const result = wav.decode(arrayBuffer);
                if (!result) throw Error("Failed to load audio file");
                if (result.sampleRate !== SAMPLE_RATE)
                    throw Error("Invalid sample rate");

                const data = Array.from(result.channelData[0]);
                const startTime = 0;
                const endTime = result.sampleRate * data.length;
                setTranscript({
                    startTime,
                    endTime,
                    blocks: [],
                });
                setTrack({
                    name: projectName,
                    duration: endTime - startTime,
                    audio: URL.createObjectURL(files[0]),
                });
            }
        },
    });

    const transcriptDropzone = useDropzone({
        accept: { "application/json": [".json"] },
        maxFiles: 1,
        onDrop: async (files) => {
            if (!files || files.length === 0) return;
            if (files[0].type === "application/json") {
                regionsPlugin.clearRegions();
                loadTranscriptFromFile(files[0]);
            }
        },
    });

    const { wavesurfer, isPlaying, currentTime } = useWavesurfer({
        url: track?.audio,
        container: playerRef,
        waveColor: "#e7e5e4",
        progressColor: "#e7e5e4",
        dragToSeek: true,
        interact: true,
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
                    overlayColor: "transparent",
                    waveColor: "#e7e5e4",
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

    // regions event listeners
    useEffect(() => {
        regionsPlugin.on("region-in", (region) => {
            setActiveBlockId(region.id);
        });
        regionsPlugin.on("region-out", (region) => {
            if (activeBlockId === region.id) setActiveBlockId(undefined);
        });
        regionsPlugin.on("region-double-clicked", (region) => {
            region.play();
        });
        regionsPlugin.on("region-clicked", (region) => {
            region.element.focus();
            setActiveBlockId(region.id);
        });
        regionsPlugin.on("region-created", (region) => {
            region.element.tabIndex = 0;
            region.element.onfocus = () => setActiveBlockId(region.id);
            createBlockFromRegion(region);
        });
        regionsPlugin.on("region-removed", () => {
            setActiveBlockId(undefined);
        });
        regionsPlugin.on("region-updated", (region) => {
            if (!track) return;
            setTranscript(
                (prev) =>
                    prev && {
                        ...prev,
                        blocks: prev.blocks
                            .map((block) => {
                                if (block.id !== region.id) return block;

                                return {
                                    ...block,
                                    from: region.start * 1_000,
                                    to: region.end * 1_000,
                                };
                            })
                            .sort((a, b) => a.from - b.from),
                    },
            );
        });

        return () => regionsPlugin.unAll();
    }, [regionsPlugin, track]);

    // Registering wavesurfer events
    useEffect(() => {
        if (!wavesurfer) return;

        const unsubscribe = wavesurfer.on("ready", () => {
            if (transcript?.blocks && regionsPlugin.getRegions().length === 0) {
                transcript.blocks.forEach((block) => {
                    regionsPlugin.addRegion({
                        id: block.id,
                        start: (block.from - transcript.startTime) / 1000,
                        end: (block.to - transcript.startTime) / 1000,
                    });
                });
            }
        });
        function enableCreateBlockOnDrag(e: KeyboardEvent) {
            if (!e.altKey) return;
            wavesurfer?.setOptions({ dragToSeek: false, interact: false });
            const disable = regionsPlugin.enableDragSelection({});
            window.addEventListener(
                "keyup",
                () => {
                    wavesurfer?.setOptions({
                        dragToSeek: true,
                        interact: true,
                    });
                    disable();
                },
                { once: true },
            );
        }
        window.addEventListener("keydown", enableCreateBlockOnDrag);

        function deleteBlockEventHandler(e: KeyboardEvent) {
            if (!e.metaKey) return;
            if (e.key !== "Delete" && e.key !== "Backspace") return;
            if (!activeBlockIdRef.current) return;

            // remove block from transcript
            setTranscript(
                (prev) =>
                    prev && {
                        ...prev,
                        blocks: prev.blocks.filter(
                            (b) => b.id !== activeBlockIdRef.current,
                        ),
                    },
            );
            // remove region from player
            const region = regionsPlugin
                .getRegions()
                .find((region) => region.id === activeBlockIdRef.current);
            region?.remove();
        }
        window.addEventListener("keydown", deleteBlockEventHandler);

        return () => {
            unsubscribe();
            window.removeEventListener("keydown", enableCreateBlockOnDrag);
            window.removeEventListener("keydown", deleteBlockEventHandler);
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

    function loadTranscriptFromFile(file: File) {
        if (!track) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const data = JSON.parse(content);

            const newTranscript = {
                startTime: data.startTime,
                endTime: data.endTime,
                blocks: Array<Block>(),
            };

            for (const block of data.blocks) {
                const region = regionsPlugin.addRegion({
                    id: block.id,
                    start: block.from / 1_000,
                    end: block.to / 1_000,
                });
                newTranscript.blocks.push({
                    ...block,
                    id: block.id ?? region.id,
                });
            }
            newTranscript.blocks.sort((a, b) => a.from - b.from);
            setTranscript(newTranscript);
        };
        reader.readAsText(file);
    }

    function createBlockFromRegion(region: Region) {
        if (!track) return;
        if (transcript?.blocks?.find((b) => b.id === region.id)) return;
        // Add a new block in the transcript
        setTranscript(
            (prev) =>
                prev && {
                    ...prev,
                    blocks: [
                        ...prev.blocks,
                        {
                            id: region.id,
                            from: region.start * 1_000,
                            to: region.end * 1_000,
                            text: "",
                            source: "system" as const,
                            speaker_id: prev.blocks.at(-1)?.speaker_id,
                        },
                    ].sort((a, b) => a.from - b.from),
                },
        );
        setActiveBlockId(region.id);
    }

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-stone-50">
            <header className="grid grid-cols-3 border-b border-stone-200 bg-white">
                <div />
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
                            className="cursor-default px-3 py-1.5 text-xs font-medium text-stone-800 focus:bg-amber-100/50 focus:text-amber-950"
                        >
                            <span>Export</span>
                        </button>
                        <button
                            disabled={!transcript}
                            onClick={async () => {
                                if (!transcript) return;
                                await navigator.clipboard.writeText(
                                    JSON.stringify(transcript, null, 4),
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
            {/* Main Area */}
            <div className="flex h-full flex-grow flex-col overflow-hidden">
                <div className="grid flex-1 grid-cols-4 gap-x-4 overflow-y-hidden px-4">
                    {/* Editor */}
                    <div className="col-span-3 col-start-2 flex max-w-xl flex-col overflow-y-hidden border-x border-stone-200 bg-white xl:col-span-2 xl:col-start-2 xl:max-w-3xl">
                        <div
                            {...transcriptDropzone.getRootProps()}
                            className="relative h-full w-full flex-1 overflow-y-hidden"
                        >
                            {(transcript?.blocks?.length === 0 ||
                                transcriptDropzone.isDragActive) && (
                                <div className="absolute inset-0 z-10 h-full bg-white/80 p-2">
                                    <div
                                        className={`flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed border-stone-200/70 ${
                                            transcriptDropzone.isDragActive &&
                                            "outline outline-2 outline-offset-2 outline-amber-300"
                                        }`}
                                    >
                                        <input
                                            {...transcriptDropzone.getInputProps()}
                                        />
                                        <div className="select-none p-4 text-center">
                                            <div className="mx-auto mb-3 w-max">
                                                <FileUp
                                                    size={28}
                                                    strokeWidth={1.5}
                                                    className="text-stone-400"
                                                />
                                            </div>
                                            <p className="mb-1 text-sm font-medium text-stone-600">
                                                Drag & drop transcript here,{" "}
                                                <button className="m-0 p-0 text-amber-600 underline underline-offset-2">
                                                    or click to browse
                                                </button>
                                            </p>
                                            <div className="flex items-center justify-center space-x-1">
                                                <Info
                                                    size={15}
                                                    className="text-stone-400"
                                                />
                                                <span className="inline-block text-xs font-medium text-stone-400">
                                                    Supports JSON only
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {transcript?.blocks &&
                                transcript?.blocks.length > 0 && (
                                    <div className="h-full overflow-y-auto py-8">
                                        {transcript?.blocks.map(
                                            (currentBlock) => (
                                                <div
                                                    key={currentBlock.id}
                                                    tabIndex={0}
                                                    onFocus={() =>
                                                        setActiveBlockId(
                                                            currentBlock.id,
                                                        )
                                                    }
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
                                                                                (
                                                                                    block,
                                                                                ) =>
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
                                                        minRows={1}
                                                        name="transcription"
                                                        defaultValue={
                                                            currentBlock.text
                                                        }
                                                        onChange={(e) => {
                                                            setTranscript(
                                                                (prev) =>
                                                                    prev && {
                                                                        ...prev,
                                                                        blocks: prev.blocks.map(
                                                                            (
                                                                                block,
                                                                            ) =>
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
                                            ),
                                        )}
                                    </div>
                                )}
                        </div>
                    </div>
                </div>
                {/* Player */}
                <div
                    {...trackDropzone.getRootProps()}
                    className="relative h-40 border-y border-stone-200 bg-white"
                >
                    {(!track?.audio || trackDropzone.isDragActive) && (
                        <div className="absolute inset-0 z-10 bg-white/80 p-2">
                            <div
                                className={`flex h-full w-full items-center justify-center rounded-lg border-2 border-dashed border-stone-200/50 ${
                                    trackDropzone.isDragActive &&
                                    "outline outline-2 outline-offset-2 outline-amber-300"
                                }`}
                            >
                                <input {...trackDropzone.getInputProps()} />
                                <div className="select-none p-4 text-center">
                                    <div className="mx-auto mb-3 w-max">
                                        <FileUp
                                            size={28}
                                            strokeWidth={1.5}
                                            className="text-stone-400"
                                        />
                                    </div>
                                    <p className="mb-1 text-sm font-medium text-stone-600">
                                        Drag & drop audio file here,{" "}
                                        <button className="m-0 p-0 text-amber-600 underline underline-offset-2">
                                            or click to browse
                                        </button>
                                    </p>
                                    <div className="flex items-center justify-center space-x-1">
                                        <Info
                                            size={15}
                                            className="text-stone-400"
                                        />
                                        <span className="inline-block text-xs font-medium text-stone-400">
                                            Supports wav only (16kHz, 16-bit,
                                            mono)
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {track?.audio && (
                        <div className="flex flex-col space-y-4 p-2">
                            <div id="waveform" ref={playerRef} />
                            <div
                                id="minimap"
                                ref={minimapRef}
                                className="overflow-hidden rounded-lg border border-stone-200/50"
                            />
                        </div>
                    )}
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
    );
}
