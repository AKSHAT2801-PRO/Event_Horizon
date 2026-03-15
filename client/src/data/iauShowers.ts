// IAU Meteor Data Centre — major established showers with geocentric radiant & velocity
export interface IAUShower {
  code: string;
  name: string;
  ra: number;   // Right Ascension (degrees)
  dec: number;  // Declination (degrees)
  vg: number;   // Geocentric velocity (km/s)
  parentBody: string;
  peakSolarLong: number; // Solar longitude of peak (degrees)
}

export const IAU_SHOWERS: IAUShower[] = [
  { code: "QUA", name: "Quadrantids", ra: 230, dec: 49, vg: 41, parentBody: "2003 EH1", peakSolarLong: 283.16 },
  { code: "LYR", name: "Lyrids", ra: 271, dec: 34, vg: 49, parentBody: "C/1861 G1 Thatcher", peakSolarLong: 32.32 },
  { code: "ETA", name: "Eta Aquariids", ra: 338, dec: -1, vg: 66, parentBody: "1P/Halley", peakSolarLong: 45.5 },
  { code: "SDA", name: "S. Delta Aquariids", ra: 340, dec: -16, vg: 41, parentBody: "96P/Machholz", peakSolarLong: 125 },
  { code: "PER", name: "Perseids", ra: 48, dec: 58, vg: 59, parentBody: "109P/Swift-Tuttle", peakSolarLong: 140.0 },
  { code: "DRA", name: "Draconids", ra: 262, dec: 54, vg: 20, parentBody: "21P/Giacobini-Zinner", peakSolarLong: 195.4 },
  { code: "ORI", name: "Orionids", ra: 95, dec: 16, vg: 67, parentBody: "1P/Halley", peakSolarLong: 208 },
  { code: "LEO", name: "Leonids", ra: 152, dec: 22, vg: 71, parentBody: "55P/Tempel-Tuttle", peakSolarLong: 235.27 },
  { code: "GEM", name: "Geminids", ra: 112, dec: 33, vg: 35, parentBody: "3200 Phaethon", peakSolarLong: 262.2 },
  { code: "URS", name: "Ursids", ra: 217, dec: 76, vg: 33, parentBody: "8P/Tuttle", peakSolarLong: 270.7 },
];

// Angular distance between two points on celestial sphere (degrees)
export function angularDistance(ra1: number, dec1: number, ra2: number, dec2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dRa = toRad(ra2 - ra1);
  const d1 = toRad(dec1);
  const d2 = toRad(dec2);
  const a = Math.sin(dRa / 2) ** 2 + Math.cos(d1) * Math.cos(d2) * Math.sin((dec2 - dec1) * Math.PI / 360) ** 2;
  // Use haversine
  const h = Math.sin(toRad((dec2 - dec1) / 2)) ** 2 + Math.cos(d1) * Math.cos(d2) * Math.sin(toRad((ra2 - ra1) / 2)) ** 2;
  return (2 * Math.asin(Math.sqrt(Math.min(1, h)))) * (180 / Math.PI);
}
