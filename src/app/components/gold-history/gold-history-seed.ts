import { GoldHistoryItem } from "../../services/gold-price";

export interface GoldHistorySeedItem {
  date: string;
  price24: number;
  price22: number;
  price21: number;
  price18: number;
}

export const GOLD_HISTORY_SEED: GoldHistorySeedItem[] = [
  {
    date: '20260919',
    price24: 54.341,
    price22: 49.813,
    price21: 47.549,
    price18: 40.756
  },
  {
    date: '20260920',
    price24: 54.341,
    price22: 49.813,
    price21: 47.549,
    price18: 40.756
  },
  {
    date: '20260923',
    price24: 53.432,
    price22: 48.979,
    price21: 46.753,
    price18: 40.074
  }
];
