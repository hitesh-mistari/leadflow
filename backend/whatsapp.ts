import pkg from 'whatsapp-web.js';
const { Client, LocalAuth, MessageMedia } = pkg;
import qrcode from 'qrcode';
import qrcodeTerminal from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';

export let isWhatsAppReady = false;
export let whatsappQrCodeUrl: string | null = null;
let client: any;

export const initWhatsApp = () => {
  client = new Client({
    authStrategy: new LocalAuth({ dataPath: './.wwebjs_auth' }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    }
  });

  client.on('qr', async (qr) => {
    console.log('\\n📱 WhatsApp QR Code generated! Scan via WhatsApp Mobile app to link CRM:\\n');
    qrcodeTerminal.generate(qr, { small: true });
    try {
      whatsappQrCodeUrl = await qrcode.toDataURL(qr);
    } catch (e) {
      console.error(e);
    }
    isWhatsAppReady = false;
  });

  client.on('ready', () => {
    console.log('✅ WhatsApp Headless Client successfully logged in and ready!');
    whatsappQrCodeUrl = null;
    isWhatsAppReady = true;
  });

  client.on('disconnected', (reason) => {
    console.log('⚠️ WhatsApp Client was logged out or disconnected:', reason);
    isWhatsAppReady = false;
    client.initialize(); 
  });

  client.on('auth_failure', () => {
    console.log('⚠️ WhatsApp Authentication Failure! Delete .wwebjs_auth folder if corrupted.');
    isWhatsAppReady = false;
    whatsappQrCodeUrl = null;
  });

  console.log('🚀 Initializing hidden WhatsApp Chromium Browser...');
  client.initialize().catch(err => {
    console.error("WhatsApp Initialization fatal error:", err);
  });
};

export const sendWhatsAppMessage = async (phone: string, text: string, attachPromo: boolean = false) => {
  if (!isWhatsAppReady) {
    throw new Error('WhatsApp client is currently not linked or loading. Please check the CRM dashboard or server console for the QR Code.');
  }
  
  // Format phone to whatsapp network ID format
  const cleaned = phone.replace(/\\D/g, '');
  const num = cleaned.startsWith('0') ? '91' + cleaned.slice(1) : (cleaned.length === 10 ? '91' + cleaned : cleaned);
  const chatId = `${num}@c.us`;

  if (attachPromo) {
    const promoJpg = path.join(process.cwd(), 'public', 'promo.jpg');
    const promoPng = path.join(process.cwd(), 'public', 'promo.png');
    let promoPathToUse = null;
    
    if (fs.existsSync(promoJpg)) {
        promoPathToUse = promoJpg;
    } else if (fs.existsSync(promoPng)) {
        promoPathToUse = promoPng;
    }

    if (!promoPathToUse) {
         console.warn(`WARNING: Attempted to attach promo image, but it was not found in backend/public/ folder. Sent text only.`);
         await client.sendMessage(chatId, text);
         return { success: true, message: 'Message sent over WhatsApp but promotional image was missing from server public folder.' };
    }

    try {
      const media = MessageMedia.fromFilePath(promoPathToUse);
      // Media messages place the text as a caption underneath the image attachment
      await client.sendMessage(chatId, media, { caption: text });
      return { success: true, message: 'Message correctly dispatched via WhatsApp with media attached!' };
    } catch(err) {
      console.error('Failed to attach media object:', err);
      await client.sendMessage(chatId, text);
      return { success: true, message: 'Sent as text due to media rendering exception.' };
    }
  } else {
    await client.sendMessage(chatId, text);
    return { success: true, message: 'Message securely delivered via WhatsApp headless bot.' };
  }
};
