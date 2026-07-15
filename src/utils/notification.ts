import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

export async function sendGameNotification(
  uid: string,
  isWinner: boolean,
  gameType: string,
  amount: number
): Promise<void> {
  try {
    await addDoc(collection(db, 'notifications'), {
      uid,
      title: isWinner ? '🎉 You Won!' : 'Game Over',
      message: isWinner
        ? `You won ₹${amount} in ${gameType}`
        : `You lost ₹${amount} in ${gameType}`,
      type: isWinner ? 'WIN' : 'LOSS',
      read: false,
      amount,
      gameType,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

// Optional: Instant toast using your store
import { useAppStore } from '../store/useAppStore'; // adjust path as per your structure

export function showToast(title: string, message: string) {
  // If you have a toast system, call it here
  // For now, just log
  console.log(`[TOAST] ${title}: ${message}`);
}
