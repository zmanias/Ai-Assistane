const AiService = require('../services/AiService');
const Chat = require('../models/Chat');
const Setting = require('../models/Setting');
const fs = require('fs');

// --- HANDLER UTAMA CHAT ---
exports.handleChat = async (req, res) => {
    const { message, persona, session_id } = req.body;
    const file = req.file;
    const lowerMsg = message ? message.toLowerCase() : "";

    try {
        // 1. Simpan Pesan User ke Database
        let userText = message;
        if(file) userText += " [Gambar]";
        
        await Chat.create({ 
            sessionId: session_id, 
            role: 'user', 
            content: userText 
        });

        let reply = "";

        // --- SKENARIO 1: GAMBAR (UPLOAD) ---
        if (file) {
            const isEdit = ['edit', 'ubah', 'ganti', 'warnai'].some(k => lowerMsg.includes(k));
            if (isEdit) {
                // Edit Gambar
                reply = `✨ Edit:\n![Res](${await AiService.editImage(file.path, message)})`;
            } else {
                // Vision (Lihat Gambar)
                const desc = await AiService.vision(file.path);
                const ctx = `User kirim gambar: "${desc}". User tanya: "${message}". Jawab user.`;
                reply = await AiService.chat(ctx);
            }
            // Hapus file setelah diproses agar hemat storage
            if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
        } 
        
        // --- SKENARIO 2: GENERATE GAMBAR (TEXT) ---
        else if ((lowerMsg.includes('buat') || lowerMsg.includes('bikin')) && (lowerMsg.includes('gambar') || lowerMsg.includes('foto'))) {
             const cleanPrompt = message.replace(/buatkan|gambar|saya|tolong/gi, '').trim();
             const imgUrl = await AiService.generateImage(cleanPrompt);
             reply = `🎨 Gambar:\n![Gen](${imgUrl})`;
        } 
        
        // --- SKENARIO 3: CHAT BIASA / SEARCH ---
        else {
             // A. JIKA PILIH FELO (INTERNET SEARCH)
             if (persona === 'felo') {
                 reply = await AiService.feloChat(message);
             } 
             
             // B. JIKA JARVIS / SARKAS (CHAT BIASA)
             else {
                 // 1. AMBIL SYSTEM PROMPT DARI DATABASE
                 // Menggunakan .value sesuai perbaikan database terakhir
                 const setting = await Setting.findOne({ where: { key: 'system_prompt' } });
                 const systemPrompt = setting ? setting.value : "Kamu adalah Jarvis, asisten AI yang cerdas.";

                 // 2. AMBIL HISTORY CHAT (Konteks Memori)
                 const history = await Chat.findAll({ 
                     where: { sessionId: session_id }, 
                     order: [['createdAt', 'DESC']], // Ambil dari yang terbaru
                     limit: 6 // Batasi 6 percakapan terakhir agar tidak kepanjangan
                 });
                 
                 // 3. SUSUN PERCAKAPAN
                 let fullConv = `System: ${systemPrompt}\n\n`;
                 
                 // Balik urutan history (Lama -> Baru)
                 history.reverse().forEach(h => {
                     // Filter pesan gambar agar tidak merusak prompt teks
                     if (!h.content.includes("![")) {
                        const roleName = h.role === 'user' ? 'User' : 'Assistant';
                        fullConv += `${roleName}: ${h.content}\n`;
                     }
                 });
                 
                 // Tambahkan chat terakhir
                 fullConv += `User: ${message}\nAssistant:`; 

                 // 4. KIRIM KE AI
                 reply = await AiService.chat(fullConv);
             }
        }

        // Cek jika reply kosong (fallback error)
        if (!reply) reply = "Maaf, saya sedang berpikir keras tapi tidak menemukan jawaban.";

        // 2. Simpan Balasan AI ke Database
        await Chat.create({ 
            sessionId: session_id, 
            role: 'assistant', 
            content: reply 
        });
        
        res.json({ status: 'success', result: { reply } });

    } catch (e) {
        console.error("Controller Error:", e);
        res.status(500).json({ status: 'error', message: "Maaf, ada kesalahan pada server." });
        if (file && fs.existsSync(file.path)) fs.unlinkSync(file.path);
    }
};

// --- HANDLER LOAD HISTORY (Untuk Memuat Chat Lama saat Link Dibuka) ---
exports.loadHistory = async (req, res) => {
    const { session_id } = req.query;
    try {
        const history = await Chat.findAll({ 
            where: { sessionId: session_id },
            order: [['createdAt', 'ASC']] // Urutan lama ke baru (A-Z) untuk ditampilkan di UI
        });
        res.json({ status: 'success', data: history });
    } catch (e) {
        res.json({ status: 'error', message: e.message });
    }
};
