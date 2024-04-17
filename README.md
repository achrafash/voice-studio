## Todos

-   setup SemVer
    -   find the best workflow (put the version on the frontend + single command)
    -   dynamic module set on post-build (script that writes to the module from package.json.version)
    -   feature branches with git tags
    -   single command to bump package.json version + git tag with message
-   drop audio files with the naming convention `<start>-<end>-<source>.wav`
-   merge audio in a single track
-   audio player
    -   waveform
    -   cursors (current and other breakpoints)
    -   playback speed
    -   zoom in/out
-   text box and selectors for transcribing and other labels
-   blocks view
    -   cursors for each breakpoint
    -   highlight current block in audio the player
    -   highlight current part of the transcript (opacity, background text color)
    -   navigate to next/prev block
    -   click on transcript to move to audio block
-   adjust block timestamps
-   store state in a single JSON object (mobx-state-tree)
-   JSON mode: visualize the ground-truth file and edit directly
-   run Whisper to do a first pass on transcription
-   visualize Whisper confidence
-   run diarization pipeline to label speakers and add speaker turn cursors
    -   use Pyannote embedding from HuggingFace
-   turn cursors on/off: blocks, speaker turns, …
-   export labeled sample
-   leave comments on blocks for other users
-   upload existing ground truth
    -   validate format


## Stack

-   NextJS (TS)
-   TailwindCSS (Shadcn/UI)
-   ONNX + HuggingFace
-   Sqlite + Prisma
-   MobX
