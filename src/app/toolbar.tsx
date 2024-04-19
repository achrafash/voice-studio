import * as Icons from "@heroicons/react/24/outline";
import { Button, buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface ToolbarProps {
    onHighlight(): void;
    onExport(): any; // TODO: find a more descriptive name
}

export default function Toolbar(props: ToolbarProps) {
    return (
        <div className="flex items-center space-x-2 py-4">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger>
                        <Button
                            id="highlight"
                            variant="outline"
                            size="icon"
                            onClick={() => {
                                props.onHighlight();
                            }}
                        >
                            <Icons.ScissorsIcon width={16} />
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <small>Create a new block</small>
                    </TooltipContent>
                </Tooltip>
                <Tooltip>
                    <TooltipTrigger>
                        <Link
                            className={buttonVariants({
                                variant: "outline",
                                size: "icon",
                            })}
                            id="export"
                            type="button"
                            download="groundTruth-transcript.json"
                            href={`data:text/json;charset=utf-8,${encodeURIComponent(
                                JSON.stringify(props.onExport()),
                            )}`}
                        >
                            <Icons.ArrowDownTrayIcon width={16} />
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                        <small>Export transcript as JSON file</small>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
