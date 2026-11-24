// SPDX-License-Identifier: AGPL-3.0-only
const palettes = {
  dawn: ['#231c3c','#c47974','#563d67'],
  day: ['#142f55','#5194bd','#254666'],
  dusk: ['#2d1b39','#ad6156','#62364d'],
  night: ['#0a1029','#434a8a','#1b254b'],
} as const;

/** Four local clock phases. These do not require a location or weather service. */
export function daylightPalette(hour: number) {
  if (hour >= 5 && hour < 8) return palettes.dawn;
  if (hour >= 8 && hour < 17) return palettes.day;
  if (hour >= 17 && hour < 20) return palettes.dusk;
  return palettes.night;
}
