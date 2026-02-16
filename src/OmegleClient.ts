import { EventEmitter } from 'events';
import WebSocket from 'ws';
import { OmegleClientOptions, OmegleEvents, OmegleWebSocketPacket, MessageEvent } from './types';
import { IncomingMessage } from 'http';

export declare interface OmegleClient {
    on<U extends keyof OmegleEvents>(event: U, listener: OmegleEvents[U]): this;
    emit<U extends keyof OmegleEvents>(event: U, ...args: Parameters<OmegleEvents[U]>): boolean;
}

export class OmegleClient extends EventEmitter {
    private socket: WebSocket | null = null;
    public isConnected: boolean = false;
    private options: OmegleClientOptions;
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor(options: OmegleClientOptions = {}) {
        super();
        this.options = options;
    }

    /**
     * Initialize the client.
     */
    async init() {
        this.emit('ready');
    }

    /**
     * Connect to Omegle via WebSocket.
     */
    async connect(interests: string[] = []) {
        this.log("Connecting to WebSocket...");

        return new Promise<void>((resolve, reject) => {
            const url = 'wss://omegleweb.io:8443/';

            // Use headers that bypass 403 (Cloudflare/handshake)
            this.socket = new WebSocket(url, {
                headers: {
                    'Host': 'omegleweb.io:8443',
                    'Connection': 'Upgrade',
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36',
                    'Upgrade': 'websocket',
                    'Origin': 'https://omegleweb.io',
                    'Sec-WebSocket-Version': '13',
                    'Accept-Language': 'en-US,en;q=0.9',
                    'Sec-Fetch-Dest': 'websocket',
                    'Sec-Fetch-Mode': 'websocket',
                    'Sec-Fetch-Site': 'cross-site',
                    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                    'Sec-Ch-Ua-Mobile': '?0',
                    'Sec-Ch-Ua-Platform': '"Windows"',
                    'Cookie': this.options.cookie || ''
                }
            });

            this.socket.on('unexpected-response', (req: any, res: IncomingMessage) => {
                this.log(`Unexpected server response: ${res.statusCode} ${res.statusMessage}`);
                this.emit('error', new Error(`Unexpected server response: ${res.statusCode} ${res.statusMessage}`));
                reject(new Error(`Unexpected server response: ${res.statusCode} ${res.statusMessage}`));
            });

            this.socket.on('open', () => {
                this.log("WebSocket established!");
                this.isConnected = true;
                this.emit('connected');

                // Start heartbeats if needed (usually Omegle expects it)
                this.heartbeatInterval = setInterval(() => {
                    this.sendPacket({ channel: 'heartbeat', data: { timestamp: Date.now() } });
                }, 30000);

                resolve();
            });

            this.socket.on('message', (data: WebSocket.Data) => {
                try {
                    const packet = JSON.parse(data.toString()) as OmegleWebSocketPacket;
                    this.handlePacket(packet);
                } catch (e) {
                    this.log(`Failed to parse packet: ${data}`);
                }
            });

            this.socket.on('close', (code: number, reason: Buffer) => {
                this.log(`WebSocket closed: ${code} ${reason.toString()}`);
                this.cleanup();
                this.emit('disconnected');
            });

            this.socket.on('error', (err: Error) => {
                this.emit('error', err);
                reject(err);
            });
        });
    }

    private handlePacket(packet: OmegleWebSocketPacket) {
        console.log(`[OmegleClient] Received packet:`, JSON.stringify(packet, null, 2));
        this.emit('packet', packet);

        switch (packet.channel) {
            case 'peopleOnline':
                if (typeof packet.data === 'number') {
                    this.emit('count', packet.data);
                }
                break;
            case 'heartbeat':
                this.emit('heartbeat', packet.data.timestamp);
                break;
            case 'selfCountry':
                this.log(`Detected country: ${packet.data.countryName}`);
                break;
            case 'connected':
                this.isConnected = true;
                this.emit('connected');
                break;
            case 'peerCountry':
                this.emit('peerCountry', packet.data);
                break;
            case 'typing':
                this.emit('typing', packet.data);
                if (!packet.data) {
                    this.emit('stoppedTyping');
                }
                break;
            case 'message':
                this.emit('message', {
                    text: packet.data,
                    sender: 'stranger',
                    timestamp: Date.now()
                });
                break;
            case 'disconnect':
                this.log('Stranger disconnected');
                this.disconnect();
                break;
        }
    }

    /**
     * Start matching with a stranger.
     */
    async startMatching(interests: string[] = [], preferSameCountry: boolean = true) {
        this.sendPacket({
            channel: 'match',
            data: {
                data: 'text',
                params: {
                    interests,
                    preferSameCountry
                }
            }
        });
        this.emit('waiting');
    }

    private sendPacket(packet: any) {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(packet));
        }
    }

    async disconnect() {
        if (this.socket) {
            this.socket.close();
            this.socket = null;
        }
        this.cleanup();
    }

    async sendMessage(text: string) {
        this.sendPacket({
            channel: 'message',
            data: text
        });

        this.emit('message', {
            text: text,
            sender: 'you',
            timestamp: Date.now()
        });
    }

    private cleanup() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        this.isConnected = false;
    }

    private log(msg: string) {
        if (this.options.debug) {
            console.log(`[OmegleClient] ${msg}`);
        }
    }
}
