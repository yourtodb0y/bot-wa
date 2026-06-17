const axios = require('axios');

async function handleDownloader(sock, from, msg, body) {
    const args = body.trim().split(/ +/);
    const command = args[0].toLowerCase();
    const url = args[1];

    // Daftar perintah yang didukung
    const commands = ['.ytmp3', '.tiktok', '.ttmp3', '.ig', '.fb'];
    if (!commands.includes(command)) return;

    if (!url) {
        return await sock.sendMessage(from, { text: `Silahkan masukkan linknya, *bre*!\nContoh: *${command} https://...*` }, { quoted: msg });
    }

    await sock.sendMessage(from, { text: '⏳ Tunggu sebentar ya, media sedang diproses...' }, { quoted: msg });

    try {
        switch (command) {
            case '.ytmp3': {
                // Endpoint converter YT MP3 publik yang stabil
                const res = await axios.get(`https://api.vreden.web.id/api/ytmp3?url=${encodeURIComponent(url)}`);
                const data = res.data.result;
                
                if (!data || !data.download) throw new Error('Link download tidak ditemukan');
                
                await sock.sendMessage(from, { 
                    audio: { url: data.download }, 
                    mimetype: 'audio/mp4', 
                    fileName: `${data.title || 'audio'}.mp3` 
                }, { quoted: msg });
                break;
            }

            case '.tiktok': {
                // Download TikTok Video No Watermark
                const res = await axios.get(`https://api.vreden.web.id/api/tiktok?url=${encodeURIComponent(url)}`);
                const data = res.data.result;
                
                if (!data || !data.video) throw new Error('Video tidak ditemukan');

                await sock.sendMessage(from, { 
                    video: { url: data.video }, 
                    caption: `*🎵 TikTok Video Downloader*\n\n📌 *Caption:* ${data.title || '-'}` 
                }, { quoted: msg });
                break;
            }

            case '.ttmp3': {
                // Download Audio TikTok saja
                const res = await axios.get(`https://api.vreden.web.id/api/tiktok?url=${encodeURIComponent(url)}`);
                const data = res.data.result;
                
                if (!data || !data.music) throw new Error('Audio tidak ditemukan');

                await sock.sendMessage(from, { 
                    audio: { url: data.music }, 
                    mimetype: 'audio/mp4', 
                    fileName: 'tiktok_audio.mp3' 
                }, { quoted: msg });
                break;
            }

            case '.ig': {
                // Instagram Post/Reels/Story Downloader
                const res = await axios.get(`https://api.vreden.web.id/api/igdownload?url=${encodeURIComponent(url)}`);
                const data = res.data.result; // Biasanya berupa array jika post slide banyak
                
                if (!data || data.length === 0) throw new Error('Media Instagram tidak ditemukan');

                // Ambil item pertama (atau reels)
                const mediaUrl = data[0].url;
                const isVideo = data[0].type === 'video' || mediaUrl.includes('.mp4');

                if (isVideo) {
                    await sock.sendMessage(from, { video: { url: mediaUrl }, caption: '*✨ Instagram Video Downloader*' }, { quoted: msg });
                } else {
                    await sock.sendMessage(from, { image: { url: mediaUrl }, caption: '*✨ Instagram Image Downloader*' }, { quoted: msg });
                }
                break;
            }

            case '.fb': {
                // Facebook Video Downloader (HD / SD)
                const res = await axios.get(`https://api.vreden.web.id/api/facebook?url=${encodeURIComponent(url)}`);
                const data = res.data.result;
                
                // Coba ambil kualitas HD, kalau tidak ada pakai SD
                const videoUrl = data.hd || data.sd;
                if (!videoUrl) throw new Error('Video Facebook tidak ditemukan');

                await sock.sendMessage(from, { 
                    video: { url: videoUrl }, 
                    caption: `*🎬 Facebook Video Downloader*\n\n📌 *Judul:* ${data.title || '-'}` 
                }, { quoted: msg });
                break;
            }
        }
    } catch (error) {
        console.error(`Error pada ${command}:`, error.message);
        await sock.sendMessage(from, { text: `⚠️ Waduh, gagal mendownload media. Pastikan linknya valid atau coba beberapa saat lagi ya, *bre*!` }, { quoted: msg });
    }
}

module.exports = { handleDownloader };
        
