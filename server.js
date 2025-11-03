// ====================================================================
// --- PERBAIKAN UNTUK VERCEL ---
// Kita butuh paket ini agar Express bisa berjalan sebagai serverless function.
const serverless = require('serverless-http'); 
// ====================================================================

const express = require('express');
const { MongoClient } = require('mongodb');
const path = require('path'); 
const nodemailer = require('nodemailer');

// --- KONFIGURASI KUNCI DAN KONEKSI ---
// AMBIL DARI VARIABLE LINGKUNGAN VERCEL! (Bukan hardcode)
const connectionString = process.env.MONGODB_URI; 

// --- KONFIGURASI PENGIRIM EMAIL (NODEMAILER) ---
// (Ini tetap dipertahankan, asumsikan ini akan bekerja di Vercel)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'smartvhaidar117@gmail.com',
        pass: 'cimf kuzt mtys pvcs'  
    }
});

const app = express();

const client = new MongoClient(connectionString);
let db;

// --- FUNGSI UTAMA (KONEKSI DATABASE & SETUP) ---
async function connectToDatabase() {
    try {
        await client.connect();
        console.log("Sukses terhubung ke Database MongoDB!");
        db = client.db("appbugDB"); 
        const usersCollection = db.collection("lemari");

        // Perbarui data admin (ini akan dijalankan setiap kali ada request)
        const expiredDate = new Date("2025-11-03T23:28:00Z"); 
        await usersCollection.updateOne(
          { username: "admin" }, 
          { 
              $set: { 
                  username: "admin", 
                  password: "123",
                  role: "OWNER",
                  expiredDate: expiredDate
              } 
          }, 
          { upsert: true } 
        );
        console.log("Data 'admin' telah dipastikan ada di database.");

    } catch (e) {
        console.error("Gagal terhubung ke database:", e);
        // Penting: Jika gagal, lempar error agar Vercel tahu ada masalah
        throw new Error("Koneksi database gagal.");
    }
}

// Panggil fungsi koneksi di awal agar database siap
connectToDatabase(); 

// --- MIDDLEWARE & PENGATURAN UMUM ---
// Middleware untuk memastikan koneksi database sudah siap
app.use(async (req, res, next) => {
    if (!db) {
        // Jika belum terhubung (misal saat cold start), coba hubungkan
        await connectToDatabase();
    }
    next(); // Lanjutkan ke endpoint (API) berikutnya
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Vercel hanya melayani file statis dari folder 'public' atau 'root'
app.use(express.static(path.join(__dirname, ''))); // Gunakan direktori root Anda untuk file statis

// --- PENTING: HAPUS LOGIKA LIVE CHAT (SOCKET.IO) ---
// Socket.io tidak didukung oleh Vercel. Logika chat harus diubah total.

// --- ENDPOINT RIWAYAT CHAT (Tanpa Socket.io) ---
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
    // ... (Logika nodemailer Anda di sini) ...
});

// --- ENDPOINT BARU UNTUK MENGAMBIL DATA USER ---
app.get('/get-user-data', async (req, res) => {
    // ... (Logika mengambil user data Anda di sini) ...
});

// --- ENDPOINT UNTUK LOGIN ---
app.post('/login', async (req, res) => {
    // ... (Logika login Anda di sini) ...
});

// ====================================================================
// --- EXPORT UNTUK VERCEL ---
// Ganti server.listen() dengan module.exports = handler untuk serverless
module.exports = serverless(app); 
// ====================================================================