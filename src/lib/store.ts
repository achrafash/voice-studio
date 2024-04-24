import { atom } from "jotai";

export type Block = {
    id?: string;
    from: number;
    to: number;
    text: string;
    source: "mic" | "system";
    speaker_id?: number;
};
export interface Transcript {
    startTime: number;
    endTime: number;
    blocks: Block[];
}
export const $transcript = atom<Transcript>({
    startTime: 0,
    endTime: 0,
    blocks: [],
});

export interface Player {
    audio: string;
    duration: number;
    currentTime: number;
    activeBlockId?: string;
    isPlaying: boolean;
    isReady: boolean;
}
export const $player = atom<Player>({
    audio: "",
    duration: 0,
    currentTime: 0,
    isPlaying: false,
    isReady: false,
});
