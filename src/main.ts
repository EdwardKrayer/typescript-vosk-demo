import { Vosk } from "./services/service.vosk";
import { createReadStream } from "fs";
import type { ReadStream } from "fs";
import { Readable } from "stream";
import { Reader } from "wav";

let wfStream: ReadStream

let vosk: Vosk = new Vosk('./model');

let args: string[] = process.argv.slice(2);

let wfReader: Reader = new Reader();

wfReader.on('format', async ({ audioFormat, sampleRate, channels, endianness }) => {

    if (audioFormat != 1 || channels != 1 || sampleRate != 44100 || endianness != 'LE') {
        console.error("Audio file must be WAV format mono PCM.");
        process.exit(1);
    }
    let start: number = performance.now()
    for await (let data of new Readable().wrap(wfReader)) {
        await vosk.AcceptWaveform(data);
    }
    let res: number = (performance.now() - start) / 1000
    console.log(vosk.FinalResult());
    console.log('Time Taken to execute = ', res, ' seconds');
});


args.forEach((path: string) => {
    wfStream = createReadStream(path);
    wfStream.pipe(wfReader);
});