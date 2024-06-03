import * as wav from "./wav";

export const SAMPLE_RATE = 16_000;

export async function mergeAudioBySource(
    audioFiles: {
        name: string;
        source: string;
        startTime: number;
        endTime: number;
        arrayBuffer: ArrayBuffer;
    }[],
) {
    const audioChunks = [];
    for (const audioFile of audioFiles) {
        const result = wav.decode(audioFile.arrayBuffer);
        if (!result) throw Error("Failed to load audio file");
        audioChunks.push({
            data: Array.from(result.channelData[0]),
            start: audioFile.startTime,
            end: audioFile.endTime,
            source: audioFile.source,
        });
    }
    audioChunks.sort((a, b) => a.start - b.start);

    const mergedSignals = audioChunks.reduce<
        { source: string; start: number; end: number; data: number[] }[]
    >((mergedSignals, currentAudio) => {
        let signal = mergedSignals.find(
            (s) => s.source === currentAudio.source,
        );
        if (!signal) {
            signal = {
                source: currentAudio.source,
                start: currentAudio.start,
                end: currentAudio.end,
                data: currentAudio.data,
            };
            mergedSignals.push(signal);
            return mergedSignals;
        }

        if (signal.end > currentAudio.start) {
            // Trim the start of audio
            const offset = Math.round(
                (signal.end - currentAudio.start) * SAMPLE_RATE,
            );
            currentAudio.data = currentAudio.data.slice(offset);
        }

        signal.end = currentAudio.end;
        signal.data = [...signal.data, ...currentAudio.data];

        return mergedSignals;
    }, []);

    return mergedSignals;
}
