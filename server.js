const express = require('express');
const { MongoClient } = require('mongodb');
const { Server } = require('socket.io'); 
const http = require('http'); 
const path = require('path'); 
const nodemailer = require('nodemailer');

// --- KONFIGURASI KUNCI DAN KONEKSI ---
const connectionString = "mongodb+srv://idaar_appbug:haidar23@cluster0.skwx7xv.mongodb.net/?retryWrites=true&w=majority";

// --- KONFIGURASI PENGIRIM EMAIL (NODEMAILER) ---
// Ganti dengan email dan App Password 16 digit Anda
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'smartvhaidar117@gmail.com', // Ganti Email Anda
        pass: 'cimf kuzt mtys pvcs'  // Ganti Password App 16 Digit
    }
});

const app = express();
const port = 3005;

app.set('trust proxy', true); 

const server = http.createServer(app); 
const io = new Server(server); 

const client = new MongoClient(connectionString);
let db;
let onlineUserCount = 0;

// --- FUNGSI UTAMA (KONEKSI DATABASE & SETUP) ---
async function main() {
    try {
        await client.connect();
        console.log("Sukses terhubung ke Database MongoDB!");

        db = client.db("appbugDB"); 
        const usersCollection = db.collection("lemari");

        // --- PEMBARUAN PENTING DI SINI ---
        // Kita tambahkan 'role' dan 'expiredDate' ke data admin
        const expiredDate = new Date("2025-11-03T23:28:00Z"); // Set tanggal kadaluarsa

        await usersCollection.updateOne(
          { username: "admin" }, 
          { 
              $set: { 
                  username: "admin", 
                  password: "123",
                  role: "OWNER", // <-- DATA BARU
                  expiredDate: expiredDate // <-- DATA BARU
              } 
          }, 
          { upsert: true } 
        );
        console.log("Data 'admin' (termasuk Role & Expired) telah dipastikan ada di database.");
        // --- AKHIR PEMBARUAN ---
        
        server.listen(port, () => { 
            console.log(`Server berjalan di http://localhost:${port}`);
        });

    } catch (e) {
        console.error("Gagal terhubung ke database:", e);
    }
}

main();

// --- MIDDLEWARE & PENGATURAN UMUM ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

// --- LOGIKA LIVE CHAT & PELACAK USER (SOCKET.IO) ---
// (Kode Socket.io Anda tetap sama...)
io.on('connection', (socket) => {
    onlineUserCount++;
    io.emit('user count update', onlineUserCount);
    console.log(`Seorang user terhubung. Total online: ${onlineUserCount}`);
    socket.on('chat message', async (msg) => {
        try {
            const chatCollection = db.collection('livechat_history');
            const chatData = { username: msg.username, message: msg.message, timestamp: new Date() };
            await chatCollection.insertOne(chatData);
            io.emit('chat message', chatData); 
        } catch (error) { console.error('Gagal memproses pesan chat:', error); }
    });
    socket.on('disconnect', () => {
        onlineUserCount--;
        if (onlineUserCount < 0) onlineUserCount = 0;
        io.emit('user count update', onlineUserCount);
        console.log(`Seorang user terputus. Total online: ${onlineUserCount}`);
    });
});

// --- ENDPOINT RIWAYAT CHAT ---
app.get('/chat-history', async (req, res) => {
    try {
        const chatCollection = db.collection('livechat_history');
        const history = await chatCollection.find({}).sort({ timestamp: -1 }).limit(50).toArray();
        res.json(history.reverse()); 
    } catch (error) { res.status(500).json({ error: 'Gagal memuat riwayat chat.' }); }
});

// --- ENDPOINT CEK IP ---
app.get('/get-my-ip', (req, res) => {
    const ip = req.ip; 
    res.json({ ipAddress: ip });
});

// --- ENDPOINT "SEND BUG" ---
app.post('/send-bug', (req, res) => {
    const targetNumber = req.body['target-number'];
    const selectedBug = req.body['select-bug'];
    const mailOptions = {
        from: 'smartvhaidar117@gmail.com', // Ganti Email Anda
        to: 'smartvhaidar117@gmail.com',   // Ganti Email Anda
        subject: `[BUG REPORT] - Target: ${targetNumber}`,
        text: `Bug report baru:\nTarget Number: ${targetNumber}\nTipe Bug: ${selectedBug}`
    };
    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Gagal mengirim email:', error);
            res.status(500).json({ success: false, message: 'Gagal mengirim email notifikasi.' });
        } else {
            res.json({ success: true, message: 'Bug report berhasil dikirim!' });
        }
    });
});

// --- ENDPOINT BARU UNTUK MENGAMBIL DATA USER ---
app.get('/get-user-data', async (req, res) => {
    const username = req.query.username; // Mengambil username dari URL

    if (!username) {
        return res.status(400).json({ error: 'Username diperlukan' });
    }

    try {
        const user = await db.collection("lemari").findOne({ username: username });
        if (user) {
            // KIRIM DATA YANG AMAN (JANGAN KIRIM PASSWORD)
            res.json({
                username: user.username,
                role: user.role,
                expiredDate: user.expiredDate,
                // tambahkan field lain jika ada
            });
        } else {
            res.status(404).json({ error: 'User tidak ditemukan' });
        }
    } catch (e) {
        console.error("Error mengambil data user:", e);
        res.status(500).json({ error: 'Error server' });
    }
});
// --- AKHIR ENDPOINT BARU ---

// --- ENDPOINT UNTUK LOGIN ---
app.post('/login', async (req, res) => {
    // (Kode login Anda tetap sama, sudah mengecek expiredDate)
    const username = req.body.username;
    const password = req.body.password;
    try {
        const collection = db.collection("lemari");
        const user = await collection.findOne({ username: username });
        if (user && user.password === password) {
            const today = new Date();
            const expiredDate = user.expiredDate; 
            if (expiredDate && expiredDate > today) {
                res.redirect('/dashboard.html');
            } else {
                res.send('LOGIN GAGAL! Akses Anda sudah kadaluarsa.');
            }
        } else {
            res.send('LOGIN GAGAL! Username atau password salah.');
        }
    } catch (e) { res.send("Terjadi error pada server."); }
});