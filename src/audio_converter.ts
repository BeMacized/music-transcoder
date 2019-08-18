import { Injectable } from 'injection-js';
import { OnInit } from './utils/generic';
import { Provider } from './utils/provider';
import chokidar, { FSWatcher } from 'chokidar';
import SoxAsync from 'sox-async';
import fs, { existsSync } from 'fs';
import nodePath from 'path';
import PQueue from 'p-queue';
import * as mm from 'music-metadata';
import mkdirp from 'mkdirp';

const OUTPUT_FORMAT = {
    type: 'mp3',
    rate: 44100,
    channels: 2
};

@Injectable()
export class AudioConverter extends Provider implements OnInit {
    _watcher: FSWatcher;
    _sox: SoxAsync;
    _queue: PQueue;

    async onInit() {
        // Initialise promise queue
        this._queue = new PQueue({ concurrency: 1 });
        // Initialise sox
        this._sox = new SoxAsync();
        // Initialise file watcher
        this._watcher = chokidar.watch(process.cwd() + '/music_in/**/*', {
            ignored: /^\./,
            followSymlinks: false,
            usePolling: true,
            interval: 1000,
            binaryInterval: 1000,
            cwd: process.cwd() + '/music_in'
        });
        this._watcher
            .on('add', this._onAdd)
            .on('change', this._onChange)
            .on('unlink', this._onRemove)
            .on('error', e => this.error(e));
    }

    _onAdd = async (path: string) => {
        await this._queue.add(async () => {
            // Check if already transcoded
            const outputPath = await this._outputPathForPath(path);
            const inputPath = this._inputPathForPath(path);
            if (fs.existsSync(outputPath)) return;
            // Create folder
            await mkdirp.sync(nodePath.dirname(outputPath));
            // Check if transcodable
            if (await this._isAudioFile(inputPath)) {
                await mkdirp.sync(nodePath.dirname(outputPath));
                // Start transcoding
                try {
                    await this._sox.run({
                        inputFile: inputPath,
                        output: OUTPUT_FORMAT,
                        outputFile: outputPath
                    });
                    this.info('Transcoded', path);
                } catch (e) {
                    this.error('Could not transcode', path, e);
                }
            } else {
                // Just copy file if not transcodable
                this.info('Moving file', path);
                fs.copyFileSync(inputPath, outputPath);
            }
        });
    };

    _onChange = async (path: string) => {
        await this._queue.add(async () => {
            const outputPath = await this._outputPathForPath(path);
            const inputPath = this._inputPathForPath(path);
            // Create folder
            await mkdirp.sync(nodePath.dirname(outputPath));
            // Check if transcodable
            if (await this._isAudioFile(inputPath)) {
                await mkdirp.sync(nodePath.dirname(outputPath));
                // Start transcoding
                try {
                    await this._sox.run({
                        inputFile: inputPath,
                        output: OUTPUT_FORMAT,
                        outputFile: outputPath
                    });
                    this.info('Transcoded', path);
                } catch (e) {
                    this.error('Could not transcode', path, e);
                }
            } else {
                // Just copy file if not transcodable
                this.info('Moving file', path);
                fs.copyFileSync(inputPath, outputPath);
            }
        });
    };

    _onRemove = async (path: string) => {
        await this._queue.add(async () => {
            const outPath = await this._outputPathForPath(path);
            if (fs.existsSync(outPath)) {
                fs.unlinkSync(process.cwd() + '/music_out/' + path);
                this.info('Removed', path);
                let parentPath = nodePath.dirname(outPath);
                while (!parentPath.endsWith('music_out')) {
                    if (fs.readdirSync(parentPath).length > 0) break;
                    fs.rmdirSync(parentPath);
                    parentPath = nodePath.dirname(parentPath);
                }
            }
        });
    };

    _outputPathForPath = async (path: string) => {
        const pathData = nodePath.parse(path);
        pathData.ext = (await this._isAudioFile(this._inputPathForPath(path))) ? OUTPUT_FORMAT.type : pathData.ext.substr(1);
        return nodePath.join(process.cwd(), 'music_out', pathData.dir, pathData.name + '.' + pathData.ext);
    };

    _inputPathForPath = (path: string) => {
        return process.cwd() + '/music_in/' + path;
    };

    _isAudioFile = async (path: string) => {
        try {
            await mm.parseFile(path);
            return true;
        } catch (e) {
            return false;
        }
    };
}
