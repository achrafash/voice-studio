export type Block = {
    id?: string;
    from: number;
    to: number;
    text: string;
    source: "mic" | "system";
    speaker_id?: number;
};
