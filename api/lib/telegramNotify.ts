// Telegram notification for admin — naya deposit/withdrawal aate hi
// betadda_admin bot ke through admin ko instant message jata hai.
// Button dabane pe admin bot ka existing pending-list flow khulta hai
// (callback_data 'dep:pending' / 'wd:pending' admin bot ke router se match karta hai).
//
// Env needed (betadda_admin wale hi values):
//   TELEGRAM_BOT_TOKEN, ADMIN_TELEGRAM_ID (ya comma-separated ADMIN_TELEGRAM_IDS)
//
// Notification failure kabhi transaction fail nahi karta — best-effort hai.

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

function adminIds(): string[] {
  const multi = process.env.ADMIN_TELEGRAM_IDS || '';
  const single = process.env.ADMIN_TELEGRAM_ID || '';
  return [...multi.split(','), single].map(s => s.trim()).filter(Boolean);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function tgCall(method: string, payload: object): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => null);
  if (!data?.ok) {
    console.error(`[telegramNotify] ${method} failed:`, data?.description || res.status);
  }
}

interface DepositNotify {
  kind: 'deposit';
  userName: string;
  amount: number;
  utrNumber: string;
  screenshotUrl?: string;
}

interface WithdrawNotify {
  kind: 'withdraw';
  userName: string;
  amount: number;
  upiId: string;
  userEmail?: string;
}

export async function notifyAdmins(n: DepositNotify | WithdrawNotify): Promise<void> {
  try {
    if (!BOT_TOKEN) return; // env set nahi — silently skip
    const ids = adminIds();
    if (ids.length === 0) return;

    let caption: string;
    let keyboard: object;

    if (n.kind === 'deposit') {
      caption = [
        '💰 <b>Naya Deposit Request</b>',
        `👤 ${escapeHtml(n.userName)}`,
        `💵 ₹${n.amount}`,
        `🧾 UTR: <code>${escapeHtml(n.utrNumber)}</code>`,
      ].join('\n');
      keyboard = { inline_keyboard: [[{ text: '📥 Pending Deposits kholo', callback_data: 'dep:pending' }]] };
    } else {
      caption = [
        '🏦 <b>Naya Withdrawal Request</b>',
        `👤 ${escapeHtml(n.userName)}${n.userEmail ? ` (${escapeHtml(n.userEmail)})` : ''}`,
        `💵 ₹${n.amount}`,
        `📲 UPI: <code>${escapeHtml(n.upiId)}</code>`,
      ].join('\n');
      keyboard = { inline_keyboard: [[{ text: '📤 Pending Withdrawals kholo', callback_data: 'wd:pending' }]] };
    }

    const canSendPhoto = n.kind === 'deposit' && n.screenshotUrl && /^https?:\/\//i.test(n.screenshotUrl);

    await Promise.all(ids.map(chatId =>
      canSendPhoto
        ? tgCall('sendPhoto', {
            chat_id: chatId,
            photo: (n as DepositNotify).screenshotUrl,
            caption,
            parse_mode: 'HTML',
            reply_markup: keyboard,
          }).catch(() =>
            // Photo fail ho (invalid URL etc.) to text se retry
            tgCall('sendMessage', { chat_id: chatId, text: caption, parse_mode: 'HTML', reply_markup: keyboard })
          )
        : tgCall('sendMessage', { chat_id: chatId, text: caption, parse_mode: 'HTML', reply_markup: keyboard })
    ));
  } catch (err: any) {
    console.error('[telegramNotify] error:', err?.message);
  }
}
