import { BrowserContext, Page } from 'playwright';

export interface OmegleClientOptions {
    /**
     * Existing BrowserContext to use. If not provided, a new one relies on external management or defaults.
     * Ideally, the client can just take a Page or Context.
     */
    browserContext?: BrowserContext;

    /**
     * Existing Page to use. If provided, browserContext is ignored.
     */
    page?: Page;

    /**
     * User agent string to use.
     */
    userAgent?: string;

    /**
     * Locale for the session.
     */
    locale?: string;

    /**
     * Path to the storage state (cookies/localStorage) file.
     */
    storageStatePath?: string;

    /**
     * Enable debug logging.
     */
    debug?: boolean;

    /**
     * Optional cookie string for the WebSocket handshake (e.g., cf_clearance).
     */
    cookie?: string;
}

export type MessageSender = 'stranger' | 'you' | 'system';

export interface MessageEvent {
    text: string;
    sender: MessageSender;
    timestamp: number;
}

// WebSocket Packet Definitions
export interface HeartbeatPacket {
    channel: 'heartbeat';
    data: {
        timestamp: number;
    };
}

export interface PeopleOnlinePacket {
    channel: 'peopleOnline';
    data?: number;
}

export interface SelfCountryPacket {
    channel: 'selfCountry';
    data: {
        country: string;
        countryName: string;
        available: boolean;
    };
}

export interface MatchPacket {
    channel: 'match';
    data: {
        data: 'text' | 'video';
        params: {
            interests: string[];
            preferSameCountry: boolean;
        };
    };
}

export interface ConnectedPacket {
    channel: 'connected';
    data: any[];
}

export interface PeerCountryPacket {
    channel: 'peerCountry';
    data: {
        country: string;
        countryName: string;
    };
}

export interface UserStatusPacket {
    channel: 'userAFK' | 'userActive';
    data: {
        timestamp: number;
        reason: 'window_blur' | 'window_focus';
    };
}

export interface TypingPacket {
    channel: 'typing';
    data: boolean;
}

export interface IncomingMessagePacket {
    channel: 'message';
    data: string;
}

// Discriminated Union for all possible WebSocket incoming data
export type OmegleWebSocketPacket =
    | HeartbeatPacket
    | PeopleOnlinePacket
    | SelfCountryPacket
    | MatchPacket
    | ConnectedPacket
    | PeerCountryPacket
    | UserStatusPacket
    | TypingPacket
    | IncomingMessagePacket;

export interface OmegleEvents {
    'ready': () => void;
    'waiting': () => void;
    'connected': () => void;
    'disconnected': () => void;
    'message': (message: MessageEvent) => void;
    'typing': (isTyping: boolean) => void;
    'stoppedTyping': () => void;
    'captcha': () => void;
    'count': (count: number) => void;
    'heartbeat': (timestamp: number) => void;
    'peerCountry': (data: { country: string, countryName: string }) => void;
    'error': (error: Error) => void;
    'packet': (packet: OmegleWebSocketPacket) => void;
}
