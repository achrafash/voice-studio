import { forwardRef } from "react";

interface PlayerProps {}

export default forwardRef<HTMLDivElement, PlayerProps>(
    function Player(_props, ref) {
        return (
            <div className="border-y border-stone-200 p-4">
                <div id="waveform" ref={ref} />
            </div>
        );
    },
);
