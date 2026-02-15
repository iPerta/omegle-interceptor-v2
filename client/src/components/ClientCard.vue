<template>
  <div class="flex flex-col h-full bg-oled-card border border-gray-800 rounded-xl overflow-hidden shadow-2xl relative">
    <!-- Header -->
    <div class="p-4 bg-gradient-to-r from-gray-900 to-black border-b border-gray-800 flex justify-between items-center">
      <h2 class="text-xl font-bold text-white tracking-wider">Stranger {{ id }}</h2>
      <div class="px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-widest border"
           :class="statusColorClass">
        {{ status }}
      </div>
    </div>

    <!-- Chat Area -->
    <div ref="chatContainer" class="flex-1 overflow-y-auto p-4 space-y-3 bg-black scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-black">
      <div v-if="logs.length === 0" class="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span>No messages yet</span>
      </div>

      <div v-for="(msg, index) in logs" :key="index" 
           class="flex flex-col max-w-[85%]"
           :class="msg.sender === 'you' ? 'self-end items-end' : 'self-start items-start'">
        
        <span class="text-[0.65rem] uppercase font-bold mb-0.5 tracking-wider px-1"
              :class="msg.sender === 'you' ? 'text-blue-400' : (msg.sender === 'stranger' ? 'text-orange-400' : 'text-gray-500')">
          {{ msg.sender }}
        </span>

        <div class="px-3 py-2 rounded-lg text-sm leading-relaxed"
             :class="getMessageClass(msg.sender)">
          {{ msg.text }}
        </div>
      </div>
    </div>

    <!-- Controls & Input -->
    <div class="p-4 bg-oled-card border-t border-gray-800 space-y-4">
      
      <!-- Quick Settings -->
      <div class="grid grid-cols-2 gap-3">
         <!-- Gender Switch -->
         <button @click="emitSettings" 
                 class="flex items-center justify-center gap-2 py-2 px-3 rounded bg-gray-900 border border-gray-700 hover:border-gray-500 transition-colors text-xs font-mono text-gray-400">
           <span class="w-2 h-2 rounded-full" :class="genderInversion ? 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.6)]' : 'bg-gray-600'"></span>
           GENDER SWAP: {{ genderInversion ? 'ON' : 'OFF' }}
         </button>

         <!-- Number Offset -->
         <div class="flex items-center bg-gray-900 border border-gray-700 rounded px-2">
            <span class="text-xs text-gray-500 font-mono mr-2">OFFSET:</span>
            <input type="number" v-model.number="numberOffset" @change="emitSettings"
                   class="bg-transparent border-none text-white text-xs font-mono w-full focus:ring-0 p-1 text-center"/>
         </div>
      </div>
      
      <!-- Cookie Manager -->
      <button @click="$emit('open-browser', id)" 
              class="w-full py-2 bg-purple-900/20 text-purple-400 border border-purple-900/50 hover:bg-purple-900/40 hover:border-purple-500/50 transition-all font-bold uppercase tracking-wider text-xs rounded">
        🍪 GET COOKIES (Solve Captcha)
      </button>

      <!-- Action Buttons -->
      <div class="grid grid-cols-2 gap-3 h-10">
        <button @click="$emit('connect', id)" 
                :disabled="status !== 'disconnected'"
                class="bg-green-900/20 text-green-400 border border-green-900/50 hover:bg-green-900/40 hover:border-green-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold uppercase tracking-wider text-xs">
          Connect
        </button>
        <button @click="$emit('disconnect', id)"
                :disabled="status === 'disconnected'"
                class="bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 hover:border-red-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold uppercase tracking-wider text-xs">
          Disconnect
        </button>
      </div>

      <!-- Message Input -->
      <form @submit.prevent="sendMessage" class="flex gap-2">
        <input v-model="messageInput" 
               type="text" 
               placeholder="Type a message..."
               class="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none transition-colors text-white placeholder-gray-600"
               :disabled="status !== 'connected' && status !== 'waiting' && status !== 'connecting'"/>
        <button type="submit" 
                :disabled="!messageInput.trim() || status !== 'connected'"
                class="bg-blue-600 text-white px-4 rounded-lg font-bold hover:bg-blue-500 disabled:opacity-50 disabled:grayscale transition-all">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, nextTick } from 'vue';

const props = defineProps<{
  id: number;
  status: string;
  logs: { sender: string, text: string }[];
}>();

const emit = defineEmits(['connect', 'disconnect', 'message', 'update-settings', 'open-browser']);

const messageInput = ref('');
const genderInversion = ref(false);
const numberOffset = ref(0);
const chatContainer = ref<HTMLElement | null>(null);

const statusColorClass = computed(() => {
  switch (props.status) {
    case 'connected': return 'bg-green-500/10 text-green-500 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.2)]';
    case 'connecting':
    case 'waiting': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse';
    case 'disconnected': return 'bg-red-500/10 text-red-500 border-red-500/20';
    default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
  }
});

const getMessageClass = (sender: string) => {
  switch (sender) {
    case 'you': return 'bg-blue-600/20 border border-blue-600/30 text-blue-100';
    case 'stranger': return 'bg-gray-800 border border-gray-700 text-gray-100';
    case 'sys': return 'bg-transparent text-gray-500 italic border-l-2 border-gray-700 rounded-none pl-2 py-0';
    default: return 'bg-gray-800';
  }
};

const sendMessage = () => {
  if (!messageInput.value.trim()) return;
  emit('message', { clientId: props.id, text: messageInput.value });
  messageInput.value = '';
};

const emitSettings = () => {
  if (props.id === 0) return; // Should not happen
  genderInversion.value = !genderInversion.value; // Toggle logical fix if button clicked
  emit('update-settings', { clientId: props.id, gender: genderInversion.value, offset: numberOffset.value });
};

// Auto scroll
watch(() => props.logs.length, () => {
  nextTick(() => {
    if (chatContainer.value) {
      chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
  });
});
</script>
