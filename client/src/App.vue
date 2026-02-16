<template>
  <div class="bg-black min-h-screen text-gray-200 font-sans selection:bg-green-500/30">

    <!-- Top Bar -->
    <header
      class="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-black/50 backdrop-blur fixed w-full z-10 top-0">
      <div class="flex items-center gap-3">
        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
        <h1
          class="text-xl font-bold tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
          Omegle Interceptor <span class="text-xs bg-gray-800 text-gray-400 px-1 py-0.5 rounded ml-2">V2</span>
        </h1>
      </div>
      <div class="text-xs text-gray-600 font-mono">
        SYSTEM: ONLINE
      </div>
    </header>

    <!-- Main Content -->
    <main class="pt-20 pb-24 px-4 h-screen flex flex-col max-w-[1920px] mx-auto">
      <MergedChat :client1-status="clients[1]?.status || 'disconnected'"
        :client2-status="clients[2]?.status || 'disconnected'" :merged-log="mergedLog" @client-connect="connectClient"
        @client-disconnect="disconnectClient" @message="sendMessage" @update-settings="updateSettings" />
    </main>

    <!-- Fixed Footer Controls -->
    <footer
      class="fixed bottom-0 w-full border-t border-gray-800 bg-black/80 backdrop-blur p-4 flex items-center justify-center gap-4 z-20 flex-wrap">

      <!-- Global Controls -->
      <div class="flex items-center gap-2 border-r border-gray-800 pr-4">
        <button @click="connectAll"
          class="px-4 py-2 bg-green-900/20 text-green-400 border border-green-900 hover:bg-green-900/40 hover:border-green-500 rounded font-bold uppercase text-xs transition-all">
          Connect All
        </button>
        <button @click="disconnectAll"
          class="px-4 py-2 bg-red-900/20 text-red-400 border border-red-900 hover:bg-red-900/40 hover:border-red-500 rounded font-bold uppercase text-xs transition-all">
          Disconnect All
        </button>
      </div>

      <!-- Relay Toggle -->
      <button @click="toggleRelay" class="px-4 py-2 border rounded font-bold uppercase text-xs transition-all" :class="relayEnabled
        ? 'bg-cyan-900/20 text-cyan-400 border-cyan-900 hover:bg-cyan-900/40 hover:border-cyan-500'
        : 'bg-gray-900/20 text-gray-500 border-gray-700 hover:bg-gray-900/40 hover:border-gray-500'">
        🔗 Relay: {{ relayEnabled ? 'ON' : 'OFF' }}
      </button>

      <!-- Get Cookies -->
      <button @click="openBrowser" :disabled="cookieStatus === 'retrieving'"
        class="px-4 py-2 bg-purple-900/20 text-purple-400 border border-purple-900/50 hover:bg-purple-900/40 hover:border-purple-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bold uppercase text-xs rounded flex items-center gap-2">
        <span v-if="cookieStatus === 'retrieving'"
          class="w-3 h-3 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></span>
        <span v-else>🍪</span>
        {{ cookieStatus === 'retrieving' ? 'Solving...' : cookieStatus === 'ready' ? 'COOKIES ✓' : 'GET COOKIES' }}
      </button>

      <!-- Broadcast -->
      <form @submit.prevent="broadcastMessage" class="flex items-center gap-2 flex-1 max-w-2xl">
        <span class="text-xs font-bold text-yellow-500 uppercase tracking-wider">Broadcast:</span>
        <input v-model="broadcastInput" type="text" placeholder="Send to all strangers..."
          class="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none text-white" />
        <button type="submit"
          class="bg-yellow-600 text-black px-6 py-2 rounded font-bold hover:bg-yellow-500 transition-colors uppercase text-sm">
          Send
        </button>
      </form>

    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { io } from 'socket.io-client';
import MergedChat from './components/MergedChat.vue';
import type { MergedMessage } from './components/MergedChat.vue';

const socket = io('http://localhost:3000');
const broadcastInput = ref('');
const relayEnabled = ref(true);
const cookieStatus = ref<'none' | 'retrieving' | 'ready' | 'error'>('none');

interface ClientData {
  id: number;
  status: string;
}

const clients = reactive<Record<number, ClientData>>({
  1: { id: 1, status: 'disconnected' },
  2: { id: 2, status: 'disconnected' }
});

const mergedLog = reactive<MergedMessage[]>([]);

// Register socket listeners immediately, not in onMounted, to avoid race conditions
socket.on('connect', () => {
  console.log('[SOCKET] Connected to backend, socket.id:', socket.id);
  socket.emit('spawn', 1);
  socket.emit('spawn', 2);
});

socket.on('status', ({ id, status }) => {
  console.log('[SOCKET] status event:', { id, status });
  if (clients[id]) clients[id].status = status;
});

socket.on('message', ({ id, sender, text }) => {
  // Skip 'you' messages — those are relay echoes (stranger's message forwarded to partner)
  // We only want to show what each actual stranger said, plus system messages
  if (sender === 'you') return;
  mergedLog.push({ clientId: id, sender, text });
});

socket.on('relay', (enabled: boolean) => {
  console.log('[SOCKET] relay event:', enabled);
  relayEnabled.value = enabled;
});

socket.on('cookie-status', (status: string) => {
  console.log('[SOCKET] cookie-status event:', status);
  cookieStatus.value = status as any;
});

socket.on('disconnect', () => {
  console.log('[SOCKET] Disconnected from backend');
});

socket.on('connect_error', (err) => {
  console.error('[SOCKET] Connection error:', err);
});

const connectClient = (id: number) => {
  console.log('[ACTION] connectClient called with id:', id);
  socket.emit('action', { clientId: id, action: 'connect' });
};

const disconnectClient = (id: number) => {
  console.log('[ACTION] disconnectClient called with id:', id);
  socket.emit('action', { clientId: id, action: 'disconnect' });
};

const sendMessage = ({ clientId, text }: { clientId: number, text: string }) => {
  socket.emit('message', { clientId, text });
  // Add locally as an injected message (user pretending to be this stranger)
  mergedLog.push({ clientId, sender: 'you', text, type: 'injected' });
};

const updateSettings = ({ clientId, gender, offset }: any) => {
  socket.emit('settings', { clientId, gender, offset });
};

const openBrowser = () => {
  socket.emit('open-browser');
};

const toggleRelay = () => {
  socket.emit('relay', !relayEnabled.value);
};

const connectAll = () => {
  connectClient(1);
  connectClient(2);
};

const disconnectAll = () => {
  disconnectClient(1);
  disconnectClient(2);
};

const broadcastMessage = () => {
  if (broadcastInput.value.trim()) {
    socket.emit('broadcast', { text: broadcastInput.value });
    // Add to merged log as broadcast for both strangers
    mergedLog.push({ clientId: 0, sender: 'sys', text: broadcastInput.value, type: 'broadcast' });
    broadcastInput.value = '';
  }
};
</script>

<style>
/* Custom Scrollbar for the whole page */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: #000;
}

::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
