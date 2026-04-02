// =============================================================================
// ultraenv — ISO 4217 Currency Codes Database
// Complete list of all ISO 4217 currency codes with names, symbols, and numeric codes.
// Source: ISO 4217 standard (active + commonly used historic currencies)
// =============================================================================

export interface Currency {
  /** ISO 4217 alphabetic code (e.g., "USD", "EUR", "JPY") */
  code: string;
  /** Full English name of the currency */
  name: string;
  /** Commonly used symbol for the currency (e.g., "$", "€", "¥") */
  symbol: string;
  /** ISO 4217 numeric code (3 digits) */
  numeric: string;
}

/**
 * Complete array of ISO 4217 currency entries.
 * Includes all active currencies, fund codes, precious metal codes,
 * and commonly referenced historic currencies.
 */
export const CURRENCIES: readonly Currency[] = [
  // ---------------------------------------------------------------------------
  // A
  // ---------------------------------------------------------------------------
  { code: 'AED', name: 'UAE Dirham', symbol: 'د.إ', numeric: '784' },
  { code: 'AFN', name: 'Afghani', symbol: '؋', numeric: '971' },
  { code: 'ALL', name: 'Lek', symbol: 'L', numeric: '008' },
  { code: 'AMD', name: 'Armenian Dram', symbol: '֏', numeric: '051' },
  { code: 'ANG', name: 'Netherlands Antillean Guilder', symbol: 'ƒ', numeric: '532' },
  { code: 'AOA', name: 'Kwanza', symbol: 'Kz', numeric: '973' },
  { code: 'ARS', name: 'Argentine Peso', symbol: '$', numeric: '032' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', numeric: '036' },
  { code: 'AWG', name: 'Aruban Florin', symbol: 'ƒ', numeric: '533' },
  { code: 'AZN', name: 'Azerbaijan Manat', symbol: '₼', numeric: '944' },

  // ---------------------------------------------------------------------------
  // B
  // ---------------------------------------------------------------------------
  { code: 'BAM', name: 'Convertible Mark', symbol: 'KM', numeric: '977' },
  { code: 'BBD', name: 'Barbados Dollar', symbol: 'Bds$', numeric: '052' },
  { code: 'BDT', name: 'Taka', symbol: '৳', numeric: '050' },
  { code: 'BGN', name: 'Bulgarian Lev', symbol: 'лв', numeric: '975' },
  { code: 'BHD', name: 'Bahraini Dinar', symbol: 'ب.د', numeric: '048' },
  { code: 'BIF', name: 'Burundi Franc', symbol: 'Fr', numeric: '108' },
  { code: 'BMD', name: 'Bermudian Dollar', symbol: 'BD$', numeric: '060' },
  { code: 'BND', name: 'Brunei Dollar', symbol: 'B$', numeric: '096' },
  { code: 'BOB', name: 'Boliviano', symbol: 'Bs', numeric: '068' },
  { code: 'BOV', name: 'Bolivian Mvdol', symbol: 'Bs', numeric: '984' },
  { code: 'BRL', name: 'Brazilian Real', symbol: 'R$', numeric: '986' },
  { code: 'BSD', name: 'Bahamian Dollar', symbol: 'B$', numeric: '044' },
  { code: 'BTN', name: 'Ngultrum', symbol: 'Nu.', numeric: '064' },
  { code: 'BWP', name: 'Pula', symbol: 'P', numeric: '072' },
  { code: 'BYN', name: 'Belarusian Ruble', symbol: 'Br', numeric: '933' },
  { code: 'BZD', name: 'Belize Dollar', symbol: 'BZ$', numeric: '084' },

  // ---------------------------------------------------------------------------
  // C
  // ---------------------------------------------------------------------------
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', numeric: '124' },
  { code: 'CDF', name: 'Congolese Franc', symbol: 'Fr', numeric: '976' },
  { code: 'CHE', name: 'WIR Euro', symbol: 'CHW', numeric: '947' },
  { code: 'CHF', name: 'Swiss Franc', symbol: 'CHF', numeric: '756' },
  { code: 'CHW', name: 'WIR Franc', symbol: 'CHW', numeric: '948' },
  { code: 'CLF', name: 'Unidad de Fomento', symbol: 'CLF', numeric: '990' },
  { code: 'CLP', name: 'Chilean Peso', symbol: 'CLP$', numeric: '152' },
  { code: 'CNY', name: 'Chinese Yuan Renminbi', symbol: '¥', numeric: '156' },
  { code: 'COP', name: 'Colombian Peso', symbol: 'COL$', numeric: '170' },
  { code: 'COU', name: 'Unidad de Valor Real', symbol: 'COU', numeric: '970' },
  { code: 'CRC', name: 'Costa Rican Colon', symbol: '₡', numeric: '188' },
  { code: 'CUC', name: 'Cuban Convertible Peso', symbol: 'CUC$', numeric: '931' },
  { code: 'CUP', name: 'Cuban Peso', symbol: '$MN', numeric: '192' },
  { code: 'CVE', name: 'Cabo Verde Escudo', symbol: 'Esc', numeric: '132' },
  { code: 'CZK', name: 'Czech Koruna', symbol: 'Kč', numeric: '203' },

  // ---------------------------------------------------------------------------
  // D
  // ---------------------------------------------------------------------------
  { code: 'DJF', name: 'Djibouti Franc', symbol: 'Fdj', numeric: '262' },
  { code: 'DKK', name: 'Danish Krone', symbol: 'kr', numeric: '208' },
  { code: 'DOP', name: 'Dominican Peso', symbol: 'RD$', numeric: '214' },
  { code: 'DZD', name: 'Algerian Dinar', symbol: 'د.ج', numeric: '012' },

  // ---------------------------------------------------------------------------
  // E
  // ---------------------------------------------------------------------------
  { code: 'EGP', name: 'Egyptian Pound', symbol: 'E£', numeric: '818' },
  { code: 'ERN', name: 'Eritrean Nakfa', symbol: 'Nfk', numeric: '232' },
  { code: 'ETB', name: 'Ethiopian Birr', symbol: 'Br', numeric: '230' },
  { code: 'EUR', name: 'Euro', symbol: '€', numeric: '978' },

  // ---------------------------------------------------------------------------
  // F
  // ---------------------------------------------------------------------------
  { code: 'FJD', name: 'Fiji Dollar', symbol: 'FJ$', numeric: '242' },
  { code: 'FKP', name: 'Falkland Islands Pound', symbol: '£', numeric: '238' },

  // ---------------------------------------------------------------------------
  // G
  // ---------------------------------------------------------------------------
  { code: 'GBP', name: 'Pound Sterling', symbol: '£', numeric: '826' },
  { code: 'GEL', name: 'Georgian Lari', symbol: '₾', numeric: '981' },
  { code: 'GHS', name: 'Ghana Cedi', symbol: 'GH₵', numeric: '936' },
  { code: 'GIP', name: 'Gibraltar Pound', symbol: '£', numeric: '292' },
  { code: 'GMD', name: 'Dalasi', symbol: 'D', numeric: '270' },
  { code: 'GNF', name: 'Guinean Franc', symbol: 'Fr', numeric: '324' },
  { code: 'GTQ', name: 'Quetzal', symbol: 'Q', numeric: '320' },
  { code: 'GYD', name: 'Guyana Dollar', symbol: 'G$', numeric: '328' },

  // ---------------------------------------------------------------------------
  // H
  // ---------------------------------------------------------------------------
  { code: 'HKD', name: 'Hong Kong Dollar', symbol: 'HK$', numeric: '344' },
  { code: 'HNL', name: 'Lempira', symbol: 'L', numeric: '340' },
  { code: 'HRK', name: 'Croatian Kuna', symbol: 'kn', numeric: '191' },
  { code: 'HTG', name: 'Gourde', symbol: 'G', numeric: '332' },
  { code: 'HUF', name: 'Forint', symbol: 'Ft', numeric: '348' },

  // ---------------------------------------------------------------------------
  // I
  // ---------------------------------------------------------------------------
  { code: 'IDR', name: 'Indonesian Rupiah', symbol: 'Rp', numeric: '360' },
  { code: 'ILS', name: 'New Israeli Sheqel', symbol: '₪', numeric: '376' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹', numeric: '356' },
  { code: 'IQD', name: 'Iraqi Dinar', symbol: 'ع.د', numeric: '368' },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼', numeric: '364' },
  { code: 'ISK', name: 'Iceland Krona', symbol: 'kr', numeric: '352' },

  // ---------------------------------------------------------------------------
  // J
  // ---------------------------------------------------------------------------
  { code: 'JMD', name: 'Jamaican Dollar', symbol: 'J$', numeric: '388' },
  { code: 'JOD', name: 'Jordanian Dinar', symbol: 'د.ا', numeric: '400' },
  { code: 'JPY', name: 'Yen', symbol: '¥', numeric: '392' },

  // ---------------------------------------------------------------------------
  // K
  // ---------------------------------------------------------------------------
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh', numeric: '404' },
  { code: 'KGS', name: 'Som', symbol: 'сом', numeric: '417' },
  { code: 'KHR', name: 'Riel', symbol: '៛', numeric: '116' },
  { code: 'KMF', name: 'Comorian Franc', symbol: 'Fr', numeric: '174' },
  { code: 'KPW', name: 'North Korean Won', symbol: '₩', numeric: '408' },
  { code: 'KRW', name: 'Won', symbol: '₩', numeric: '410' },
  { code: 'KWD', name: 'Kuwaiti Dinar', symbol: 'د.ك', numeric: '414' },
  { code: 'KYD', name: 'Cayman Islands Dollar', symbol: 'KY$', numeric: '136' },
  { code: 'KZT', name: 'Tenge', symbol: '₸', numeric: '398' },

  // ---------------------------------------------------------------------------
  // L
  // ---------------------------------------------------------------------------
  { code: 'LAK', name: 'Lao Kip', symbol: '₭', numeric: '418' },
  { code: 'LBP', name: 'Lebanese Pound', symbol: 'ل.ل', numeric: '422' },
  { code: 'LKR', name: 'Sri Lanka Rupee', symbol: 'Rs', numeric: '144' },
  { code: 'LRD', name: 'Liberian Dollar', symbol: 'L$', numeric: '430' },
  { code: 'LSL', name: 'Loti', symbol: 'L', numeric: '426' },
  { code: 'LYD', name: 'Libyan Dinar', symbol: 'ل.د', numeric: '434' },

  // ---------------------------------------------------------------------------
  // M
  // ---------------------------------------------------------------------------
  { code: 'MAD', name: 'Moroccan Dirham', symbol: 'د.م.', numeric: '504' },
  { code: 'MDL', name: 'Moldovan Leu', symbol: 'L', numeric: '498' },
  { code: 'MGA', name: 'Malagasy Ariary', symbol: 'Ar', numeric: '969' },
  { code: 'MKD', name: 'Denar', symbol: 'ден', numeric: '807' },
  { code: 'MMK', name: 'Kyat', symbol: 'K', numeric: '104' },
  { code: 'MNT', name: 'Tugrik', symbol: '₮', numeric: '496' },
  { code: 'MOP', name: 'Macanese Pataca', symbol: 'MOP$', numeric: '446' },
  { code: 'MRU', name: 'Ouguiya', symbol: 'UM', numeric: '929' },
  { code: 'MUR', name: 'Mauritius Rupee', symbol: 'Rs', numeric: '480' },
  { code: 'MVR', name: 'Rufiyaa', symbol: 'Rf', numeric: '462' },
  { code: 'MWK', name: 'Malawi Kwacha', symbol: 'MK', numeric: '454' },
  { code: 'MXN', name: 'Mexican Peso', symbol: 'MX$', numeric: '484' },
  { code: 'MXV', name: 'Mexican Unidad de Inversion', symbol: 'MXV', numeric: '979' },
  { code: 'MYR', name: 'Malaysian Ringgit', symbol: 'RM', numeric: '458' },
  { code: 'MZN', name: 'Mozambique Metical', symbol: 'MT', numeric: '943' },

  // ---------------------------------------------------------------------------
  // N
  // ---------------------------------------------------------------------------
  { code: 'NAD', name: 'Namibia Dollar', symbol: 'N$', numeric: '516' },
  { code: 'NGN', name: 'Naira', symbol: '₦', numeric: '566' },
  { code: 'NIO', name: 'Cordoba Oro', symbol: 'C$', numeric: '558' },
  { code: 'NOK', name: 'Norwegian Krone', symbol: 'kr', numeric: '578' },
  { code: 'NPR', name: 'Nepalese Rupee', symbol: 'Rs', numeric: '524' },
  { code: 'NZD', name: 'New Zealand Dollar', symbol: 'NZ$', numeric: '554' },

  // ---------------------------------------------------------------------------
  // O
  // ---------------------------------------------------------------------------
  { code: 'OMR', name: 'Rial Omani', symbol: 'ر.ع.', numeric: '512' },

  // ---------------------------------------------------------------------------
  // P
  // ---------------------------------------------------------------------------
  { code: 'PAB', name: 'Balboa', symbol: 'B/.', numeric: '590' },
  { code: 'PEN', name: 'Sol', symbol: 'S/', numeric: '604' },
  { code: 'PGK', name: 'Kina', symbol: 'K', numeric: '598' },
  { code: 'PHP', name: 'Philippine Peso', symbol: '₱', numeric: '608' },
  { code: 'PKR', name: 'Pakistan Rupee', symbol: 'Rs', numeric: '586' },
  { code: 'PLN', name: 'Zloty', symbol: 'zł', numeric: '985' },
  { code: 'PYG', name: 'Guarani', symbol: '₲', numeric: '600' },

  // ---------------------------------------------------------------------------
  // Q
  // ---------------------------------------------------------------------------
  { code: 'QAR', name: 'Qatari Rial', symbol: 'ر.ق', numeric: '634' },

  // ---------------------------------------------------------------------------
  // R
  // ---------------------------------------------------------------------------
  { code: 'RON', name: 'Romanian Leu', symbol: 'lei', numeric: '946' },
  { code: 'RSD', name: 'Serbian Dinar', symbol: 'din', numeric: '941' },
  { code: 'RUB', name: 'Russian Ruble', symbol: '₽', numeric: '643' },
  { code: 'RWF', name: 'Rwanda Franc', symbol: 'Fr', numeric: '646' },

  // ---------------------------------------------------------------------------
  // S
  // ---------------------------------------------------------------------------
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'ر.س', numeric: '682' },
  { code: 'SBD', name: 'Solomon Islands Dollar', symbol: 'SI$', numeric: '090' },
  { code: 'SCR', name: 'Seychelles Rupee', symbol: 'Rs', numeric: '690' },
  { code: 'SDG', name: 'Sudanese Pound', symbol: 'ج.س.', numeric: '938' },
  { code: 'SEK', name: 'Swedish Krona', symbol: 'kr', numeric: '752' },
  { code: 'SGD', name: 'Singapore Dollar', symbol: 'S$', numeric: '702' },
  { code: 'SHP', name: 'Saint Helena Pound', symbol: '£', numeric: '654' },
  { code: 'SLE', name: 'Leone', symbol: 'Le', numeric: '925' },
  { code: 'SLL', name: 'Sierra Leonean Leone', symbol: 'Le', numeric: '694' },
  { code: 'SOS', name: 'Somali Shilling', symbol: 'Sh', numeric: '706' },
  { code: 'SRD', name: 'Surinam Dollar', symbol: 'SRD', numeric: '968' },
  { code: 'SSP', name: 'South Sudanese Pound', symbol: '£', numeric: '728' },
  { code: 'STN', name: 'Dobra', symbol: 'Db', numeric: '930' },
  { code: 'SVC', name: 'El Salvador Colon', symbol: '₡', numeric: '222' },
  { code: 'SYP', name: 'Syrian Pound', symbol: 'ل.س', numeric: '760' },
  { code: 'SZL', name: 'Lilangeni', symbol: 'L', numeric: '748' },

  // ---------------------------------------------------------------------------
  // T
  // ---------------------------------------------------------------------------
  { code: 'THB', name: 'Baht', symbol: '฿', numeric: '764' },
  { code: 'TJS', name: 'Somoni', symbol: 'SM', numeric: '972' },
  { code: 'TMT', name: 'Turkmenistan Manat', symbol: 'm', numeric: '934' },
  { code: 'TND', name: 'Tunisian Dinar', symbol: 'د.ت', numeric: '788' },
  { code: 'TOP', name: "Pa'anga", symbol: 'T$', numeric: '776' },
  { code: 'TRY', name: 'Turkish Lira', symbol: '₺', numeric: '949' },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', symbol: 'TT$', numeric: '780' },
  { code: 'TWD', name: 'New Taiwan Dollar', symbol: 'NT$', numeric: '901' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh', numeric: '834' },

  // ---------------------------------------------------------------------------
  // U
  // ---------------------------------------------------------------------------
  { code: 'UAH', name: 'Hryvnia', symbol: '₴', numeric: '980' },
  { code: 'UGX', name: 'Uganda Shilling', symbol: 'USh', numeric: '800' },
  { code: 'USD', name: 'US Dollar', symbol: '$', numeric: '840' },
  { code: 'USN', name: 'US Dollar (Next day)', symbol: '$', numeric: '997' },
  { code: 'UYI', name: 'Uruguay Peso en Unidades Indexadas', symbol: 'UYI', numeric: '940' },
  { code: 'UYU', name: 'Peso Uruguayo', symbol: 'UYU$', numeric: '858' },
  { code: 'UYW', name: 'Unidad Previsional', symbol: 'UYW', numeric: '927' },
  { code: 'UZS', name: 'Uzbekistan Sum', symbol: 'сўм', numeric: '860' },

  // ---------------------------------------------------------------------------
  // V
  // ---------------------------------------------------------------------------
  { code: 'VED', name: 'Bolívar Digital', symbol: 'Bs.D.', numeric: '926' },
  { code: 'VES', name: 'Bolívar Soberano', symbol: 'Bs.S.', numeric: '928' },
  { code: 'VND', name: 'Dong', symbol: '₫', numeric: '704' },
  { code: 'VUV', name: 'Vatu', symbol: 'Vt', numeric: '548' },

  // ---------------------------------------------------------------------------
  // W
  // ---------------------------------------------------------------------------
  { code: 'WST', name: 'Tala', symbol: 'WS$', numeric: '882' },

  // ---------------------------------------------------------------------------
  // X (Supranational / Precious metals / Fund codes)
  // ---------------------------------------------------------------------------
  { code: 'XAF', name: 'CFA Franc BEAC', symbol: 'Fr', numeric: '950' },
  { code: 'XAG', name: 'Silver', symbol: 'Ag', numeric: '961' },
  { code: 'XAU', name: 'Gold', symbol: 'Au', numeric: '959' },
  { code: 'XBA', name: 'Bond Markets Unit European Composite Unit', symbol: 'XBA', numeric: '955' },
  { code: 'XBB', name: 'Bond Markets Unit European Monetary Unit', symbol: 'XBB', numeric: '956' },
  { code: 'XBC', name: 'Bond Markets Unit European Unit of Account 9', symbol: 'XBC', numeric: '957' },
  { code: 'XBD', name: 'Bond Markets Unit European Unit of Account 17', symbol: 'XBD', numeric: '958' },
  { code: 'XCD', name: 'East Caribbean Dollar', symbol: 'EC$', numeric: '951' },
  { code: 'XDR', name: 'Special Drawing Rights', symbol: 'XDR', numeric: '960' },
  { code: 'XOF', name: 'CFA Franc BCEAO', symbol: 'Fr', numeric: '952' },
  { code: 'XPD', name: 'Palladium', symbol: 'Pd', numeric: '964' },
  { code: 'XPF', name: 'CFP Franc', symbol: 'Fr', numeric: '953' },
  { code: 'XPT', name: 'Platinum', symbol: 'Pt', numeric: '962' },
  { code: 'XSU', name: 'Sucre', symbol: 'Sucre', numeric: '994' },
  { code: 'XTS', name: 'Codes specifically reserved for testing', symbol: 'XTS', numeric: '963' },
  { code: 'XUA', name: 'ADB Unit of Account', symbol: 'XUA', numeric: '965' },
  { code: 'XXX', name: 'The codes assigned for transactions where no currency is involved', symbol: 'XXX', numeric: '999' },

  // ---------------------------------------------------------------------------
  // Y
  // ---------------------------------------------------------------------------
  { code: 'YER', name: 'Yemeni Rial', symbol: '﷼', numeric: '886' },

  // ---------------------------------------------------------------------------
  // Z
  // ---------------------------------------------------------------------------
  { code: 'ZAR', name: 'Rand', symbol: 'R', numeric: '710' },
  { code: 'ZMW', name: 'Zambian Kwacha', symbol: 'ZK', numeric: '967' },
  { code: 'ZWL', name: 'Zimbabwe Dollar', symbol: 'ZWL$', numeric: '932' },

  // ---------------------------------------------------------------------------
  // Commonly referenced historic currencies
  // ---------------------------------------------------------------------------
  { code: 'BEF', name: 'Belgian Franc (historic)', symbol: 'Fr', numeric: '056' },
  { code: 'BYR', name: 'Belarusian Ruble (historic)', symbol: 'Br', numeric: '974' },
  { code: 'CSD', name: 'Serbian Dinar (historic)', symbol: 'din', numeric: '891' },
  { code: 'EEK', name: 'Estonian Kroon (historic)', symbol: 'kr', numeric: '233' },
  { code: 'FIM', name: 'Finnish Markka (historic)', symbol: 'mk', numeric: '246' },
  { code: 'GRD', name: 'Greek Drachma (historic)', symbol: '₯', numeric: '300' },
  { code: 'IEP', name: 'Irish Pound (historic)', symbol: '£', numeric: '372' },
  { code: 'ITL', name: 'Italian Lira (historic)', symbol: '₤', numeric: '380' },
  { code: 'LTL', name: 'Lithuanian Litas (historic)', symbol: 'Lt', numeric: '440' },
  { code: 'LVL', name: 'Latvian Lats (historic)', symbol: 'Ls', numeric: '428' },
  { code: 'MRO', name: 'Mauritanian Ouguiya (historic)', symbol: 'UM', numeric: '478' },
  { code: 'NLG', name: 'Netherlands Guilder (historic)', symbol: 'ƒ', numeric: '528' },
  { code: 'PTE', name: 'Portuguese Escudo (historic)', symbol: 'Esc', numeric: '620' },
  { code: 'ROL', name: 'Romanian Leu (historic)', symbol: 'lei', numeric: '642' },
  { code: 'RUR', name: 'Russian Ruble (historic)', symbol: '₽', numeric: '810' },
  { code: 'SKK', name: 'Slovak Koruna (historic)', symbol: 'Sk', numeric: '703' },
  { code: 'SRG', name: 'Surinam Guilder (historic)', symbol: 'ƒ', numeric: '740' },
  { code: 'STD', name: 'Sao Tome and Principe Dobra (historic)', symbol: 'Db', numeric: '678' },
  { code: 'VEF', name: 'Venezuelan Bolívar (historic)', symbol: 'Bs.F.', numeric: '937' },
  { code: 'VEB', name: 'Venezuelan Bolívar (historic)', symbol: 'Bs', numeric: '862' },
  { code: 'YUM', name: 'Yugoslavian New Dinar (historic)', symbol: 'din', numeric: '891' },
  { code: 'ZWD', name: 'Zimbabwean Dollar (historic)', symbol: 'Z$', numeric: '716' },
  { code: 'TRL', name: 'Turkish Lira (historic)', symbol: '₤', numeric: '792' },
  { code: 'GHC', name: 'Ghanaian Cedi (historic)', symbol: '₵', numeric: '288' },
  { code: 'DEM', name: 'Deutsche Mark (historic)', symbol: 'DM', numeric: '276' },
  { code: 'FRF', name: 'French Franc (historic)', symbol: 'Fr', numeric: '250' },
  { code: 'ESP', name: 'Spanish Peseta (historic)', symbol: 'Pts', numeric: '724' },
  { code: 'ATS', name: 'Austrian Schilling (historic)', symbol: 'öS', numeric: '040' },
  { code: 'BGL', name: 'Bulgarian Lev (historic)', symbol: 'лв', numeric: '100' },
  { code: 'CYP', name: 'Cyprus Pound (historic)', symbol: '£', numeric: '196' },
  { code: 'EEK', name: 'Estonian Kroon (historic)', symbol: 'kr', numeric: '233' },
  { code: 'LTL', name: 'Lithuanian Litas (historic)', symbol: 'Lt', numeric: '440' },
  { code: 'MTL', name: 'Maltese Lira (historic)', symbol: 'Lm', numeric: '470' },
  { code: 'SIT', name: 'Slovenian Tolar (historic)', symbol: 'SIT', numeric: '705' },
  { code: 'VAL', name: 'Vatican Lira (historic)', symbol: '₤', numeric: '336' },
  { code: 'SML', name: 'San Marino Lira (historic)', symbol: '₤', numeric: '674' },
] as const;

/** Pre-computed Set of currency codes for O(1) lookups */
const CURRENCY_SET = new Set<string>(CURRENCIES.map(c => c.code));

/**
 * Check whether a given string is a valid ISO 4217 currency code.
 *
 * @param code - The 3-letter currency code to validate (e.g., "USD", "EUR", "JPY")
 * @returns `true` if the code is a recognized ISO 4217 currency code
 *
 * @example
 * ```ts
 * isValidCurrencyCode('USD');   // true
 * isValidCurrencyCode('EUR');   // true
 * isValidCurrencyCode('XYZ');   // false
 * isValidCurrencyCode('usd');   // false (case-sensitive)
 * ```
 */
export function isValidCurrencyCode(code: string): boolean {
  return CURRENCY_SET.has(code);
}
