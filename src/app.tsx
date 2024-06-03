import { useEffect, useMemo, useRef, useState } from "react";
// Wavesurfer
import { useWavesurfer } from "@wavesurfer/react";
import MinimapPlugin from "wavesurfer.js/dist/plugins/minimap.esm.js";
import RegionsPlugin, {
    Region,
} from "wavesurfer.js/dist/plugins/regions.esm.js";

import TextareaAutosize from "react-textarea-autosize";
import { Icons, Input, Label } from "@/components";

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
    const activeBlockIdRef = useRef(activeBlockId);
    useEffect(() => {
        activeBlockIdRef.current = activeBlockId;
    }, [activeBlockId]);

    const playerRef = useRef(null);
    const minimapRef = useRef(null);

    const regionsPlugin = useMemo(() => {
        return new RegionsPlugin();
    }, []);

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
            setTranscript(
                (prev) =>
                    prev && {
                        ...prev,
                        blocks: prev.blocks
                            .map((block) => {
                                if (block.id !== region.id) return block;

                                return {
                                    ...block,
                                    from: region.start * 1_000 + prev.startTime,
                                    to: region.end * 1_000 + prev.startTime,
                                };
                            })
                            .sort((a, b) => a.from - b.from),
                    },
            );
        });

        return () => regionsPlugin.unAll();
    }, [regionsPlugin]);

    // Registering wavesurfer events
    useEffect(() => {
        if (!wavesurfer) return;

        const unsubscribe = wavesurfer.on("ready", () => {
            if (transcript?.blocks) {
                transcript.blocks.forEach((block) => {
                    regionsPlugin.addRegion({
                        id: block.id,
                        start: (block.from - transcript.startTime) / 1000,
                        end: (block.to - transcript.startTime) / 1000,
                    });
                    console.log(`created region #${block.id}`);
                });
            }
        });
        function enableCreateBlockOnDrag(e: KeyboardEvent) {
            if (!e.altKey) return;
            wavesurfer?.setOptions({ dragToSeek: false, interact: false });
            const disable = regionsPlugin.enableDragSelection({});
            window.addEventListener("keyup", () => {
                wavesurfer?.setOptions({ dragToSeek: true, interact: true });
                disable();
            }),
                { once: true };
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
            startTime: startTime * 1_000,
            endTime: endTime * 1_000,
            blocks: [],
        });
        setTrack({
            name: projectName,
            duration: endTime - startTime,
            audio: mergedAudioURL,
            offset: startTime * 1_000,
        });
    }

    function loadTranscriptFromFile(file: File) {
        if (!track) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const data = JSON.parse(content);
            let offset = 0;
            if (data.startTime === 0) offset = track.offset;

            const newTranscript = {
                startTime: data.startTime + offset,
                endTime: data.endTime + offset,
                blocks: Array<Block>(),
            };
            console.log({ offset, blocks: data.blocks.slice(0, 3) });
            for (const block of data.blocks) {
                const region = regionsPlugin.addRegion({
                    id: block.id,
                    start:
                        (block.from -
                            (data.startTime === 0 ? 0 : track.offset)) /
                        1_000,
                    end:
                        (block.to - (data.startTime === 0 ? 0 : track.offset)) /
                        1_000,
                });
                newTranscript.blocks.push({
                    ...block,
                    id: block.id ?? region.id,
                    from: block.from + offset,
                    to: block.to + offset,
                });
            }
            newTranscript.blocks.sort((a, b) => a.from - b.from);

            setTranscript(newTranscript);
        };
        reader.readAsText(file);
    }

    function createBlockFromRegion(region: Region) {
        // Add a new block in the transcript
        setTranscript(
            (prev) =>
                prev && {
                    ...prev,
                    blocks: [
                        ...prev.blocks,
                        {
                            id: region.id,
                            from: region.start * 1_000 + prev.startTime,
                            to: region.end * 1_000 + prev.startTime,
                            text: "",
                            source: "system" as const,
                        },
                    ].sort((a, b) => a.from - b.from),
                },
        );
        setActiveBlockId(region.id);
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
                <div className="grid flex-1 grid-cols-4 gap-x-4 overflow-y-auto px-4">
                    {/* File Explorer */}
                    {files && (
                        <div className="my-4 mr-0 flex max-w-[240px] overflow-hidden rounded-sm border border-stone-200 bg-white">
                            <ul className="overflow-auto p-2">
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
                    <div className="col-span-3 col-start-2 flex max-w-xl flex-col overflow-y-auto border-x border-stone-200 bg-white xl:col-span-2 xl:col-start-2 xl:max-w-3xl">
                        <div className="relative w-full flex-1 space-y-0.5 divide-y divide-stone-50 py-8">
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
                                            loadTranscriptFromFile(file);
                                        }}
                                    />
                                </div>
                            )}

                            {transcript?.blocks.map((currentBlock) => (
                                <div
                                    key={currentBlock.id}
                                    tabIndex={0}
                                    onFocus={() =>
                                        setActiveBlockId(currentBlock.id)
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
                        <footer className="w-full border-t border-stone-200 bg-stone-50 p-2">
                            <button
                                title="Create a new block"
                                disabled={!track?.audio || !transcript}
                                onClick={() => {
                                    const region = regionsPlugin.addRegion({
                                        start: currentTime,
                                        end: currentTime + 5,
                                        resize: true,
                                        drag: true,
                                    });
                                    createBlockFromRegion(region);
                                }}
                                className="flex cursor-default items-center rounded-sm border border-stone-200 px-1.5 py-0.5 pr-2 text-stone-600"
                            >
                                <Icons.Plus size={12} />
                                &nbsp;
                                <span className="text-xs">new block</span>
                            </button>
                        </footer>
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
