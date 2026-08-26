'use server';

export async function submitFeedback(formData: FormData) {
  const type = formData.get('type');
  const message = formData.get('message');
  const contact = formData.get('contact') || 'Анонимно';
  const sessionId = formData.get('sessionId') || 'Unknown';
  const userAgent = formData.get('userAgent') || 'Unknown';
  const screenResolution = formData.get('screenResolution') || 'Unknown';

  if (!message) {
    return { error: 'Сообщение не может быть пустым' };
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.error('Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    return { error: 'Серверная ошибка: не настроен Telegram' };
  }

  const text = `
📩 <b>Новый фидбек!</b>
<b>Тип:</b> ${type}
<b>От кого:</b> ${contact}

<b>Сообщение:</b>
<i>${message}</i>

---
🔧 <b>Техническая инфа:</b>
Session: <code>${sessionId}</code>
Устройство: <code>${userAgent}</code>
Экран: <code>${screenResolution}</code>
  `.trim();

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    if (!res.ok) {
      throw new Error(`Telegram API error: ${res.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending feedback:', error);
    return { error: 'Не удалось отправить фидбек' };
  }
}
