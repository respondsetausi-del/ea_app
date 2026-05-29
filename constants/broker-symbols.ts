// Razor Markets (Pty) Ltd — full symbol catalogue
// Account: 4078302 | Server: RazorMarkets-Live
// Last updated: 2026-05-15

export interface BrokerSymbol {
  symbol: string;
  description: string;
}

export interface SymbolCategory {
  name: string;
  symbols: BrokerSymbol[];
}

export const BROKER_SYMBOLS: SymbolCategory[] = [
  {
    name: 'FX',
    symbols: [
      { symbol: 'AUDCAD', description: 'Australian Dollar vs Canadian Dollar' },
      { symbol: 'AUDCHF', description: 'Australian Dollar vs Swiss Franc' },
      { symbol: 'AUDJPY', description: 'Australian Dollar vs Japanese Yen' },
      { symbol: 'AUDNZD', description: 'Australian Dollar vs New Zealand Dollar' },
      { symbol: 'AUDSGD', description: 'Australian Dollar vs Singapore Dollar' },
      { symbol: 'AUDUSD', description: 'Australian Dollar vs US Dollar' },
      { symbol: 'CADCHF', description: 'Canadian Dollar vs Swiss Franc' },
      { symbol: 'CADJPY', description: 'Canadian Dollar vs Japanese Yen' },
      { symbol: 'CHFJPY', description: 'Swiss Franc vs Japanese Yen' },
      { symbol: 'EURAUD', description: 'Euro vs Australian Dollar' },
      { symbol: 'EURCAD', description: 'Euro vs Canadian Dollar' },
      { symbol: 'EURCHF', description: 'Euro vs Swiss Franc' },
      { symbol: 'EURCZK', description: 'Euro vs Czech Koruna' },
      { symbol: 'EURDKK', description: 'Euro vs Danish Kroner' },
      { symbol: 'EURGBP', description: 'Euro vs Great Britain Pound' },
      { symbol: 'EURHKD', description: 'Euro vs Hong Kong Dollar' },
      { symbol: 'EURHUF', description: 'Euro vs Hungarian Forint' },
      { symbol: 'EURJPY', description: 'Euro vs Japanese Yen' },
      { symbol: 'EURMXN', description: 'Euro vs Mexican Peso' },
      { symbol: 'EURNZD', description: 'Euro vs New Zealand Dollar' },
      { symbol: 'EURSEK', description: 'Euro vs Swedish Krona' },
      { symbol: 'EURUSD', description: 'Euro vs US Dollar' },
      { symbol: 'EURZAR', description: 'Euro vs South African Rand' },
      { symbol: 'GBPAUD', description: 'Great Britain Pound vs Australian Dollar' },
      { symbol: 'GBPCAD', description: 'Great Britain Pound vs Canadian Dollar' },
      { symbol: 'GBPCHF', description: 'Great Britain Pound vs Swiss Franc' },
      { symbol: 'GBPDKK', description: 'Great Britain Pound vs Danish Krona' },
      { symbol: 'GBPJPY', description: 'Great Britain Pound vs Japanese Yen' },
      { symbol: 'GBPMXN', description: 'Great Britain Pound vs Mexican Peso' },
      { symbol: 'GBPNZD', description: 'Great Britain Pound vs New Zealand Dollar' },
      { symbol: 'GBPPLN', description: 'Great Britain Pound vs Polish Zloty' },
      { symbol: 'GBPSEK', description: 'Great Britain Pound vs Swedish Kroner' },
      { symbol: 'GBPSGD', description: 'Great Britain Pound vs Singapore Dollar' },
      { symbol: 'GBPUSD', description: 'Great Britain Pound vs US Dollar' },
      { symbol: 'GBPZAR', description: 'Great Britain Pound vs South African Rand' },
      { symbol: 'NZDCAD', description: 'New Zealand Dollar vs Canadian Dollar' },
      { symbol: 'NZDCHF', description: 'New Zealand Dollar vs Swiss Franc' },
      { symbol: 'NZDJPY', description: 'New Zealand Dollar vs Japanese Yen' },
      { symbol: 'NZDSGD', description: 'New Zealand Dollar vs Singapore Dollar' },
      { symbol: 'NZDUSD', description: 'New Zealand Dollar vs US Dollar' },
      { symbol: 'SGDJPY', description: 'Singapore Dollar vs Japanese Yen' },
      { symbol: 'USDCAD', description: 'US Dollar vs Canadian Dollar' },
      { symbol: 'USDCHF', description: 'US Dollar vs Swiss Franc' },
      { symbol: 'USDCNH', description: 'US Dollar vs Offshore RMB' },
      { symbol: 'USDCZK', description: 'US Dollar vs Czech Koruna' },
      { symbol: 'USDDKK', description: 'US Dollar vs Danish Kroner' },
      { symbol: 'USDHKD', description: 'US Dollar vs Hong Kong Dollar' },
      { symbol: 'USDHUF', description: 'US Dollar vs Hungarian Forint' },
      { symbol: 'USDJPY', description: 'US Dollar vs Japanese Yen' },
      { symbol: 'USDMXN', description: 'US Dollar vs Mexican Peso' },
      { symbol: 'USDPLN', description: 'US Dollar vs Polish Zloty' },
      { symbol: 'USDSGD', description: 'US Dollar vs Singapore Dollar' },
      { symbol: 'USDZAR', description: 'US Dollar vs South African Rand' },
    ],
  },
  {
    name: 'Indices',
    symbols: [
      { symbol: '.DE30.', description: 'German 40 Index' },
      { symbol: '.UK100.', description: 'UK 100 Index' },
      { symbol: '.US30.', description: 'US Dow Jones Index' },
      { symbol: '.US500.', description: 'US 500 Index Cash' },
      { symbol: '.USTECH.', description: 'US Nasdaq Index' },
      { symbol: '.WTI.', description: 'OIL vs US Dollar' },
    ],
  },
  {
    name: 'Metals',
    symbols: [
      { symbol: 'XAGEUR', description: 'Silver vs EUR 5000 oz.' },
      { symbol: 'XAGUSD', description: 'Silver vs US Dollar 5000 oz.' },
      { symbol: 'XAUEUR', description: 'Gold vs EUR 100 oz.' },
      { symbol: 'XAUUSD', description: 'Gold vs US Dollar 100 oz.' },
      { symbol: 'XPTUSD', description: 'Platinum vs US Dollar 100 oz.' },
    ],
  },
];

// Flat list of all symbol names
export const ALL_SYMBOLS = BROKER_SYMBOLS.flatMap(cat => cat.symbols.map(s => s.symbol));

// Lookup description by symbol name
export const getSymbolDescription = (symbol: string): string => {
  for (const cat of BROKER_SYMBOLS) {
    const found = cat.symbols.find(s => s.symbol === symbol);
    if (found) return found.description;
  }
  return '';
};

// Get category name for a symbol
export const getSymbolCategory = (symbol: string): string => {
  for (const cat of BROKER_SYMBOLS) {
    if (cat.symbols.some(s => s.symbol === symbol)) return cat.name;
  }
  return '';
};
