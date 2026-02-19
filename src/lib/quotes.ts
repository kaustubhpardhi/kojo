export interface Quote {
  text: string;
  jp: string;
  author?: string;
}

export const QUOTES: Quote[] = [
  {
    jp: "一期一会",
    text: "Treasure every encounter, for it will never recur; this moment is unique.",
  },
  {
    jp: "七転び八起き",
    text: "Fall seven times, stand up eight; life is defined by resilience, not the fall.",
  },
  {
    jp: "水滴石穿",
    text: "Consistent drops of water pierce the stone; persistence overcomes any obstacle.",
  },
  {
    jp: "日日是好日",
    text: "Every day is a good day; presence and perspective define our reality.",
  },
  {
    jp: "万里一空",
    text: "Focusing on the one goal without distraction; the path is the destination.",
  },
  {
    jp: "守破離",
    text: "Follow the rules, break them, then transcend; true mastery is liberation.",
  },
  {
    jp: "温故知新",
    text: "Understand the old to discover the new; wisdom is the bridge between eras.",
  },
  {
    jp: "不動心",
    text: "An immovable mind; maintain your center amidst the storms of life.",
  },
  {
    jp: "克己",
    text: "Conquest of self is the greatest victory; the only opponent is yesterday's version of you.",
  },
  {
    jp: "和敬静寂",
    text: "Harmony, respect, purity, and tranquility; the four pillars of a balanced life.",
  },
];

export function getDailyQuote(): Quote {
  const dayOfYear = Math.floor(
    (new Date().getTime() -
      new Date(new Date().getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  return QUOTES[dayOfYear % QUOTES.length];
}
