import * as Icons from "@heroicons/react/24/outline";
import { useState } from "react";

interface ToolbarProps {
    onHighlight(): void;
}

export default function Toolbar(props: ToolbarProps) {
    return (
        <button
            id="highlight"
            className="rounded border bg-gray-50 p-1 text-xs"
            onClick={() => {
                props.onHighlight();
            }}
        >
            <Icons.ScissorsIcon width={16} />
        </button>
    );
}
