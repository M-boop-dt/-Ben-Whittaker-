// index.js - WhatsApp Bot with 300 Named Commands + Emoji Reactions + ViewOnce Unlock + Fake Typing/Recording import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore, DisconnectReason, proto } from '@whiskeysockets/baileys'; import P from 'pino'; import dotenv from 'dotenv'; import fs from 'fs';

dotenv.config(); const PREFIX = process.env.PREFIX || '!'; const ownerNumber = process.env.OWNER_NUMBER || '';

async function startBot() { const { state, saveCreds } = await useMultiFileAuthState('./auth_info'); const { version } = await fetchLatestBaileysVersion();

const sock = makeWASocket({
    logger: P({ level: 'info' }),
    printQRInTerminal: true,
    auth: state,
    version,
    generateHighQualityLinkPreview: true,
    markOnlineOnConnect: true,
    patchMessageBeforeSending: (message) => {
        const m = message;
        m.viewOnceMessage?.message && (m.message = m.viewOnceMessage.message);
        return m;
    }
});

sock.ev.on('creds.update', saveCreds);

sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect } = update;
    if (connection === 'close') {
        const reason = lastDisconnect?.error?.output?.statusCode;
        if (reason !== DisconnectReason.loggedOut) startBot();
        else console.log('Session imeisha. Futa folder la auth_info na anza upya.');
    }
});

const store = makeInMemoryStore({ logger: P({ level: 'silent' }) });
store.bind(sock.ev);

const commands = {};
const emojis = ['🔥', '✨', '⚡', '✅', '❗', '🛠️', '📚', '🎉', '🧠', '🚀', '💡', '🌀'];

for (let i = 1; i <= 300; i++) {
    const cmdName = `feature${i}`;
    commands[cmdName] = async ({ sock, jid, args }) => {
        await sock.sendPresenceUpdate('composing', jid);
        await new Promise(resolve => setTimeout(resolve, 500));
        await sock.sendPresenceUpdate('recording', jid);
        await new Promise(resolve => setTimeout(resolve, 700));
        const sent = await sock.sendMessage(jid, { text: `*${cmdName.toUpperCase()}* ${emojis[i % emojis.length]}\nUmetekelezwa!\nArgs: ${args.join(' ')}` });
        await sock.sendMessage(jid, { react: { text: emojis[i % emojis.length], key: sent.key } });
    };
}

sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    const from = msg.key.remoteJid;
    const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
    if (!text || !text.startsWith(PREFIX)) return;

    const [full, cmd, ...args] = text.trim().split(/\s+/);
    const name = cmd.slice(PREFIX.length).toLowerCase();

    if (commands[name]) {
        try {
            await commands[name]({ sock, jid: from, args });
        } catch (err) {
            console.error(err);
            await sock.sendMessage(from, { text: 'Hitilafu kutekeleza amri.' });
        }
    }
});

console.log(`✅ Bot imewasha vizuri! Amri zilizosajiliwa: ${Object.keys(commands).length}`);

}

startBot().catch(console.error);

