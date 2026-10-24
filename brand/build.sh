#!/usr/bin/env bash
# Regenerates brand/svg/* from the two hand-drawn sources in brand/src/.
# Then run export.ps1 (Windows, needs Chrome or Edge) to render brand/png/*.
set -euo pipefail
cd "$(dirname "$0")"
G='<linearGradient id="pc-g" x1="16" y1="10" x2="88" y2="92" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#22D3EE"/><stop offset=".5" stop-color="#3B82F6"/><stop offset="1" stop-color="#7C5CFF"/></linearGradient>'
BG='<radialGradient id="pc-bg" cx="50%" cy="38%" r="75%"><stop offset="0" stop-color="#1A2B55"/><stop offset=".6" stop-color="#0E1530"/><stop offset="1" stop-color="#080C1C"/></radialGradient>'
S=$(cat src/symbol.svgfrag)
word() { sed "s/currentColor/$1/" src/word.svgfrag; }
# The lockup: the symbol IS the "p" of "portalcast" (owner, 2026-10-24): its bowl on the letters'
# middle line, a little bigger than them, its stem down like a p; then "ortalcast" (the word without
# its own p glyph). Frame: viewBox "8 24 398 96".
rest() { word "$1" | sed -E "s#<path d=\"M0 24 V76\"/><circle cx=\"16\" cy=\"40\" r=\"16\"/>##"; }
lockup() { echo "<g transform=\"translate(40 30) scale(1.1)\"><g transform=\"translate(0 40) scale(.84) translate(-46 -52)\">$S</g><g transform=\"translate(-12 0)\">$(rest "$1")</g></g>"; }
h='<svg xmlns="http://www.w3.org/2000/svg"'
mkdir -p svg
echo "$h viewBox=\"16 8 74 88\"><title>PortalCast</title><defs>$G</defs>$S</svg>" > svg/portalcast-symbol.svg
echo "$h viewBox=\"0 0 108 108\"><title>PortalCast</title><defs>$G$BG</defs><rect width=\"108\" height=\"108\" rx=\"24\" fill=\"url(#pc-bg)\"/><g transform=\"translate(1.5 2)\">$S</g></svg>" > svg/portalcast-icon.svg
echo "$h viewBox=\"0 0 108 108\"><title>PortalCast</title><defs>$G$BG</defs><rect width=\"108\" height=\"108\" fill=\"url(#pc-bg)\"/><g transform=\"translate(54 54) scale(.62) translate(-53 -52)\">$S</g></svg>" > svg/portalcast-icon-maskable.svg
echo "$h viewBox=\"8 24 398 96\"><title>PortalCast</title><defs>$G</defs>$(lockup '#EAF2FF')</svg>" > svg/portalcast-logo.svg
echo "$h viewBox=\"8 24 398 96\"><title>PortalCast</title><defs>$G</defs>$(lockup '#0F172A')</svg>" > svg/portalcast-logo-on-light.svg
echo "$h viewBox=\"-6 0 348 84\"><title>PortalCast</title>$(word '#EAF2FF')</svg>" > svg/portalcast-wordmark.svg
echo "$h viewBox=\"0 0 640 360\"><title>PortalCast</title><defs>$G<radialGradient id=\"pc-bb\" cx=\"30%\" cy=\"35%\" r=\"90%\"><stop offset=\"0\" stop-color=\"#1A2B55\"/><stop offset=\".55\" stop-color=\"#0E1530\"/><stop offset=\"1\" stop-color=\"#070A18\"/></radialGradient></defs><rect width=\"640\" height=\"360\" fill=\"url(#pc-bb)\"/><g transform=\"translate(81 122) scale(1.2)\"><g transform=\"translate(-8 -24)\">$(lockup '#EAF2FF')</g></g></svg>" > svg/portalcast-tv-banner.svg
echo "svg/ regenerated"
