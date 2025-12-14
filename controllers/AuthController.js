const User = require('../models/User');
const bcrypt = require('bcryptjs');

// --- REGISTER ---
exports.register = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Validasi Input
        if (!username || !password) {
            return res.status(400).json({ status: 'error', message: 'Username dan Password wajib diisi!' });
        }

        // 2. Cek apakah user sudah ada
        const existingUser = await User.findOne({ where: { username } });
        if (existingUser) {
            return res.status(400).json({ status: 'error', message: 'Username sudah terpakai.' });
        }

        // 3. Enkripsi Password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Tentukan Role (Admin jika username 'admin')
        const role = username.toLowerCase() === 'admin' ? 'admin' : 'user';

        // 5. Simpan ke Database
        await User.create({
            username,
            password: hashedPassword,
            role
        });

        res.json({ status: 'success', message: 'Registrasi berhasil! Silakan login.' });

    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
    }
};

// --- LOGIN ---
exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // 1. Cari User di Database
        const user = await User.findOne({ where: { username } });
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User tidak ditemukan.' });
        }

        // 2. Cek Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ status: 'error', message: 'Password salah.' });
        }

        // 3. Login Sukses (Kirim data user non-sensitif)
        res.json({
            status: 'success',
            data: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ status: 'error', message: 'Terjadi kesalahan server.' });
    }
};