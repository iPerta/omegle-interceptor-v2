
import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { OmegleClient, MessageEvent } from './index';
import { BrowserManager } from './BrowserManager';

const app = express();
app.use(cors());
const server = http.createServer(app);

let currentCookie = "";
let relayEnabled = true;
const browserManager = new BrowserManager();

const io = new Server(server, {
    cors: {
        origin: "*", // allow all for dev
        methods: ["GET", "POST"]
    }
});

const PORT = 3000;

// --- Data Structures ---
interface ClientState {
    id: number;
    client: OmegleClient;
    status: 'disconnected' | 'connecting' | 'waiting' | 'connected';
    genderInversion: boolean;
    numberOffset: number;
    log: { sender: 'you' | 'stranger' | 'sys', text: string }[];
}

const clients = new Map<number, ClientState>();

// --- Helper Functions ---
const getClientState = (id: number): ClientState => {
    if (!clients.has(id)) {
        // Initialize if not exists
        const cookie = "cf_clearance=Dntw0Nj1EsjHPqLSTzyOzyqZ_u4kGLbtbAUcbakqIfI-1771160117-1.2.1.1-T1p2riQNKN_4fFNjx4jhwsSDNC75YrSi..CulPJcFyXBYN5ZVtKzg1qP7IUa1vi1_P86lgAoXEPZhA_k6_Ll1oR_VkEPM_BXXp2NUimI6HBI6b2Jmb8jKpwvtqy8.DBaQU7A6W6AmAPKTlpSyOYW1Z0t6PjTPBZV_w9Tlzmp9tEJ_nx.xe.UClJP9sfe583Aj2Lc4TfU_DF54c.tJjSvkm6j1VCvAy_fk5MoewrgpOKAljtODk8yMDL9V6xH.SGi; randid=6061061365092788;";
        const client = new OmegleClient({ debug: true, cookie });
        const state: ClientState = {
            id,
            client,
            status: 'disconnected',
            genderInversion: false,
            numberOffset: 0,
            log: []
        };
        setupClientEvents(state);
        clients.set(id, state);
    }
    return clients.get(id)!;
};

const setupClientEvents = (state: ClientState) => {
    const { client, id } = state;

    client.on('ready', () => updateStatus(id, 'connecting'));
    client.on('waiting', () => {
        updateStatus(id, 'waiting');
        emitLog(id, 'sys', 'Looking for a stranger...');
    });
    client.on('connected', () => {
        updateStatus(id, 'connected');
        emitLog(id, 'sys', 'Connected to stranger!');
    });
    client.on('disconnected', () => {
        updateStatus(id, 'disconnected');
        emitLog(id, 'sys', 'Disconnected.');
    });
    client.on('message', (msg: MessageEvent) => {
        if (msg.sender === 'stranger') {
            // Apply transformations
            let text = msg.text;
            if (state.genderInversion) {
                text = text.replace(/(?<![a-zA-Z])([mf])(?![a-zA-Z])/gi, (match) => {
                    if (match.toLowerCase() === 'm') return match === 'M' ? 'F' : 'f';
                    return match === 'F' ? 'M' : 'm';
                });
            }
            if (state.numberOffset !== 0) {
                text = text.replace(/-?\d+/g, (match) => {
                    return (parseInt(match) + state.numberOffset).toString();
                });
            }

            emitLog(id, 'stranger', text);

            // Relay to partner client
            if (relayEnabled) {
                const partnerId = id === 1 ? 2 : 1;
                const partner = clients.get(partnerId);
                if (partner && partner.status === 'connected') {
                    partner.client.sendMessage(text);
                    emitLog(partnerId, 'you', text);
                }
            }
        }
    });
    client.on('error', (err) => {
        console.error(`Client ${id} error:`, err);
        emitLog(id, 'sys', `Error: ${err}`);
    });
};

const updateStatus = (id: number, status: ClientState['status']) => {
    const state = clients.get(id);
    if (state) {
        state.status = status;
        io.emit('status', { id, status });
    }
};

const emitLog = (id: number, sender: 'you' | 'stranger' | 'sys', text: string) => {
    const state = clients.get(id);
    if (state) {
        state.log.push({ sender, text });
        io.emit('message', { id, sender, text });
    }
};

// --- Socket Events ---
io.on('connection', (socket: Socket) => {
    console.log('UI Connected');

    // Send initial state
    clients.forEach((state) => {
        socket.emit('status', { id: state.id, status: state.status });
        // Optionally send full log history if needed
    });

    socket.on('spawn', (id: number) => {
        getClientState(id);
        socket.emit('status', { id, status: 'disconnected' });
    });

    socket.on('action', async ({ clientId, action }: { clientId: number, action: string }) => {
        const state = getClientState(clientId);
        if (action === 'connect') {
            if (state.status === 'disconnected') {
                // Reset client instance to ensure fresh start
                // Generate 16 digit randid
                const randid = Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('');

                // Combine currentCookie (from browser) with new randid
                // If currentCookie is empty, connection might fail, but client can retry after opening browser.
                let finalCookie = currentCookie;
                if (!finalCookie.includes('randid=')) {
                    finalCookie = `${finalCookie}; randid=${randid};`;
                }

                const newClient = new OmegleClient({
                    debug: true,
                    cookie: finalCookie
                });
                state.client = newClient;
                setupClientEvents(state);

                try {
                    await state.client.init(); // Init if needed
                    await state.client.connect();
                    await state.client.startMatching();
                } catch (e) {
                    console.error(e);
                    emitLog(clientId, 'sys', 'Failed to connect');
                    updateStatus(clientId, 'disconnected');
                }
            }
        } else if (action === 'disconnect') {
            await state.client.disconnect();
        }
    });

    socket.on('settings', ({ clientId, gender, offset }) => {
        const state = getClientState(clientId);
        state.genderInversion = gender;
        state.numberOffset = offset;
    });

    socket.on('relay', (enabled: boolean) => {
        relayEnabled = enabled;
        io.emit('relay', relayEnabled);
        console.log(`Relay ${relayEnabled ? 'enabled' : 'disabled'}`);
    });

    socket.on('open-browser', async () => {
        io.emit('cookie-status', 'retrieving');
        try {
            await browserManager.launch();
            const cookies = await browserManager.waitForCookies();
            if (cookies) {
                currentCookie = cookies;
                console.log("Cookies retrieved:", currentCookie);
                io.emit('cookie-status', 'ready');
            }
            await browserManager.close();
        } catch (err) {
            console.error("Browser Error:", err);
            io.emit('cookie-status', 'error');
        }
    });

    socket.on('message', async ({ clientId, text }: { clientId: number, text: string }) => {
        const state = getClientState(clientId);
        if (state.status === 'connected') {
            await state.client.sendMessage(text);
            emitLog(clientId, 'you', text);
        }
    });

    socket.on('broadcast', async ({ text }: { text: string }) => {
        clients.forEach(async (state) => {
            if (state.status === 'connected') {
                await state.client.sendMessage(text);
                emitLog(state.id, 'you', `[Broadcast] ${text}`);
            }
        });
    });
});

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
