import { useState } from "react";
import * as Icons from "@heroicons/react/24/outline";

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
            className="grid w-full grid-cols-3 gap-4 py-4 font-mono text-sm"
        >
            <div className="flex items-center justify-between">
                <select
                    name="playback-speed"
                    className="w-min text-xs text-gray-800"
                    value={playbackSpeed}
                    onChange={(e) => {
                        const value = Number(e.target.value) ?? 1;
                        setPlaybackSpeed(value);
                        props.onChange({ playbackSpeed: value });
                    }}
                >
                    <option value={0.3}>0.3</option>
                    <option value={0.5}>0.5</option>
                    <option value={0.7}>0.7</option>
                    <option value={1}>1</option>
                    <option value={1.5}>1.5</option>
                    <option value={2}>2</option>
                </select>
                <div className="flex items-center space-x-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                    <button>-</button>
                    <input
                        type="range"
                        name="zoom"
                        id="zoom"
                        min={1}
                        max={100}
                        value={zoomLevel}
                        onChange={(e) => {
                            const value = e.target.valueAsNumber;
                            setZoomLevel(value);
                            props.onChange({ zoom: value });
                        }}
                        className="[&::-webkit-slider-thumb]:-mt-1/2 w-20 appearance-none bg-transparent focus:outline-none disabled:pointer-events-none
                        disabled:opacity-50
                        [&::-moz-range-thumb]:h-3
                        [&::-moz-range-thumb]:w-3
                        [&::-moz-range-thumb]:appearance-none
                        [&::-moz-range-thumb]:rounded-full
                        [&::-moz-range-thumb]:bg-white
                    
                        [&::-moz-range-track]:h-0.5
                        [&::-moz-range-track]:w-full
                        [&::-moz-range-track]:rounded-full
                        [&::-moz-range-track]:bg-gray-100
                        
                        [&::-webkit-slider-runnable-track]:h-0.5
                        [&::-webkit-slider-runnable-track]:w-full
                        [&::-webkit-slider-runnable-track]:rounded-full
                        [&::-webkit-slider-runnable-track]:bg-gray-200
                        [&::-webkit-slider-thumb]:-mt-1
                        [&::-webkit-slider-thumb]:h-2.5
                        [&::-webkit-slider-thumb]:w-2.5
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-gray-300"
                    />
                    <button>+</button>
                </div>
            </div>

            <div className="mx-auto flex items-center space-x-4">
                <button onClick={() => props.onSkip(-skipStep)}>
                    <Icons.BackwardIcon width={16} />
                </button>
                <button onClick={() => props.onPlayPause()}>
                    {props.isPlaying ? (
                        <Icons.PauseIcon width={16} />
                    ) : (
                        <Icons.PlayIcon width={16} />
                    )}
                </button>
                <button onClick={() => props.onSkip(skipStep)}>
                    <Icons.ForwardIcon width={16} />
                </button>
            </div>

            <div className="ml-auto w-fit rounded border p-1 font-mono text-xs text-gray-600">
                <input
                    type="text"
                    className="w-12 focus:outline-none"
                    value={props.currentTime.toFixed(2)}
                    onChange={(e) => {
                        props.onChange({ time: Number(e.target.value) });
                    }}
                />
                <span className="text-gray-300">/</span>
                <span className="inline-block w-12 text-right">
                    {props.duration.toFixed(2)}
                </span>
            </div>
        </div>
    );
}
