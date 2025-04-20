// index.js - WhatsApp Bot na Amri 130 // Inatumia @whiskeysockets/baileys v6.7.16 na useMultiFileAuthState

import makeWASocket, { useMultiFileAuthState, fetchLatestBaileysVersion, makeInMemoryStore, DisconnectReason, proto } from '@whiskeysockets/baileys';
import P from 'pino';
import dotenv from 'dotenv';

dotenv.config();
const PREFIX = process.env.PREFIX || '!';
const ownerNumber = process.env.OWNER_NUMBER || '';

async function startBot() {
    // Hali ya uthibitisho
    const { state, saveCreds } = await useMultiFileAuthState('./auth_info');
    const { version } = await fetchLatestBaileysVersion();

    // Anzisha socket
    const sock = makeWASocket({
        logger: P({ level: 'info' }),
        printQRInTerminal: true,
        auth: state,
        version
    });

    // Hifadhi taarifa za uthibitisho zitakaposasishwa
    sock.ev.on('creds.update', saveCreds);

    // Hushughulikia masasisho ya muunganisho
    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        console.log('Masasisho ya Muunganisho:', connection);
        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            if (reason !== DisconnectReason.loggedOut) {
                console.log('Inarejeshwa...');
                startBot();
            } else {
                console.log('Umejiondoa. Ondoa auth_info ili kujiingiza tena.');
            }
        }
    });

    // Duka la ujumbe la ndani (hiari)
    const store = makeInMemoryStore({ logger: P({ level: 'fatal' }) });
    store.bind(sock.ev);

    // Usajili wa amri
    const commands = {};

    // Tengeneza kwa otomatiki amri 130 za kielelezo
    for (let i = 1; i <= 130; i++) {
        const cmdName = `cmd${i}`;
        commands[cmdName] = async ({ sock, jid, args, from }) => {
            await sock.sendMessage(jid, { text: `*${cmdName}* imetekelezwa.\nArguments: ${args.join(' ')}` });
        };
    }

    // Mshughulikiaji wa ujumbe
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
                await commands[name]({ sock, jid: from, args, from });
            } catch (err) {
                console.error(err);
                await sock.sendMessage(from, { text: 'Hitilafu kutekeleza amri.' });
            }
        }
    });

    console.log(`Bot inafanya kazi na amri ${Object.keys(commands).length}.`);
}

startBot().catch(console.error);
