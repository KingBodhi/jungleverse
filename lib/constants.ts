export const FEATURED_REGIONS = [
  {
    name: "Las Vegas",
    description: "High volume cash games and daily tournaments across the Strip.",
    image: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
    href: "/rooms?city=Las%20Vegas",
  },
  {
    name: "Texas",
    description: "Card clubs with deep cash action in Austin, Dallas, and Houston.",
    image: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80",
    href: "/rooms?state=TX",
  },
  {
    name: "Europe",
    description: "EPT stops, Monte Carlo, Rozvadov, and curated EU casino rooms.",
    image: "https://images.unsplash.com/photo-1505764706515-aa95265c5abc?auto=format&fit=crop&w=1200&q=80",
    href: "/rooms?country=France",
  },
  {
    name: "Asia",
    description: "Macau, Manila, Seoul and the fastest-growing APAC poker markets.",
    image: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    href: "/rooms?country=Philippines",
  },
];

export const RISK_TOLERANCE_OPTIONS = ["LOW", "MEDIUM", "HIGH"];
export const BANKROLL_PROFILES = ["CASH_ONLY", "TOURNAMENT_ONLY", "BALANCED"];

export const PROVIDERS = [
  { value: "POKERSTARS", label: "PokerStars", color: "#c00000" },
  { value: "GG_POKER", label: "GG Poker", color: "#ff6b00" },
  { value: "POKER_888", label: "888 Poker", color: "#000000" },
  { value: "PARTY_POKER", label: "PartyPoker", color: "#ff4400" },
  { value: "WPT_GLOBAL", label: "WPT Global", color: "#0066cc" },
  { value: "WSOP_ONLINE", label: "WSOP Online", color: "#c9a227" },
  { value: "LIVE_ROLL", label: "Live Bankroll", color: "#22c55e" },
  { value: "OTHER", label: "Other", color: "#6b7280" },
] as const;

export const TRANSACTION_TYPES = [
  { value: "DEPOSIT", label: "Deposit", icon: "+" },
  { value: "WITHDRAWAL", label: "Withdrawal", icon: "-" },
  { value: "TRANSFER_IN", label: "Transfer In", icon: "↓" },
  { value: "TRANSFER_OUT", label: "Transfer Out", icon: "↑" },
  { value: "BONUS", label: "Bonus", icon: "★" },
  { value: "RAKEBACK", label: "Rakeback", icon: "%" },
] as const;
