const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');
const FormData = require('form-data');
require('dotenv').config();

const AiService = {
    // 1. CHAT (Hybrid: NowChat Utama -> Fallback GPT-3.5)
    async chat(question) {
        // Coba NowChat Dulu
        try {
            const t = Date.now().toString();
            const s = 'dfaugf098ad0g98-idfaugf098ad0g98-iduoafiunoa-f09a8s098a09ea-a0s8g-asd8g0a9d--gasdga8d0g8a0dg80a9sd8g0a9d8gduoafiunoa-f09adfaugf098ad0g98-iduoafiunoa-f09a8s098a09ea-a0s8g-asd8g0a9d--gasdga8d0g8a0dg80a9sd8g0a9d8g8s098a09ea-a0s8g-asd8g0a9d--gasdga8d0g8a0dg80a9sd8g0a9d8g';
            const k = crypto.createHmac('sha512', s).update(t).digest('base64');
            
            const res = await axios.post('http://aichat.nowtechai.com/now/v1/ai', 
                { content: question }, 
                { 
                    headers: { 'User-Agent': 'Ktor client', 'Content-Type': 'application/json', 'Key': k, 'TimeStamps': t },
                    responseType: 'stream'
                }
            );
            
            return new Promise((resolve, reject) => {
                let result = '';
                res.data.on('data', chunk => {
                    const lines = chunk.toString().split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                            try {
                                const json = JSON.parse(line.replace('data: ', ''));
                                const c = json?.choices?.[0]?.delta?.content || json?.response; 
                                if (c) result += c;
                            } catch {}
                        }
                    }
                });
                res.data.on('end', () => resolve(result.trim() || "Maaf, tidak ada respon."));
                res.data.on('error', err => reject(err));
            });
        } catch (e) {
            console.log("⚠️ NowChat Error (403/500). Mengalihkan ke Backup Brain (GPT)...");
            // FALLBACK KE GPT-3.5 (Supaya web tidak error jika NowChat down)
            try {
                const gptRes = await axios.post("https://mpzxsmlptc4kfw5qw2h6nat6iu0hvxiw.lambda-url.us-east-2.on.aws/process", {
                    model: "gpt-3.5-turbo",
                    messages: [{ role: "user", content: question }]
                }, { headers: { 'Content-Type': 'application/json', 'User-Agent': 'Postify/1.0.0' } });
                return gptRes.data.choices[0].message.content;
            } catch (err2) {
                return "Maaf, semua sistem AI sedang sibuk. Coba lagi nanti.";
            }
        }
    },

    // 2. GENERATE IMAGE (NowArt - Parsing Fix)
        // 2. GENERATE IMAGE (SUPER ROBUST VERSION)
    async generateImage(prompt) {
        try {
            console.log(`🎨 Membuat gambar: ${prompt}`);
            const res = await axios.get('http://art.nowtechai.com/art?name=' + encodeURIComponent(prompt), {
                headers: { 'User-Agent': 'okhttp/5.0.0-alpha.9' }
            });
            
            // LOGIKA DETEKSI URL YANG LEBIH CERDAS
            const data = res.data;

            // Kasus 1: Array di dalam data (Sesuai log kamu sebelumnya)
            // { data: [ { img_url: "..." } ] }
            if (data?.data && Array.isArray(data.data) && data.data.length > 0 && data.data[0].img_url) {
                return data.data[0].img_url;
            }

            // Kasus 2: Langsung property img_url
            // { img_url: "..." }
            if (data?.img_url) return data.img_url;

            // Kasus 3: Langsung property url
            // { url: "..." }
            if (data?.url) return data.url;

            // Kasus 4: Respon adalah string URL langsung
            if (typeof data === 'string' && data.startsWith('http')) return data;

            // Jika sampai sini, berarti formatnya aneh. Kita coba stringify untuk debug.
            console.log("⚠️ Format Gambar Aneh:", JSON.stringify(data));
            
            // Kembalikan placeholder error agar user tau
            return "https://placehold.co/600x400?text=Gagal+Parsing+JSON";

        } catch (e) {
            console.error("Error Gambar:", e.message);
            return "https://placehold.co/600x400?text=Error+Server+Gambar";
        }
    },

    // 3. EDIT IMAGE (Colorify)
    async editImage(imagePath, prompt) {
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(imagePath));
            form.append('fn_name', 'demo-auto-coloring');
            form.append('request_from', '10');
            form.append('origin_from', '6d3782f244d64cf8');
            
            const up = await axios.post('https://api.colorifyai.art/aitools/upload-img', form, { headers: { ...form.getHeaders(), 'User-Agent': 'Mozilla/5.0' } });
            
            const task = await axios.post('https://api.colorifyai.art/aitools/of/create', {
                fn_name: "demo-auto-coloring", call_type: 3,
                input: { source_image: up.data.data.path, prompt, request_from: 10, lora: ["ghibli_style_offset:0.8"] },
                request_from: 10, origin_from: "6d3782f244d64cf8"
            }, { headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' } });

            const taskId = task.data.data.task_id;
            let attempts = 0;
            while(attempts < 20) {
                await new Promise(r => setTimeout(r, 2000));
                const check = await axios.post('https://api.colorifyai.art/aitools/of/check-status', { task_id: taskId, fn_name: "demo-auto-coloring", call_type: 3, request_from: 10, origin_from: "6d3782f244d64cf8" }, { headers: { 'Content-Type': 'application/json', 'User-Agent': 'Mozilla/5.0' } });
                if (check.data.data.status === 2) return `https://temp.colorifyai.art/${check.data.data.result_image}`;
                attempts++;
            }
            throw new Error("Timeout");
        } catch (e) { throw new Error("Gagal mengedit gambar."); }
    },

    // 4. VISION (ImagePromptGuru)
    async vision(imagePath) {
        try {
            const b64 = 'data:image/jpeg;base64,' + fs.readFileSync(imagePath).toString('base64');
            const res = await axios.post('https://api.imagepromptguru.net/image-to-prompt', 
                { model: 'general', language: 'en', image: b64 }, 
                { headers: { 'content-type': 'application/json', 'origin': 'https://imagepromptguru.net' } }
            );
            return res.data.result || "Gambar.";
        } catch (e) { return "Gagal melihat gambar."; }
    },

    // 5. FELO AI (SEARCH ENGINE) - BARU!
    async feloChat(query) {
        try {
            console.log(`🔍 Felo Searching: "${query}"`);
            const res = await axios.get(`https://api.fandirr.my.id/ai/felo?query=${encodeURIComponent(query)}`);
            
            // Cek status respon API Fandirr
            if (res.data && res.data.status) {
                return res.data.result;
            } else {
                return "Maaf, Felo tidak menemukan informasi yang relevan atau server sedang sibuk.";
            }
        } catch (e) {
            console.error("Felo Error:", e.message);
            return "Maaf, terjadi kesalahan pada koneksi Felo AI.";
        }
    }
};

module.exports = AiService;
