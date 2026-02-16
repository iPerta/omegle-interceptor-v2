<template>
    <div class="flex flex-col h-full bg-oled-card border border-gray-800 rounded-xl overflow-hidden shadow-2xl">

        <!-- Header — Dual Status -->
        <div
            class="p-4 bg-gradient-to-r from-gray-900 to-black border-b border-gray-800 flex justify-between items-center">
            <!-- Stranger 1 Status -->
            <div class="flex items-center gap-2">
                <div class="w-2.5 h-2.5 rounded-full" :class="statusDot(client1Status)"></div>
                <span class="text-sm font-bold tracking-wider text-teal-400">Stranger 1</span>
                <span
                    class="px-2 py-0.5 rounded-full text-[0.6rem] font-mono font-bold uppercase tracking-widest border"
                    :class="statusBadge(client1Status)">
                    {{ client1Status }}
                </span>
            </div>

            <!-- Stranger 2 Status -->
            <div class="flex items-center gap-2">
                <span
                    class="px-2 py-0.5 rounded-full text-[0.6rem] font-mono font-bold uppercase tracking-widest border"
                    :class="statusBadge(client2Status)">
                    {{ client2Status }}
                </span>
                <span class="text-sm font-bold tracking-wider text-purple-400">Stranger 2</span>
                <div class="w-2.5 h-2.5 rounded-full" :class="statusDot(client2Status)"></div>
            </div>
        </div>

        <!-- Merged Chat Area -->
        <div ref="chatContainer"
            class="flex-1 overflow-y-auto p-4 space-y-2 bg-black scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-black">

            <div v-if="mergedLog.length === 0"
                class="h-full flex flex-col items-center justify-center text-gray-600 space-y-2 opacity-50">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <span>No messages yet</span>
            </div>

            <template v-for="(msg, index) in mergedLog" :key="index">

                <!-- Broadcast message — centered, yellow -->
                <div v-if="msg.type === 'broadcast'" class="flex justify-center">
                    <div
                        class="px-4 py-1.5 rounded-full text-xs font-semibold text-yellow-300 bg-yellow-500/10 border border-yellow-500/20 italic max-w-[80%] text-center">
                        📢 {{ msg.text }}
                    </div>
                </div>

                <!-- System message — centered, muted -->
                <div v-else-if="msg.sender === 'sys'" class="flex justify-center">
                    <div class="text-[0.7rem] text-gray-500 font-mono uppercase tracking-wider py-1">
                        <span :class="msg.clientId === 1 ? 'text-teal-700' : 'text-purple-700'">
                            [Stranger {{ msg.clientId }}]
                        </span>
                        {{ msg.text }}
                    </div>
                </div>

                <!-- Injected message (user manually typing as a stranger) — styled with dashed border -->
                <div v-else-if="msg.type === 'injected'" class="flex"
                    :class="msg.clientId === 1 ? 'justify-start' : 'justify-end'">
                    <div class="flex flex-col max-w-full" :class="msg.clientId === 1 ? 'items-start' : 'items-end'">
                        <span class="text-[0.6rem] uppercase font-bold mb-0.5 tracking-wider px-1"
                            :class="msg.clientId === 1 ? 'text-teal-400' : 'text-purple-400'">
                            You → Stranger {{ msg.clientId }}
                        </span>
                        <div class="px-3 py-2 rounded-lg text-sm leading-relaxed border border-dashed italic" :class="msg.clientId === 1
                            ? 'bg-teal-900/10 border-teal-700/40 text-teal-200/80 rounded-tl-none'
                            : 'bg-purple-900/10 border-purple-700/40 text-purple-200/80 rounded-tr-none'">
                            {{ msg.text }}
                        </div>
                    </div>
                </div>

                <!-- Stranger 1 messages — LEFT aligned -->
                <div v-else-if="msg.clientId === 1" class="flex flex-col max-w-[75%] self-start items-start">
                    <span class="text-[0.6rem] uppercase font-bold mb-0.5 tracking-wider px-1 text-teal-400">
                        Stranger 1
                    </span>
                    <div
                        class="px-3 py-2 rounded-lg text-sm leading-relaxed bg-teal-900/20 border border-teal-800/30 text-gray-200 rounded-tl-none">
                        {{ msg.text }}
                    </div>
                </div>

                <!-- Stranger 2 messages — RIGHT aligned -->
                <div v-else-if="msg.clientId === 2" class="flex flex-col max-w-[75%] self-end items-end">
                    <span class="text-[0.6rem] uppercase font-bold mb-0.5 tracking-wider px-1 text-purple-400">
                        Stranger 2
                    </span>
                    <div
                        class="px-3 py-2 rounded-lg text-sm leading-relaxed bg-purple-900/20 border border-purple-800/30 text-gray-200 rounded-tr-none">
                        {{ msg.text }}
                    </div>
                </div>
            </template>
        </div>

        <!-- Controls & Inputs -->
        <div class="border-t border-gray-800 bg-oled-card">

            <!-- Per-Stranger Settings Row -->
            <div class="grid grid-cols-2 gap-0 divide-x divide-gray-800">

                <!-- Stranger 1 Controls -->
                <div class="p-3 space-y-2">
                    <div
                        class="flex items-center gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-teal-400 mb-1">
                        <div class="w-1.5 h-1.5 rounded-full bg-teal-500"></div>
                        Stranger 1
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button @click="toggleGender(1)"
                            class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-gray-900 border border-gray-700 hover:border-gray-500 transition-colors text-[0.65rem] font-mono text-gray-400">
                            <span class="w-1.5 h-1.5 rounded-full"
                                :class="gender1 ? 'bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.6)]' : 'bg-gray-600'"></span>
                            GND: {{ gender1 ? 'ON' : 'OFF' }}
                        </button>
                        <div class="flex items-center bg-gray-900 border border-gray-700 rounded px-2">
                            <span class="text-[0.6rem] text-gray-500 font-mono mr-1">OFF:</span>
                            <input type="number" v-model.number="offset1" @change="emitSettings(1)"
                                class="bg-transparent border-none text-white text-[0.65rem] font-mono w-full focus:ring-0 p-0.5 text-center" />
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button @click="emit('client-connect', 1)" :disabled="client1Status !== 'disconnected'"
                            class="py-1.5 bg-green-900/20 text-green-400 border border-green-900/50 hover:bg-green-900/40 hover:border-green-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold uppercase tracking-wider text-[0.65rem] rounded">
                            Connect
                        </button>
                        <button @click="emit('client-disconnect', 1)" :disabled="client1Status === 'disconnected'"
                            class="py-1.5 bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 hover:border-red-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold uppercase tracking-wider text-[0.65rem] rounded">
                            Disconnect
                        </button>
                    </div>
                </div>

                <!-- Stranger 2 Controls -->
                <div class="p-3 space-y-2">
                    <div
                        class="flex items-center justify-end gap-2 text-[0.65rem] font-bold uppercase tracking-widest text-purple-400 mb-1">
                        Stranger 2
                        <div class="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button @click="toggleGender(2)"
                            class="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded bg-gray-900 border border-gray-700 hover:border-gray-500 transition-colors text-[0.65rem] font-mono text-gray-400">
                            <span class="w-1.5 h-1.5 rounded-full"
                                :class="gender2 ? 'bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.6)]' : 'bg-gray-600'"></span>
                            GND: {{ gender2 ? 'ON' : 'OFF' }}
                        </button>
                        <div class="flex items-center bg-gray-900 border border-gray-700 rounded px-2">
                            <span class="text-[0.6rem] text-gray-500 font-mono mr-1">OFF:</span>
                            <input type="number" v-model.number="offset2" @change="emitSettings(2)"
                                class="bg-transparent border-none text-white text-[0.65rem] font-mono w-full focus:ring-0 p-0.5 text-center" />
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-2">
                        <button @click="emit('client-connect', 2)" :disabled="client2Status !== 'disconnected'"
                            class="py-1.5 bg-green-900/20 text-green-400 border border-green-900/50 hover:bg-green-900/40 hover:border-green-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold uppercase tracking-wider text-[0.65rem] rounded">
                            Connect
                        </button>
                        <button @click="emit('client-disconnect', 2)" :disabled="client2Status === 'disconnected'"
                            class="py-1.5 bg-red-900/20 text-red-400 border border-red-900/50 hover:bg-red-900/40 hover:border-red-500/50 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold uppercase tracking-wider text-[0.65rem] rounded">
                            Disconnect
                        </button>
                    </div>
                </div>
            </div>

            <!-- Dual Message Inputs -->
            <div class="grid grid-cols-2 gap-0 divide-x divide-gray-800 border-t border-gray-800">
                <!-- Stranger 1 input -->
                <form @submit.prevent="sendMsg(1)" class="flex gap-2 p-3">
                    <input v-model="msg1" type="text" placeholder="Type as Stranger 1..."
                        class="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-teal-500 focus:outline-none transition-colors text-white placeholder-gray-600"
                        :disabled="client1Status !== 'connected'" />
                    <button type="submit" :disabled="!msg1.trim() || client1Status !== 'connected'"
                        class="bg-teal-600 text-white px-3 rounded-lg font-bold hover:bg-teal-500 disabled:opacity-40 disabled:grayscale transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </form>

                <!-- Stranger 2 input -->
                <form @submit.prevent="sendMsg(2)" class="flex gap-2 p-3">
                    <input v-model="msg2" type="text" placeholder="Type as Stranger 2..."
                        class="flex-1 bg-black border border-gray-700 rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:outline-none transition-colors text-white placeholder-gray-600"
                        :disabled="client2Status !== 'connected'" />
                    <button type="submit" :disabled="!msg2.trim() || client2Status !== 'connected'"
                        class="bg-purple-600 text-white px-3 rounded-lg font-bold hover:bg-purple-500 disabled:opacity-40 disabled:grayscale transition-all">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path
                                d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';

export interface MergedMessage {
    clientId: number;
    sender: 'you' | 'stranger' | 'sys';
    text: string;
    type?: 'broadcast' | 'injected';
}

const props = defineProps<{
    client1Status: string;
    client2Status: string;
    mergedLog: MergedMessage[];
}>();

const emit = defineEmits(['client-connect', 'client-disconnect', 'message', 'update-settings']);

const msg1 = ref('');
const msg2 = ref('');
const gender1 = ref(false);
const gender2 = ref(false);
const offset1 = ref(0);
const offset2 = ref(0);
const chatContainer = ref<HTMLElement | null>(null);

const statusDot = (status: string) => {
    switch (status) {
        case 'connected': return 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]';
        case 'connecting':
        case 'waiting': return 'bg-yellow-500 animate-pulse shadow-[0_0_8px_rgba(234,179,8,0.4)]';
        case 'disconnected': return 'bg-red-500/60';
        default: return 'bg-gray-600';
    }
};

const statusBadge = (status: string) => {
    switch (status) {
        case 'connected': return 'bg-green-500/10 text-green-500 border-green-500/20';
        case 'connecting':
        case 'waiting': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20 animate-pulse';
        case 'disconnected': return 'bg-red-500/10 text-red-500 border-red-500/20';
        default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
};

const sendMsg = (clientId: number) => {
    const input = clientId === 1 ? msg1 : msg2;
    if (!input.value.trim()) return;
    emit('message', { clientId, text: input.value });
    input.value = '';
};

const toggleGender = (clientId: number) => {
    if (clientId === 1) {
        gender1.value = !gender1.value;
        emit('update-settings', { clientId: 1, gender: gender1.value, offset: offset1.value });
    } else {
        gender2.value = !gender2.value;
        emit('update-settings', { clientId: 2, gender: gender2.value, offset: offset2.value });
    }
};

const emitSettings = (clientId: number) => {
    if (clientId === 1) {
        emit('update-settings', { clientId: 1, gender: gender1.value, offset: offset1.value });
    } else {
        emit('update-settings', { clientId: 2, gender: gender2.value, offset: offset2.value });
    }
};

// Auto scroll on new messages
watch(() => props.mergedLog.length, () => {
    nextTick(() => {
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
        }
    }); 
});
</script>
