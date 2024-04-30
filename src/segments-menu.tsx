import { Block } from "./types";
import { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import { Icons } from "./components";

interface SegmentsMenuProps {
    blocks: (Block & { region?: Region })[];
    onBlockChange(block: Block): void;
}

export default function SegmentsMenu(props: SegmentsMenuProps) {
    return (
        <nav className="flex w-[calc(min(15rem,25vw))] flex-shrink-0 flex-col divide-y border-l bg-white">
            <div className="flex items-center space-x-2 px-4 py-2">
                <Icons.FlipHorizontal size={14} className="text-slate-800" />
                <span className="text-sm font-medium">Segments</span>
            </div>

            <div className="flex-1 divide-y divide-slate-100">
                {props.blocks.map((block) => (
                    <div key={block.id} className="flex space-x-2 px-4 py-2">
                        <div className="grid grid-cols-2 gap-0.5">
                            <div className="flex items-center border border-white outline-blue-500 focus-within:border-slate-200 focus-within:outline hover:border-slate-200">
                                <div className="p-1">
                                    <Icons.PanelLeftDashed
                                        size={16}
                                        className="text-slate-300"
                                    />
                                </div>
                                <input
                                    className="w-full flex-1 py-1.5 pl-1 pr-0 text-xs focus:outline-none"
                                    type="text"
                                    name="from"
                                    id="from"
                                    value={block.from}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        props.onBlockChange({
                                            ...block!,
                                            from: value,
                                        });
                                        block.region?.setOptions({
                                            start: value,
                                        });
                                    }}
                                />
                            </div>
                            <div className="flex items-center border border-white outline-blue-500 focus-within:border-slate-200 focus-within:outline hover:border-slate-200">
                                <input
                                    className="w-full flex-1 py-1.5 pl-2 pr-0 text-xs focus:outline-none"
                                    type="text"
                                    name="to"
                                    id="to"
                                    value={block?.to}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        props.onBlockChange({
                                            ...block!,
                                            to: value,
                                        });
                                        block.region?.setOptions({
                                            ...block.region,
                                            end: value,
                                        });
                                    }}
                                />
                                <div className="p-1">
                                    <Icons.PanelRightDashed
                                        size={16}
                                        className="text-slate-300"
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => {
                                    if (!block.region) return;
                                    block.region.play();
                                }}
                                className="group rounded p-2 hover:bg-slate-100"
                            >
                                <Icons.Play
                                    size={16}
                                    className="text-slate-300 group-hover:text-slate-500"
                                />
                            </button>
                            <button
                                onClick={() => {
                                    if (block.isLocked) {
                                        block.region?.setOptions({
                                            ...block.region,
                                            resize: true,
                                            drag: true,
                                        });
                                    } else {
                                        block.region?.setOptions({
                                            ...block.region,
                                            resize: false,
                                            drag: false,
                                        });
                                    }
                                }}
                                className="group rounded p-2 hover:bg-slate-100"
                            >
                                {block.isLocked ? (
                                    <Icons.UnlockIcon
                                        size={16}
                                        className="text-slate-300 group-hover:text-slate-500"
                                    />
                                ) : (
                                    <Icons.LockIcon
                                        size={16}
                                        className="text-slate-300 group-hover:text-slate-500"
                                    />
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            {/* Display JSON transcript for debugging */}
            {/* <div className="flex-shrink overflow-hidden p-4">
            <pre className="max-h-full overflow-auto whitespace-pre-wrap rounded bg-indigo-950 px-4 py-2">
                <code className="font-mono text-xs text-indigo-50">
                    {JSON.stringify(transcript, null, 2)}
                </code>
            </pre>
        </div> */}
        </nav>
    );
}
