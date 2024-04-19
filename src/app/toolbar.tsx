import * as Icons from "@heroicons/react/24/outline";

interface ToolbarProps {
    onHighlight(): void;
    onExport(): any; // TODO: find a more descriptive name
}

export default function Toolbar(props: ToolbarProps) {
    return (
        <div className="flex items-center space-x-2 py-4">
            <button
                id="highlight"
                className="rounded border bg-gray-50 p-1 text-xs"
                onClick={() => {
                    props.onHighlight();
                }}
            >
                <Icons.ScissorsIcon width={16} />
            </button>
            <a
                id="export"
                className="rounded border bg-gray-50 p-1 text-xs"
                type="button"
                download="groundTruth-transcript.json"
                href={`data:text/json;charset=utf-8,${encodeURIComponent(
                    JSON.stringify(props.onExport()),
                )}`}
            >
                <Icons.ArrowDownTrayIcon width={16} />
            </a>
        </div>
    );
}
