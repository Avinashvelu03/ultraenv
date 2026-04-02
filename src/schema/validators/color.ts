// =============================================================================
// ultraenv — Color Validator
// Validates hex (#RGB, #RRGGBB, #RRGGBBAA), rgb(), rgba(), hsl(), hsla(), named.
// =============================================================================

import { SchemaBuilder, ParseResult } from '../builder.js';

export interface ColorValidatorOptions {
  /** Which formats to accept (default: all) */
  formats?: readonly ('hex' | 'rgb' | 'rgba' | 'hsl' | 'hsla' | 'named')[];
  /** Whether to accept 3-digit hex (#RGB) — default: true */
  allowShortHex?: boolean;
  /** Whether to accept 8-digit hex with alpha (#RRGGBBAA) — default: true */
  allowAlpha?: boolean;
}

// Named CSS colors (common subset)
const NAMED_COLORS = new Set([
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque',
  'black', 'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood',
  'cadetblue', 'chartreuse', 'chocolate', 'coral', 'cornflowerblue', 'cornsilk',
  'crimson', 'cyan', 'darkblue', 'darkcyan', 'darkgoldenrod', 'darkgray',
  'darkgreen', 'darkkhaki', 'darkmagenta', 'darkolivegreen', 'darkorange',
  'darkorchid', 'darkred', 'darksalmon', 'darkseagreen', 'darkslateblue',
  'darkslategray', 'darkturquoise', 'darkviolet', 'deeppink', 'deepskyblue',
  'dimgray', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen', 'fuchsia',
  'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow',
  'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
  'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral',
  'lightcyan', 'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightpink',
  'lightsalmon', 'lightseagreen', 'lightskyblue', 'lightslategray',
  'lightsteelblue', 'lightyellow', 'lime', 'limegreen', 'linen', 'magenta',
  'maroon', 'mediumaquamarine', 'mediumblue', 'mediumorchid', 'mediumpurple',
  'mediumseagreen', 'mediumslateblue', 'mediumspringgreen', 'mediumturquoise',
  'mediumvioletred', 'midnightblue', 'mintcream', 'mistyrose', 'moccasin',
  'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange', 'orangered',
  'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
  'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple',
  'rebeccapurple', 'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon',
  'sandybrown', 'seagreen', 'seashell', 'sienna', 'silver', 'skyblue',
  'slateblue', 'slategray', 'snow', 'springgreen', 'steelblue', 'tan', 'teal',
  'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white', 'whitesmoke',
  'yellow', 'yellowgreen',
]);

const HEX_3_REGEX = /^#([0-9a-fA-F]{3})$/;
const HEX_6_REGEX = /^#([0-9a-fA-F]{6})$/;
const HEX_8_REGEX = /^#([0-9a-fA-F]{8})$/;
const RGB_REGEX = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([0-9.]+)\s*)?\)$/;
const HSL_REGEX = /^hsla?\(\s*(\d{1,3})\s*,\s*([0-9.]+)%\s*,\s*([0-9.]+)%\s*(?:,\s*([0-9.]+)\s*)?\)$/;

function parseAndValidateColor(raw: string, opts: ColorValidatorOptions): ParseResult<string> {
  const trimmed = raw.trim();
  const formats = opts.formats;
  const allowShortHex = opts.allowShortHex ?? true;
  const allowAlpha = opts.allowAlpha ?? true;

  // Check if specific formats are restricted
  const allowHex = formats === undefined || formats.includes('hex');
  const allowRgb = formats === undefined || formats.includes('rgb') || formats.includes('rgba');
  const allowHsl = formats === undefined || formats.includes('hsl') || formats.includes('hsla');
  const allowNamed = formats === undefined || formats.includes('named');

  if (allowHex) {
    // 8-digit hex
    if (allowAlpha && HEX_8_REGEX.test(trimmed)) {
      return { success: true, value: trimmed };
    }
    // 6-digit hex
    if (HEX_6_REGEX.test(trimmed)) {
      return { success: true, value: trimmed };
    }
    // 3-digit hex
    if (allowShortHex && HEX_3_REGEX.test(trimmed)) {
      return { success: true, value: trimmed };
    }
  }

  if (allowRgb && RGB_REGEX.test(trimmed)) {
    const match = trimmed.match(RGB_REGEX);
    if (match) {
      const r = Number(match[1]);
      const g = Number(match[2]);
      const b = Number(match[3]);
      const a = match[4] !== undefined ? Number(match[4]) : 1;
      if (r > 255 || g > 255 || b > 255) {
        return { success: false, error: `RGB values must be 0-255` };
      }
      if (a < 0 || a > 1) {
        return { success: false, error: `RGBA alpha must be between 0 and 1` };
      }
    }
    return { success: true, value: trimmed };
  }

  if (allowHsl && HSL_REGEX.test(trimmed)) {
    const match = trimmed.match(HSL_REGEX);
    if (match) {
      const h = Number(match[1]);
      const s = Number(match[2]);
      const l = Number(match[3]);
      const a = match[4] !== undefined ? Number(match[4]) : 1;
      if (h > 360) {
        return { success: false, error: `HSL hue must be 0-360` };
      }
      if (s > 100 || l > 100) {
        return { success: false, error: `HSL saturation/lightness must be 0-100%` };
      }
      if (a < 0 || a > 1) {
        return { success: false, error: `HSLA alpha must be between 0 and 1` };
      }
    }
    return { success: true, value: trimmed };
  }

  if (allowNamed && NAMED_COLORS.has(trimmed.toLowerCase())) {
    return { success: true, value: trimmed };
  }

  return {
    success: false,
    error: `"${trimmed}" is not a valid color. Supported formats: hex (#RGB, #RRGGBB), rgb(), rgba(), hsl(), hsla(), or named colors`,
  };
}

/** Create a color schema builder */
export function createColorSchema(opts?: ColorValidatorOptions): SchemaBuilder<string> {
  const options = opts ?? {};
  const parser = (raw: string): ParseResult<string> => parseAndValidateColor(raw, options);
  return new SchemaBuilder<string>(parser, 'color');
}
