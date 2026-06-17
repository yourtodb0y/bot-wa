const { 
    default: makeWASocket, 
    DisconnectReason, 
    useMultiFileAuthState,
    Browsers // <-- Ditambahkan untuk penyamaran browser resmi
} = require('@whiskeysockets/baileys');
const express = require('express');
const pino = require('pino');
const app = express();

// === MENGIMPOR FITUR BAWAAN KAMU ===
const { handleDeepAI } = require('./fitur/deepai');
const { handleDownloader } = require('./fitur/downloader');

// =================================================================
// 1. SETTING UTAMA (UBAH DI SINI, BRE!)
// =================================================================
const NOMOR_HP_BOT = "62882007306051"; // <-- Ganti dengan nomor WA ARDAN STORE kamu (wajib awalan 62)
const PORT = process.env.PORT || 3000;

let pairingCodeUrl = null; // Tempat menyimpan teks Pairing Code sementara

// =================================================================
// 2. WEB SERVER UNTUK AMBIL KODE & PING UPTIMEROBOT
// =================================================================
app.get('/', (req, res) => {
    if (pairingCodeUrl) {
        // Jika belum login, tampilkan Kode Pairing di halaman web browser
        res.send(`
            <html>
                <head>
                    <title>Pairing Code Bot ARDAN STORE</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; font-family:sans-serif; background-color: #f4f6f9; margin:0; padding:20px; text-align:center;">
                    <div style="background:white; padding:30px; border-radius:15px; box-shadow: 0 4px 15px rgba(0,0,0,0.1); max-width:400px; width:100%;">
                        <h2 style="color: #333; margin-bottom: 5px;">Bot ARDAN STORE</h2>
                        <p style="color: #666; font-size: 14px;">Silahkan masukkan kode pairing di bawah ini ke WhatsApp HP kamu</p>
                        <div style="background:#eef2f7; border: 2px dashed #007bff; padding: 15px; font-size: 28px; font-weight: bold; letter-spacing: 2px; color: #007bff; border-radius: 10px; margin: 20px 0; user-select: all;">
                            ${pairingCodeUrl}
                        </div>
                        <p style="color: #999; font-size: 12px;">Caranya: Masuk ke WA -> Perangkat Tertaut -> Tautkan Perangkat -> Tautkan dengan nomor telepon saja.</p>
                        <p style="color: #ff4d4d; font-size: 11px; font-style: italic;">Refresh halaman jika kode tidak muncul atau kadaluwarsa.</p>
                    </div>
                </body>
            </html>
        `);
    } else {
        // Jika sudah login sukses, ini halaman status online
        res.send('🚀 Server Panel ARDAN STORE Aktif, Online, dan Terhubung ke WhatsApp, Bre!');
    }
});

app.listen(PORT, () => {
    console.log(`Web Server aktif di port: ${PORT}`);
});

// =================================================================
// 3. CORE BOT WHATSAPP (BAILEYS MULTI-AUTH)
// =================================================================
async function startBot() {
    // Sesi disimpan di folder 'sesi_bot_render' agar aman di cloud
    const { state, saveCreds } = await useMultiFileAuthState('sesi_bot_render');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false, // Dimatikan karena kodenya kita lempar ke halaman Web
        logger: pino({ level: 'silent' }),
        browser: Browsers.ubuntu('Chrome'), // Penyamaran browser biar anti-405
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 10000
    });

    // Request Pairing Code otomatis ke server WA jika belum terdaftar
    if (!sock.authState.creds.registered) {
        setTimeout(async () => {
            try {
                let code = await sock.requestPairingCode(NOMOR_HP_BOT);
                code = code?.match(/.{1,4}/g)?.join("-") || code;
                pairingCodeUrl = code; // Lempar kodenya ke variabel web server di atas
                console.log(`\n[!] KODE PAIRING REQ SUCCESS: ${code} (Silahkan buka link web Render kamu)`);
            } catch (error) {
                console.log("❌ Gagal meminta kode pairing:", error);
            }
        }, 6000); // Jeda 6 detik pas start awal agar request-nya stabil
    }

    // Monitoring Status Koneksi
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;

        if (connection === 'close') {
            pairingCodeUrl = null; // Reset kode jika putus
            const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus, mencoba menghubungkan ulang...', shouldReconnect);
            if (shouldReconnect) {
                startBot();
            }
        } else if (connection === 'open') {
            pairingCodeUrl = null; // Hapus tampilan kode karena sudah login
            console.log('\n====================================');
            console.log('BOT WHATSAPP KAMU SUDAH AKTIF!');
            console.log('====================================\n');
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // =================================================================
    // 4. RESPOND CHAT MASUK (FITUR BAWEAN KAMU DI SINI)
    // =================================================================
    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.remoteJid === 'status@broadcast') return;

        const from = msg.key.remoteJid;
        const type = Object.keys(msg.message)[0];
        const body = (type === 'conversation') ? msg.message.conversation :
                     (type === 'extendedTextMessage') ? msg.message.extendedTextMessage.text : '';

        console.log(`[Pesan] ${from} -> ${body}`);

        // === MEMANGGIL FITUR DEEPAI DARI FOLDER ===
        await handleDeepAI(sock, from, msg, body);

        // === MEMANGGIL FITUR DOWNLOADER DARI FOLDER ===
        await handleDownloader(sock, from, msg, body);

        // Perintah dasar bawaan kamu
        if (body.toLowerCase() === 'ping') {
            await sock.sendMessage(from, { text: 'Pong!' }, { quoted: msg });
        }
        if (body.toLowerCase() === 'halo') {
            await sock.sendMessage(from, { text: 'Halo juga! Ada yang bisa dibantu?' }, { quoted: msg });
        }
    });
}

// Jalankan botnya
startBot();
