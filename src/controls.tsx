import { useState } from "react";
import {
    Icons,
    Button,
    Slider,
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components";

interface ControlsProps {
    playbackSpeed?: number; // TODO: allow predefined values only
    zoomLevel?: number;
    skipStep?: number;
    isPlaying: boolean;
    duration: number;
    currentTime: number;
    onPlayPause: () => void;
    onSkip: (value: number) => void;
    onChange: (kv: { [control: string]: any }) => void; // TODO: use string literals to define control and generic to type the value
}

export default function Controls(props: ControlsProps) {
    const [playbackSpeed, setPlaybackSpeed] = useState(
        props.playbackSpeed ?? 1,
    );
    const [zoomLevel, setZoomLevel] = useState(props.zoomLevel ?? 10);
    const skipStep = props.skipStep ?? 2;

    return (
        <div
            id="controls"
            className="grid w-full grid-cols-3 gap-4 p-4 font-mono text-sm"
        >
            <div className="flex items-center justify-between space-x-2">
                {/* TODO: change to a dropdown menu */}
                <Select
                    name="playback-speed"
                    defaultValue={playbackSpeed.toString()}
                    onValueChange={(value) => {
                        const valueAsNumber = Number(value) ?? 1;
                        setPlaybackSpeed(valueAsNumber);
                        props.onChange({ playbackSpeed: valueAsNumber });
                    }}
                >
                    <SelectTrigger className="w-max rounded-full text-xs">
                        <SelectValue placeholder="playback speed" />
                        <span>x</span>
                    </SelectTrigger>
                    <SelectContent className="text-xs">
                        <SelectItem value={"0.3"}>0.3</SelectItem>
                        <SelectItem value={"0.5"}>0.5</SelectItem>
                        <SelectItem value={"0.7"}>0.7</SelectItem>
                        <SelectItem value={"1"}>1.0</SelectItem>
                        <SelectItem value={"1.5"}>1.5</SelectItem>
                        <SelectItem value={"2"}>2.0</SelectItem>
                    </SelectContent>
                </Select>
                <div className="flex h-full w-full items-center space-x-2 rounded-full border border-stone-200 bg-white px-3 py-1 text-xs text-stone-500 hover:bg-stone-100/50">
                    <button>-</button>
                    <Slider
                        name="zoom"
                        id="zoom"
                        min={1}
                        max={100}
                        step={1}
                        defaultValue={[zoomLevel]}
                        onValueChange={(value) => {
                            setZoomLevel(value[0]);
                            props.onChange({ zoom: value });
                        }}
                        className="flex-grow"
                    />
                    <button>+</button>
                </div>
            </div>

            <div className="mx-auto flex items-center">
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => props.onSkip(-skipStep)}
                >
                    <Icons.SkipBack width={16} />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => props.onPlayPause()}
                >
                    {props.isPlaying ? (
                        <Icons.Pause width={16} />
                    ) : (
                        <Icons.Play width={16} />
                    )}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    onClick={() => props.onSkip(skipStep)}
                >
                    <Icons.SkipForward width={16} />
                </Button>
            </div>

            <div className="ml-auto flex h-full items-center space-x-2 rounded-full border border-stone-200 bg-white px-3 font-mono text-xs text-stone-600">
                <input
                    type="text"
                    className="w-[3rem] focus:outline-none"
                    value={props.currentTime.toFixed(2)}
                    onChange={(e) => {
                        props.onChange({ time: Number(e.target.value) });
                    }}
                />
                <span className="text-stone-300">/</span>
                <span className="">{props.duration.toFixed(2)}</span>
            </div>
        </div>
    );
}
