// =============================================================================
// ultraenv — ASCII Art Banner
// Displays the ULTRAENV CLI banner and related branding.
// =============================================================================

import { VERSION } from '../../core/constants.js';

// -----------------------------------------------------------------------------
// Banner
// -----------------------------------------------------------------------------

/**
 * Display the ULTRAENV ASCII art banner.
 *
 * @returns The banner string with ANSI formatting
 */
export function showBanner(): string {
  return `
  ╔═══════════════════════════════════════════════════╗
  ║                                                   ║
  ║     ██████╗ ██████╗ ███████╗██╗  ██╗██╗  ██╗     ║
  ║    ██╔════╝██╔═══██╗██╔════╝██║ ██╔╝██║ ██╔╝     ║
  ║    ██║     ██║   ██║███████╗█████╔╝ █████╔╝      ║
  ║    ██║     ██║   ██║╚════██║██╔═██╗ ██╔═██╗      ║
  ║    ╚██████╗╚██████╔╝███████║██║  ██╗██║  ██╗     ║
  ║     ╚═════╝ ╚═════╝ ╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝     ║
  ║                                                   ║
  ║   The Ultimate Environment Variable Manager        ║
  ║   v${VERSION.padEnd(42)}║
  ╚═══════════════════════════════════════════════════╝`.trimStart();
}

// -----------------------------------------------------------------------------
// Version
// -----------------------------------------------------------------------------

/**
 * Display the ultraenv version string.
 *
 * @returns The version string
 */
export function showVersion(): string {
  return `ultraenv v${VERSION}`;
}

// -----------------------------------------------------------------------------
// Welcome
// -----------------------------------------------------------------------------

const TAGLINE = 'The Ultimate Environment Variable Manager';

/**
 * Display the full welcome message (banner + tagline + version).
 *
 * @returns The complete welcome string
 */
export function showWelcome(): string {
  return `${showBanner()}\n  ${TAGLINE}\n`;
}
