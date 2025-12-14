import { ApiService } from './api.js';
import { UI } from './ui.js';

// --- 1. LOGIKA SESI & URL UNIK ---
function initSession() {
    const path = window.location.pathname;
    const match = path.match(/^\/c\/([a-zA-Z0-9_-]+)$/);

    if (match) {
        return match[1];
    } else {
        const newId = 'chat_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        window.history.replaceState(null, '', `/c/${newId}`);
        return newId;
    }
}

const sessionId = initSession();
console.log("🔹 Active Session ID:", sessionId);

// --- 2. CEK LOGIN ---
const userSession = JSON.parse(localStorage.getItem('user_session') || 'null');
if (!userSession) {
    window.location.href = '/login.html';
}

// --- VARIABLE PENGENDALI ---
let conversationHistory = [];
let isGenerating = false;
let abortController = null;

// --- EVENT LISTENERS ---
const sendBtn = document.getElementById('sendBtn');
const userInput = document.getElementById('userInput');
const fileInput = document.getElementById('fileInput');

if(sendBtn) sendBtn.addEventListener('click', handleBtnClick);
if(userInput) userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { 
        e.preventDefault(); 
        handleBtnClick(); 
    }
});
if(fileInput) fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) UI.showFilePreview(e.target.files[0]);
});

window.toggleTheme = UI.toggleTheme; 
window.clearFile = () => UI.clearFile();

// --- 3. MUAT RIWAYAT CHAT (ROBUST VERSION) ---
//
// --- 3. MUAT RIWAYAT CHAT (DIPERBAIKI) ---
async function loadHistory() {
    try {
        console.log("⏳ Memuat history...");
        const res = await fetch(`/api/chat/history?session_id=${sessionId}`);
        const data = await res.json();
        
        if (data.status === 'success' && data.data.length > 0) {
            console.log(`✅ Ditemukan ${data.data.length} pesan.`);
            UI.elements.welcomeScreen.classList.add('d-none');
            
            data.data.forEach((chat, index) => {
                // Masukkan ke history lokal untuk konteks percakapan berikutnya
                conversationHistory.push({ role: chat.role, content: chat.content });

                const safeContent = chat.content || "";

                if (chat.role === 'assistant') {
                    // 1. Parse Markdown DULU menjadi HTML
                    let aiHtml = safeContent;
                    if (typeof marked !== 'undefined' && marked.parse) {
                        aiHtml = marked.parse(safeContent);
                    }

                    // 2. Tampilkan pesan dengan konten yang sudah jadi
                    UI.addMessage(aiHtml, 'ai');

                    // 3. Tambahkan fitur Copy & Highlight (Ambil elemen terakhir yang baru dibuat)
                    const messagesBox = document.getElementById('messagesBox');
                    const lastMsg = messagesBox.lastElementChild;
                    
                    if (lastMsg) {
                        const bubble = lastMsg.querySelector('.bubble');
                        if (bubble) {
                            UI.addCopyButtons(bubble);
                            // Highlight code blocks
                            if (typeof hljs !== 'undefined') {
                                bubble.querySelectorAll('pre code').forEach(block => {
                                    hljs.highlightElement(block);
                                });
                            }
                            // Rapikan tabel jika ada
                            bubble.querySelectorAll('table').forEach(t => t.classList.add('table', 'table-bordered', 'table-sm'));
                        }
                    }

                } else {
                    // Render User Message
                    UI.addMessage(safeContent.replace(/\n/g, '<br>'), 'user');
                }
            });
            
            UI.scrollToBottom();
        } else {
            console.log("ℹ️ History kosong atau sesi baru.");
        }
    } catch (e) { 
        console.error("❌ Gagal memuat history:", e); 
    }
}


// Jalankan load
loadHistory();


// --- 4. FUNGSI UTAMA ---
function handleBtnClick() {
    if (isGenerating) stopGeneration(); 
    else sendMessage();
}

function stopGeneration() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
    UI.stopTyping();
    isGenerating = false;
    UI.setBtnState('idle');
    UI.elements.inputField.disabled = false;
    UI.elements.inputField.focus();
    
    const loadingBubble = document.querySelector('[id^="loading-"]');
    if (loadingBubble) loadingBubble.remove();
}

async function sendMessage() {
    const text = UI.elements.inputField.value.trim();
    const file = UI.elements.fileInput.files[0];
    const persona = document.getElementById('personaSelect').value;

    if (!text && !file) return;

    UI.elements.welcomeScreen.classList.add('d-none');

    // Tampilkan User Chat
    let userHtml = text.replace(/\n/g, '<br>');
    if (file) userHtml += `<br><small class="text-secondary"><i>[File: ${file.name}]</i></small>`;
    UI.addMessage(userHtml, 'user');

    conversationHistory.push({ role: "user", content: text || "[Gambar]" });

    // Reset UI
    UI.elements.inputField.value = '';
    UI.elements.inputField.style.height = 'auto';
    UI.clearFile();
    
    isGenerating = true;
    UI.setBtnState('loading');
    UI.elements.inputField.disabled = true;
    
    abortController = new AbortController();
    const loadingId = UI.addMessage("...", 'ai', true);

    // Kirim Data
    const formData = new FormData();
    formData.append('message', text);
    formData.append('persona', persona);
    formData.append('session_id', sessionId); 
    formData.append('history', JSON.stringify(conversationHistory));
    if (file) formData.append('image', file);

    const response = await ApiService.sendChat(formData, abortController.signal);
    
    if (response.status === 'aborted') {
        document.getElementById(loadingId)?.remove();
        return;
    }

    document.getElementById(loadingId)?.remove();

    if (response.status === 'success') {
        const reply = response.result.reply || "Maaf, respon kosong.";
        await UI.typeWriterEffect(reply);
        conversationHistory.push({ role: "assistant", content: reply });
    } else {
        UI.addMessage("⚠️ " + response.message, 'ai');
    }

    isGenerating = false;
    UI.setBtnState('idle');
    UI.elements.inputField.disabled = false;
    UI.elements.inputField.focus();
    UI.scrollToBottom();
}
