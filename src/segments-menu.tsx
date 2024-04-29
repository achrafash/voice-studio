import { Block } from "./types";
import { Region } from "wavesurfer.js/dist/plugins/regions.esm.js";
import { Icons } from "./components";

interface SegmentsMenuProps {
    block?: Block;
    region?: Region;
    onBlockChange(block: Block): void;
}

export default function SegmentsMenu(props: SegmentsMenuProps) {
    return (
        <nav className="flex w-[calc(min(15rem,25vw))] flex-shrink-0 flex-col divide-y border-l bg-white">
            <div className="flex items-center space-x-2 px-4 py-2">
                <Icons.FlipHorizontal size={14} className="text-slate-800" />
                <span className="text-sm font-medium">Segments</span>
            </div>

            <div className="flex-1">
                {props.block && (
                    <div key={props.block.id} className="flex space-x-2 p-4">
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
                                    value={props.block.from}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        props.onBlockChange({
                                            ...props.block!,
                                            from: value,
                                        });
                                        props.region?.setOptions({
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
                                    value={props.block?.to}
                                    onChange={(e) => {
                                        const value = Number(e.target.value);
                                        props.onBlockChange({
                                            ...props.block!,
                                            to: value,
                                        });
                                        props.region?.setOptions({
                                            ...props.region,
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
                        <button className="group rounded p-2 hover:bg-slate-100">
                            <Icons.LockIcon
                                size={16}
                                className="text-slate-300 group-hover:text-slate-500"
                            />
                        </button>
                    </div>
                )}
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
