export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades';
  value: string;        // 'A', '2', '3', ... '10', 'J', 'Q', 'K'
  numericValue: number; // 14, 2, 3, ... 10, 11, 12, 13
}

export const createDeck = () => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'] as const;
  const cards = [
    { value: 'A', numericValue: 14 },
    { value: '2', numericValue: 2 },
    { value: '3', numericValue: 3 },
    { value: '4', numericValue: 4 },
    { value: '5', numericValue: 5 },
    { value: '6', numericValue: 6 },
    { value: '7', numericValue: 7 },
    { value: '8', numericValue: 8 },
    { value: '9', numericValue: 9 },
    { value: '10', numericValue: 10 },
    { value: 'J', numericValue: 11 },
    { value: 'Q', numericValue: 12 },
    { value: 'K', numericValue: 13 },
  ];

  const deck: Card[] = [];
  for (const suit of suits) {
    for (const c of cards) {
      deck.push({ suit, ...c });
    }
  }
  return deck;
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// New CardHelper.ts mein add karo

const SUIT_SHORT: Record<string, string> = {
  hearts: 'h',
  diamonds: 'd',
  clubs: 'c',
  spades: 's',
};

const SUIT_FULL: Record<string, Card['suit']> = {
  h: 'hearts',
  d: 'diamonds',
  c: 'clubs',
  s: 'spades',
};

// Card object → "Ah", "Kd", "10c" string
export const cardToId = (card: Card): string => {
  return `${card.value}${SUIT_SHORT[card.suit]}`;
};

// "Ah", "Kd", "10c" string → Card object
export const idToCard = (id: string): Card | null => {
  if (!id || id.length < 2) return null;
  const suitChar = id[id.length - 1].toLowerCase();
  const rankPart = id.slice(0, -1).toUpperCase();

  const suit = SUIT_FULL[suitChar];
  if (!suit) return null;

  const validRanks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  if (!validRanks.includes(rankPart)) return null;

  const numericValueMap: Record<string, number> = {
    A: 14, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
    '8': 8, '9': 9, '10': 10, J: 11, Q: 12, K: 13,
  };

  return {
    suit,
    value: rankPart,
    numericValue: numericValueMap[rankPart] || 2,
  };
};
