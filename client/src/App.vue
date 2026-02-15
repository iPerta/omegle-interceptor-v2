<template>
  <div class="bg-black min-h-screen text-gray-200 font-sans selection:bg-green-500/30">
    
    <!-- Top Bar -->
    <header class="h-16 border-b border-gray-800 flex items-center justify-between px-6 bg-black/50 backdrop-blur fixed w-full z-10 top-0">
      <div class="flex items-center gap-3">
        <div class="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_#22c55e]"></div>
        <h1 class="text-xl font-bold tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">
          Omegle Interceptor <span class="text-xs bg-gray-800 text-gray-400 px-1 py-0.5 rounded ml-2">V2</span>
        </h1>
      </div>
      <div class="text-xs text-gray-600 font-mono">
        SYSTEM: ONLINE
      </div>
    </header>

    <!-- Main Content -->
    <main class="pt-20 pb-24 px-4 h-screen flex flex-col max-w-[1920px] mx-auto">
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
        <!-- Client 1 -->
        <ClientCard 
          :id="1" 
          :status="clients[1]?.status || 'disconnected'" 
          :logs="clients[1]?.log || []"
          @connect="connectClient"
          @disconnect="disconnectClient"
          @message="sendMessage"
          @update-settings="updateSettings"
          @open-browser="openBrowser"
        />

        <!-- Client 2 -->
        <ClientCard 
          :id="2" 
          :status="clients[2]?.status || 'disconnected'"
          :logs="clients[2]?.log || []"
          @connect="connectClient"
          @disconnect="disconnectClient"
          @message="sendMessage"
          @update-settings="updateSettings"
          @open-browser="openBrowser"
        />
      </div>

    </main>

    <!-- Fixed Footer Controls -->
    <footer class="fixed bottom-0 w-full h-20 border-t border-gray-800 bg-black/80 backdrop-blur p-4 flex items-center justify-center gap-4 z-20">
      
      <!-- Global Controls -->
      <div class="flex items-center gap-2 border-r border-gray-800 pr-4">
        <button @click="connectAll" class="px-4 py-2 bg-green-900/20 text-green-400 border border-green-900 hover:bg-green-900/40 hover:border-green-500 rounded font-bold uppercase text-xs transition-all">
          Connect All
        </button>
        <button @click="disconnectAll" class="px-4 py-2 bg-red-900/20 text-red-400 border border-red-900 hover:bg-red-900/40 hover:border-red-500 rounded font-bold uppercase text-xs transition-all">
          Disconnect All
        </button>
      </div>

      <!-- Broadcast -->
      <form @submit.prevent="broadcastMessage" class="flex items-center gap-2 flex-1 max-w-2xl">
        <span class="text-xs font-bold text-yellow-500 uppercase tracking-wider">Broadcast:</span>
        <input v-model="broadcastInput" type="text" placeholder="Send to all strangers..." 
               class="flex-1 bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm focus:border-yellow-500 focus:outline-none text-white"/>
        <button type="submit" class="bg-yellow-600 text-black px-6 py-2 rounded font-bold hover:bg-yellow-500 transition-colors uppercase text-sm">
          Send
        </button>
      </form>

    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import { io } from 'socket.io-client';
import ClientCard from './components/ClientCard.vue';

const socket = io('http://localhost:3000');
const broadcastInput = ref('');

interface ClientData {
  id: number;
  status: string;
  log: { sender: 'you' | 'stranger' | 'sys', text: string }[];
}

const clients = reactive<Record<number, ClientData>>({
  1: { id: 1, status: 'disconnected', log: [] },
  2: { id: 2, status: 'disconnected', log: [] }
});

onMounted(() => {
  socket.on('connect', () => {
    console.log('Connected to backend');
    socket.emit('spawn', 1);
    socket.emit('spawn', 2);
  });

  socket.on('status', ({ id, status }) => {
    if (clients[id]) clients[id].status = status;
  });

  socket.on('message', ({ id, sender, text }) => {
    if (clients[id]) clients[id].log.push({ sender, text });
  });
});

const connectClient = (id: number) => {
  socket.emit('action', { clientId: id, action: 'connect' });
};

const disconnectClient = (id: number) => {
  socket.emit('action', { clientId: id, action: 'disconnect' });
};

const sendMessage = ({ clientId, text }: { clientId: number, text: string }) => {
  socket.emit('message', { clientId, text });
};

const updateSettings = ({ clientId, gender, offset }: any) => {
  socket.emit('settings', { clientId, gender, offset });
};

const openBrowser = (id: number) => {
  socket.emit('action', { clientId: id, action: 'open-browser' });
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
