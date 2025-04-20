// index.js - WhatsApp Bot with 130 Commands // Using @whiskeysockets/baileys v6.7.16 and useMultiFileAuthState

import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore, DisconnectReason, proto } from '@whiskeysockets/baileys'; import P from 'pino'; import dotenv from 'dotenv';

dotenv.config(); const PREFIX = process.env.PREFIX || '!'; const ownerNumber = process.env.OWNER_NUMBER || '';

async function startBot() { // Authentication state const { state, saveCreds } = await useMultiFileAuthState('./auth_info'); const { version } = await fetchLatestBaileysVersion();

// Initialize socket const sock = makeWASocket({ logger: P({ level: 'info' }), printQRInTerminal: true, auth: state, version });

// Save credentials when updated sock.ev.on('creds.update', saveCreds);

// Handle connection updates sock.ev.on('connection.update', (update) => { const { connection, lastDisconnect } = update; console.log('Connection Update:', connection); if (connection === 'close') { const reason = lastDisconnect?.error?.output?.statusCode; if (reason !== DisconnectReason.loggedOut) { console.log('Reconnecting...'); startBot(); } else { console.log('Logged out. Remove auth_info to re-login.'); } } });

// In-memory message store (optional) const store = makeInMemoryStore({ logger: P({ level: 'fatal' }) }); store.bind(sock.ev);

// Command registry const commands = {};

// Auto-generate 130 placeholder commands for (let i = 1; i <= 130; i++) { const cmdName = cmd${i}; commands[cmdName] = async ({ sock, jid, args, from }) => { await sock.sendMessage(jid, { text: *${cmdName}* executed.\nArgs: ${args.join(' ')} }); }; }

// Message handler sock.ev.on('messages.upsert', async ({ messages, type }) => { if (type !== 'notify') return; const msg = messages[0]; if (!msg.message || msg.key.fromMe) return;

const from = msg.key.remoteJid;
const text = msg.message.conversation || msg.message.extendedTextMessage?.text;
if (!text || !text.startsWith(PREFIX)) return;

const [full, cmd, ...args] = text.trim().split(/\s+/);
const name = cmd.slice(PREFIX.length).toLowerCase();

if (commands[name]) {
  try {
    await commands[name]({ sock, jid: from, args, from });
  } catch (err) {
    console.error(err);
    await sock.sendMessage(from, { text: 'Error executing command.' });
  }
}

});

console.log(Bot is up and running with ${Object.keys(commands).length} commands.); }

startBot().catch(console.error);

