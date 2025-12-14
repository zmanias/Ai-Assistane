const User = require('../models/User');
const Chat = require('../models/Chat');
const Setting = require('../models/Setting');

async function isAdmin(username) {
    const user = await User.findOne({ where: { username } });
    return user && user.role === 'admin';
}

exports.getStats = async (req, res) => {
    const { username } = req.query;
    if (!await isAdmin(username)) return res.status(403).json({ status: 'error', message: 'Akses Ditolak' });

    try {
        const totalUsers = await User.count();
        const totalChats = await Chat.count();
        const setting = await Setting.findOne({ where: { key: 'system_prompt' } });
        
        res.json({
            status: 'success',
            data: { 
                totalUsers, 
                totalChats, 
                currentPrompt: setting ? setting.value : "Kamu adalah Jarvis." 
            }
        });
    } catch (e) { res.status(500).json({ status: 'error', message: e.message }); }
};

exports.updatePrompt = async (req, res) => {
    const { username, prompt } = req.body; // Frontend kirim 'prompt'
    if (!await isAdmin(username)) return res.status(403).json({ status: 'error', message: 'Akses Ditolak' });

    try {
        // Kita simpan 'prompt' ke dalam kolom 'value'
        await Setting.upsert({ 
            key: 'system_prompt', 
            value: prompt 
        });
        res.json({ status: 'success', message: 'Otak AI berhasil diperbarui!' });
    } catch (e) { 
        console.error(e);
        res.status(500).json({ status: 'error', message: e.message }); 
    }
};
