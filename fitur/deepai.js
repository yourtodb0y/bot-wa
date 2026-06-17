const axios = require('axios');

async function handleDeepAI(sock, from, msg, body) {
    if (!body.startsWith('.ai ')) return;

    const prompt = body.slice(4).trim();
    
    if (!prompt) {
        return await sock.sendMessage(from, { text: 'Silahkan masukkan pertanyaannya.\nContoh: *.ai apa itu coding?*' }, { quoted: msg });
    }

    await sock.sendPresenceUpdate('composing', from);

    try {
        // Menggunakan API Groq dengan model Llama generasi terbaru yang aktif di 2026
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile', // Model terbaru, sangat pintar bahasa Indonesia
            messages: [{ role: 'user', content: prompt }]
        }, {
            headers: {
                'Authorization': 'Bearer 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',
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        const hasilAI = response.data.choices[0]?.message?.content || 'Maaf, AI tidak memberikan respon.';
        const teksBalasan = `*🤖 DEEP AI RESPONSE*:\n\n${hasilAI}\n\n_Powered by Llama 3.3 via Groq_`;
        
        await sock.sendMessage(from, { text: teksBalasan }, { quoted: msg });

    } catch (error) {
        console.error('Error pada Groq AI:', error.response?.data || error.message);
        await sock.sendMessage(from, { text: 'Aduh, sistem AI sedang sibuk atau ada masalah konfigurasi. Coba lagi nanti ya!' }, { quoted: msg });
    }
}

module.exports = { handleDeepAI };

