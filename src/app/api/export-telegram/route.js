import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const rawData = await request.text();
    if (!rawData) {
      return NextResponse.json(
        { error: 'No data provided to export.' },
        { status: 400 }
      );
    }

    // Read values strictly from environment variables
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      return NextResponse.json(
        { error: 'Telegram configuration (bot token or chat ID) is missing on the server.' },
        { status: 500 }
      );
    }

    // Create a Blob from the raw string containing the JSON backup
    const blob = new Blob([rawData], { type: 'application/json' });
    
    // Prepare multipart form data for the Telegram sendDocument API
    const formData = new FormData();
    formData.append('chat_id', chatId);
    
    const fileName = `multi-manager-backup-${new Date().toISOString().slice(0, 10)}.json`;
    formData.append('document', blob, fileName);
    
    const dateStr = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    const caption = `📂 *Multi-Manager Backup File*\n📅 *Date:* ${dateStr}\n🔐 *Security:* AES-256-GCM Encrypted`;
    formData.append('caption', caption);
    formData.append('parse_mode', 'Markdown');

    // Call Telegram API sendDocument method
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Telegram API error response:', errorText);
      return NextResponse.json(
        { error: `Telegram error: ${response.statusText}`, details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({
      success: true,
      message: 'Backup sent to Telegram successfully.',
      telegram: data
    });
  } catch (error) {
    console.error('Internal server error during Telegram backup:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error.' },
      { status: 500 }
    );
  }
}
