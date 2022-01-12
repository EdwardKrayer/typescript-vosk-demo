import { Library } from 'ffi-napi';
import * as ref from 'ref-napi';
import { join, resolve, delimiter } from 'path';

const vosk_model = ref.types.void;
const vosk_model_ptr = ref.refType(vosk_model);
const vosk_spk_model = ref.types.void;
const vosk_spk_model_ptr = ref.refType(vosk_spk_model);
const vosk_recognizer = ref.types.void;
const vosk_recognizer_ptr = ref.refType(vosk_recognizer);

export class VoskModel {
    public library: any;
    public handle: ref.Type;

    constructor(vosk: Library, modelPath: string) {
        this.library = vosk;
        this.handle = this.library.vosk_model_new(modelPath)
        return this;
    }

    setHandle = function (this: any, modelPath: string): ref.Type {
        if (this.handle) this.free();
        this.handle = this.library.vosk_model_new(modelPath);
        return this.handle;
    }

    release = function (this: any) {
        this.library.vosk_model_free(this.handle)
    }

}

export class VoskRecognizer {
    public library: any;
    public handle: ref.Type;
    public model: VoskModel;

    constructor(vosk: Library, model: VoskModel, sampleRate: number = 44100) {
        this.library = vosk;
        this.model = model;
        this.handle = this.library.vosk_recognizer_new(
            model.handle,
            sampleRate
        );
        return this;
    }

    setModel = function (this: any, model: VoskModel): VoskModel {
        if (this.model) this.model.free();
        return model;
    };

    setHandle = function (this: any, sampleRate: number): void {
        this.handle = this.library.vosk_recognizer_new(
            this.model.handle,
            sampleRate
        );
    };

    release = async function (this: any): Promise<void> {
        return this.library.vosk_recognizer_free(this.handle);
    };
}

export class Vosk {
    dllPath: string;
    public library: any;
    public model: VoskModel;
    public recognizer: VoskRecognizer;

    constructor(modelPath: string, sampleRate = 44100, logLevel: number = 2) {

        let currentPath = process.env.Path;
        let dllDirectory = resolve(join(__dirname, "..", "..", "node_modules", "vosk", "lib", "win-x86_64"));
        process.env.Path = currentPath + delimiter + dllDirectory;

        this.dllPath = join(__dirname, "..", "..", "node_modules", "vosk", "lib", "win-x86_64", "libvosk.dll")

        console.log('dllPath', this.dllPath);

        this.library = Library(this.dllPath, {
            'vosk_set_log_level': ['void', ['int']],
            'vosk_model_new': [vosk_model_ptr, ['string']],
            'vosk_model_free': ['void', [vosk_model_ptr]],
            'vosk_spk_model_new': [vosk_spk_model_ptr, ['string']],
            'vosk_spk_model_free': ['void', [vosk_spk_model_ptr]],
            'vosk_recognizer_new': [vosk_recognizer_ptr, [vosk_model_ptr, 'float']],
            'vosk_recognizer_new_spk': [vosk_recognizer_ptr, [vosk_model_ptr, 'float', vosk_spk_model_ptr]],
            'vosk_recognizer_new_grm': [vosk_recognizer_ptr, [vosk_model_ptr, 'float', 'string']],
            'vosk_recognizer_free': ['void', [vosk_recognizer_ptr]],
            'vosk_recognizer_set_max_alternatives': ['void', [vosk_recognizer_ptr, 'int']],
            'vosk_recognizer_set_words': ['void', [vosk_recognizer_ptr, 'bool']],
            'vosk_recognizer_set_spk_model': ['void', [vosk_recognizer_ptr, vosk_spk_model_ptr]],
            'vosk_recognizer_accept_waveform': ['bool', [vosk_recognizer_ptr, 'pointer', 'int']],
            'vosk_recognizer_result': ['string', [vosk_recognizer_ptr]],
            'vosk_recognizer_final_result': ['string', [vosk_recognizer_ptr]],
            'vosk_recognizer_partial_result': ['string', [vosk_recognizer_ptr]],
            'vosk_recognizer_reset': ['void', [vosk_recognizer_ptr]],
        });

        const voskModel: VoskModel = new VoskModel(this.library, modelPath);


        const voskRecognizer: VoskRecognizer = new VoskRecognizer(
            this.library,
            voskModel,
            sampleRate
        );

        this.model = voskModel;
        this.recognizer = voskRecognizer;

        this.library.vosk_recognizer_set_max_alternatives(voskModel.handle, 3);
        this.library.vosk_recognizer_set_words(voskModel.handle, true);

        this.SetLogLevel(logLevel);
    }

    public setModel = function (this: any, model: VoskModel): VoskModel {
        if (this.model) this.model.free();
        if (this.recognizer) this.recognizer.free();
        this.model = model;
        return model;
    };

    public setRecognizer = function (this: any, recognizer: VoskRecognizer): VoskRecognizer {
        if (this.recognizer) this.recognizer.free();
        this.recognizer = recognizer;
        return recognizer;
    };

    public AcceptWaveform = function (this: any, buffer: any): boolean {
        return this.library.vosk_recognizer_accept_waveform(
            this.recognizer.handle,
            buffer,
            buffer.length
        );
    };

    public Result = function (this: any): string {
        return this.library.vosk_recognizer_result(this.recognizer.handle);
    };

    public PartialResult = function (this: any): string {
        return this.library.vosk_recognizer_partial_result(
            this.recognizer.handle
        );
    };

    public FinalResult = function (this: any): string {
        return this.library.vosk_recognizer_final_result(
            this.recognizer.handle
        );
    };

    public SetLogLevel = function (this: any, level: number) {
        this.library.vosk_set_log_level(level);
    };
}
