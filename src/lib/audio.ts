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
    >((mergedSignals, currentAudio, index) => {
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

        console.assert(
            signal.end > 0 && signal.end > currentAudio.start,
            `There is a ${(currentAudio.start - signal.end).toFixed(0)}s gap after audio ${index}`,
            { signal, currentAudio },
        );

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

    return mergedSignals.map((signal) => {
        return {
            ...signal,
            buffer: wav.encode([Float32Array.from(signal.data)], {
                sampleRate: SAMPLE_RATE,
                bitDepth: 16,
            }),
        };
    });
}

function normalizeAudioBuffer(audioBuffer: AudioBuffer) {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;

    for (let channel = 0; channel < numberOfChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        let maxAmplitude = 0;
        // Find the maximum amplitude
        for (let i = 0; i < length; i++) {
            const amplitude = Math.abs(channelData[i]);
            if (amplitude > maxAmplitude) {
                maxAmplitude = amplitude;
            }
        }

        // Normalize the channel data
        for (let i = 0; i < length; i++) {
            channelData[i] /= maxAmplitude;
        }
    }
}

export function mixAudioBuffers(
    buffers: [AudioBuffer, AudioBuffer],
    context: AudioContext,
) {
    buffers.forEach(normalizeAudioBuffer);

    const numberOfChannels = Math.max(
        ...buffers.map((b) => b.numberOfChannels),
    );
    // TODO: if the sources have different length, add padding
    const length = Math.min(...buffers.map((b) => b.length));
    const sampleRate = SAMPLE_RATE;

    const mixedBuffer = context.createBuffer(
        numberOfChannels,
        length,
        sampleRate,
    );

    for (let channel = 0; channel < numberOfChannels; channel++) {
        const allChannelData = buffers.map((b) =>
            b.getChannelData(channel % b.numberOfChannels),
        );
        const mixedChannelData = mixedBuffer.getChannelData(channel);
        for (let i = 0; i < length; i++) {
            mixedChannelData[i] =
                (allChannelData[0][i] + allChannelData[1][i]) / 2;
        }
    }

    normalizeAudioBuffer(mixedBuffer);
    return mixedBuffer;
}

// export async function mixAudioFiles(...files: File[]) {
// const audioBuffers = await Promise.all(files.map(readAudioFile));

//     // const mixedBuffer = mixAudioBuffers(audioBuffers);

//     // const audioContext = new window.AudioContext();
//     const blob = await bufferToWaveBlob(mixedBuffer, audioContext.sampleRate);
//     const url = URL.createObjectURL(blob);
//     return url;
// }

// async function bufferToWaveBlob(
//     buffer: AudioBuffer,
//     sampleRate: number,
// ): Promise<Blob> {
//     return new Promise((resolve) => {
//         const worker = new Worker(
//             URL.createObjectURL(
//                 new Blob([
//                     `
//             self.onmessage = function(event) {
//                 const { buffer, sampleRate } = event.data;
//                 const numberOfChannels = buffer.numberOfChannels;
//                 const length = buffer.length * numberOfChannels * 2 + 44;
//                 const result = new DataView(new ArrayBuffer(length));

//                 let offset = 0;
//                 const writeString = function(str) {
//                     for (let i = 0; i < str.length; i++) {
//                         result.setUint8(offset++, str.charCodeAt(i));
//                     }
//                 };

//                 writeString('RIFF');  // ChunkID
//                 result.setUint32(offset, 36 + buffer.length * numberOfChannels * 2, true); offset += 4; // ChunkSize
//                 writeString('WAVE');  // Format
//                 writeString('fmt ');  // Subchunk1ID
//                 result.setUint32(offset, 16, true); offset += 4;  // Subchunk1Size
//                 result.setUint16(offset, 1, true); offset += 2;  // AudioFormat
//                 result.setUint16(offset, numberOfChannels, true); offset += 2;  // NumChannels
//                 result.setUint32(offset, sampleRate, true); offset += 4;  // SampleRate
//                 result.setUint32(offset, sampleRate * numberOfChannels * 2, true); offset += 4;  // ByteRate
//                 result.setUint16(offset, numberOfChannels * 2, true); offset += 2;  // BlockAlign
//                 result.setUint16(offset, 16, true); offset += 2;  // BitsPerSample
//                 writeString('data');  // Subchunk2ID
//                 result.setUint32(offset, buffer.length * numberOfChannels * 2, true); offset += 4;  // Subchunk2Size

//                 for (let i = 0; i < buffer.length; i++) {
//                     for (let channel = 0; channel < numberOfChannels; channel++) {
//                         const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
//                         result.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
//                         offset += 2;
//                     }
//                 }

//                 self.postMessage(result.buffer, [result.buffer]);
//             };
//         `,
//                 ]),
//             ),
//         );

//         worker.onmessage = function (event) {
//             resolve(new Blob([event.data], { type: "audio/wav" }));
//             worker.terminate();
//         };

//         worker.postMessage({ buffer, sampleRate });
//     });
// }
