import { Injectable } from 'injection-js';
import { OnInit } from './utils/generic';
import { Provider } from './utils/provider';
import chokidar, { FSWatcher } from 'chokidar';
import fs, { existsSync } from 'fs';
import nodePath from 'path';
import PQueue from 'p-queue';
import * as mm from 'music-metadata';
import mkdirp from 'mkdirp';
import ffmpeg from 'fluent-ffmpeg';
import glob from 'glob';

@Injectable()
export class AudioConverter extends Provider implements OnInit {
    _watcher: FSWatcher;
    _queue: PQueue;

    async onInit() {
        // Initialise promise queue
        this._queue = new PQueue({ concurrency: 12 });
        // Initialise file watcher
        this._watcher = chokidar.watch(process.cwd() + '/music_in/**/*', {
            ignored: /^\./,
            followSymlinks: false,
            usePolling: false,
            interval: 1000,
            binaryInterval: 1000,
            cwd: process.cwd() + '/music_in'
        });
        this._watcher
            .on('add', this._onAdd)
            .on('change', this._onChange)
            .on('unlink', this._onRemove)
            .on('error', e => this.error(e));
        this.info('Started audio converter service');
    }

    _transcode = async (inputPath: string, outputPath: string) => {
        await new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .audioCodec('libmp3lame')
                .audioQuality(2)
                .audioBitrate(44100)
                .audioChannels(2)
                .on('error', (err, stdout, stderr) => {
                    reject(err);
                })
                .on('end', (stdout, stderr) => {
                    resolve();
                })
                .saveToFile(outputPath);
        });
    };

    _onAdd = async (path: string) => {
        console.log('QUEUE ADD', path);
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
                this.info('Transcoding...', path);
                try {
                    await this._transcode(inputPath, outputPath);
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
        console.log('QUEUE CHANGE', path);
        await this._queue.add(async () => {
            const outputPath = await this._outputPathForPath(path);
            const inputPath = this._inputPathForPath(path);
            // Create folder
            await mkdirp.sync(nodePath.dirname(outputPath));
            // Check if transcodable
            this.info('Transcoding...', path);
            if (await this._isAudioFile(inputPath)) {
                await mkdirp.sync(nodePath.dirname(outputPath));
                // Start transcoding
                this.info('Transcoding...', path);
                try {
                    await this._transcode(inputPath, outputPath);
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
        console.log('QEUEUE REMOVE', path);
        await this._queue.add(async () => {
            const pathNoExt = path
                .split('.')
                .slice(0, -1)
                .join();
            glob(process.cwd() + '/music_out/' + pathNoExt + '*', {}, (err, files) => {
                files.forEach(file => {
                    fs.unlinkSync(file);
                    this.info('Removed', path);
                    let parentPath = nodePath.dirname(file);
                    while (!parentPath.endsWith('music_out')) {
                        if (fs.readdirSync(parentPath).length > 0) break;
                        fs.rmdirSync(parentPath);
                        parentPath = nodePath.dirname(parentPath);
                    }
                });
            });
        });
    };

    _outputPathForPath = async (path: string) => {
        const pathData = nodePath.parse(path);
        const isAudioFile = await this._isAudioFile(this._inputPathForPath(path));
        pathData.ext = isAudioFile ? 'mp3' : pathData.ext.substr(1);
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
