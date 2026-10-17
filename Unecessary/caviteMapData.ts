/*
 * UNNECESSARY / DEPRECATED:
 * Superseded by Frontend/src/data/mapData.ts which supports nationwide
 * Philippine mapping, geocoding, and initial badges across all provinces and cities.
 *
/**
 * 100% Self-Contained Local Cavite Municipalities & Geocoding Engine
 * Supports High-Precision Street Mapping, Block Interpolation & Subdivision Centroids
 * /

export interface GeoLocation {
  lat: number;
  lng: number;
}

export type GeocodeMethod =
  | "exact_street"
  | "block_interpolation"
  | "subdivision_centroid"
  | "barangay_centroid"
  | "city_centroid";

export interface ResolvedGeocodeResult {
  lat: number;
  lng: number;
  method: GeocodeMethod;
  methodLabel: string;
  matchedName: string;
  accuracyEstimateMeters: number;
}

export interface MunicipalityBoundary {
  name: string;
  center: [number, number];
  coordinates: [number, number][];
}

// Local Cavite Municipality Polygons & Centers (Offline Vector Data)
export const CAVITE_MUNICIPALITIES: Record<string, MunicipalityBoundary> = {
  "Trece Martires": {
    name: "Trece Martires City (Governor's Drive)",
    center: [14.2825, 120.8667],
    coordinates: [
      [14.260, 120.840],
      [14.295, 120.845],
      [14.305, 120.885],
      [14.268, 120.890],
      [14.260, 120.840],
    ],
  },
  "Indang": {
    name: "Indang",
    center: [14.1953, 120.8769],
    coordinates: [
      [14.170, 120.850],
      [14.225, 120.855],
      [14.230, 120.900],
      [14.175, 120.895],
      [14.170, 120.850],
    ],
  },
  "DasmariÃ±as": {
    name: "DasmariÃ±as City",
    center: [14.3294, 120.9367],
    coordinates: [
      [14.290, 120.910],
      [14.355, 120.915],
      [14.360, 120.965],
      [14.300, 120.960],
      [14.290, 120.910],
    ],
  },
  "Bacoor": {
    name: "Bacoor City",
    center: [14.4624, 120.9645],
    coordinates: [
      [14.430, 120.940],
      [14.485, 120.945],
      [14.480, 120.985],
      [14.425, 120.980],
      [14.430, 120.940],
    ],
  },
  "Imus": {
    name: "Imus City",
    center: [14.4296, 120.9367],
    coordinates: [
      [14.390, 120.915],
      [14.450, 120.920],
      [14.445, 120.960],
      [14.385, 120.955],
      [14.390, 120.915],
    ],
  },
  "General Trias": {
    name: "General Trias City",
    center: [14.3867, 120.8812],
    coordinates: [
      [14.340, 120.855],
      [14.415, 120.860],
      [14.410, 120.910],
      [14.335, 120.905],
      [14.340, 120.855],
    ],
  },
  "Tagaytay": {
    name: "Tagaytay City",
    center: [14.1153, 120.9621],
    coordinates: [
      [14.090, 120.920],
      [14.140, 120.925],
      [14.145, 120.995],
      [14.095, 120.990],
      [14.090, 120.920],
    ],
  },
  "Silang": {
    name: "Silang",
    center: [14.2306, 120.9748],
    coordinates: [
      [14.190, 120.940],
      [14.260, 120.945],
      [14.255, 120.995],
      [14.185, 120.990],
      [14.190, 120.940],
    ],
  },
  "Naic": {
    name: "Naic",
    center: [14.3167, 120.7667],
    coordinates: [
      [14.280, 120.740],
      [14.345, 120.745],
      [14.350, 120.800],
      [14.285, 120.795],
      [14.280, 120.740],
    ],
  },
  "Kawit": {
    name: "Kawit",
    center: [14.4444, 120.9028],
    coordinates: [
      [14.425, 120.885],
      [14.460, 120.890],
      [14.455, 120.925],
      [14.420, 120.920],
      [14.425, 120.885],
    ],
  },
  "Rosario": {
    name: "Rosario",
    center: [14.4167, 120.8500],
    coordinates: [
      [14.400, 120.835],
      [14.435, 120.840],
      [14.430, 120.870],
      [14.395, 120.865],
      [14.400, 120.835],
    ],
  },
  "Tanza": {
    name: "Tanza",
    center: [14.3944, 120.8542],
    coordinates: [
      [14.360, 120.830],
      [14.410, 120.835],
      [14.405, 120.885],
      [14.355, 120.880],
      [14.360, 120.830],
    ],
  },
  "Carmona": {
    name: "Carmona",
    center: [14.3167, 121.0500],
    coordinates: [
      [14.295, 121.030],
      [14.335, 121.035],
      [14.340, 121.075],
      [14.300, 121.070],
      [14.295, 121.030],
    ],
  },
  "Alfonso": {
    name: "Alfonso",
    center: [14.1383, 120.8533],
    coordinates: [
      [14.100, 120.820],
      [14.165, 120.825],
      [14.160, 120.880],
      [14.095, 120.875],
      [14.100, 120.820],
    ],
  },
  "Amadeo": {
    name: "Amadeo",
    center: [14.1706, 120.9228],
    coordinates: [
      [14.145, 120.900],
      [14.195, 120.905],
      [14.190, 120.945],
      [14.140, 120.940],
      [14.145, 120.900],
    ],
  },
  "Cavite City": {
    name: "Cavite City",
    center: [14.4833, 120.9000],
    coordinates: [
      [14.460, 120.880],
      [14.500, 120.885],
      [14.495, 120.920],
      [14.455, 120.915],
      [14.460, 120.880],
    ],
  },
  "General Emilio Aguinaldo": {
    name: "General Emilio Aguinaldo (Bailen)",
    center: [14.1833, 120.7958],
    coordinates: [
      [14.155, 120.770],
      [14.205, 120.775],
      [14.200, 120.820],
      [14.150, 120.815],
      [14.155, 120.770],
    ],
  },
  "General Mariano Alvarez": {
    name: "General Mariano Alvarez (GMA)",
    center: [14.3000, 121.0000],
    coordinates: [
      [14.280, 120.985],
      [14.320, 120.990],
      [14.315, 121.020],
      [14.275, 121.015],
      [14.280, 120.985],
    ],
  },
  "Magallanes": {
    name: "Magallanes",
    center: [14.1894, 120.7556],
    coordinates: [
      [14.160, 120.725],
      [14.215, 120.730],
      [14.210, 120.780],
      [14.155, 120.775],
      [14.160, 120.725],
    ],
  },
  "Maragondon": {
    name: "Maragondon",
    center: [14.2750, 120.7389],
    coordinates: [
      [14.240, 120.700],
      [14.305, 120.705],
      [14.300, 120.770],
      [14.235, 120.765],
      [14.240, 120.700],
    ],
  },
  "Mendez": {
    name: "Mendez (Mendez-NuÃ±ez)",
    center: [14.1294, 120.9042],
    coordinates: [
      [14.110, 120.885],
      [14.150, 120.890],
      [14.145, 120.925],
      [14.105, 120.920],
      [14.110, 120.885],
    ],
  },
  "Noveleta": {
    name: "Noveleta",
    center: [14.4267, 120.8789],
    coordinates: [
      [14.410, 120.865],
      [14.440, 120.870],
      [14.435, 120.895],
      [14.405, 120.890],
      [14.410, 120.865],
    ],
  },
  "Ternate": {
    name: "Ternate",
    center: [14.2861, 120.7167],
    coordinates: [
      [14.260, 120.680],
      [14.310, 120.685],
      [14.305, 120.735],
      [14.255, 120.730],
      [14.260, 120.680],
    ],
  },
};

// Precise Street Directory for Barangay Lapidario (CHES 1 & CHES 2)
const CHES_2_STREETS: Record<string, { lat: number; lng: number; name: string }> = {
  fuschia: { lat: 14.27555, lng: 120.86135, name: "Fuschia Street, CHES Phase 2" },
  fuchsia: { lat: 14.27555, lng: 120.86135, name: "Fuschia Street, CHES Phase 2" },
  dayflower: { lat: 14.27520, lng: 120.86080, name: "Dayflower Street, CHES Phase 2" },
  hazel: { lat: 14.27680, lng: 120.86010, name: "Hazel Street, CHES Phase 2" },
  columbine: { lat: 14.27660, lng: 120.86040, name: "Columbine Street, CHES Phase 2" },
  geranium: { lat: 14.27640, lng: 120.86070, name: "Geranium Street, CHES Phase 2" },
  wistaria: { lat: 14.27620, lng: 120.86100, name: "Wistaria Street, CHES Phase 2" },
  wisteria: { lat: 14.27620, lng: 120.86100, name: "Wisteria Street, CHES Phase 2" },
  oceander: { lat: 14.27600, lng: 120.86130, name: "Oceander Street, CHES Phase 2" },
  oleander: { lat: 14.27600, lng: 120.86130, name: "Oleander Street, CHES Phase 2" },
  tulip: { lat: 14.27580, lng: 120.86160, name: "Tulip Street, CHES Phase 2" },
  magnolia: { lat: 14.27560, lng: 120.86190, name: "Magnolia Street, CHES Phase 2" },
  cosmos: { lat: 14.27540, lng: 120.86220, name: "Cosmos Street, CHES Phase 2" },
  carnation: { lat: 14.27520, lng: 120.86250, name: "Carnation Street, CHES Phase 2" },
  hyacinth: { lat: 14.27500, lng: 120.86280, name: "Hyacinth Street, CHES Phase 2" },
  dahlia: { lat: 14.27480, lng: 120.86310, name: "Dahlia Street, CHES Phase 2" },
  zinnia: { lat: 14.27460, lng: 120.86340, name: "Zinnia Street, CHES Phase 2" },
  "apple blossom": { lat: 14.27630, lng: 120.86180, name: "Apple Blossom Street, CHES Phase 2" },
  flamingo: { lat: 14.27442, lng: 120.86184, name: "Flamingo Street, CHES Phase 2" },
  marcin: { lat: 14.27690, lng: 120.86290, name: "Marcin's Avenue (Boundary CHES 1 & 2)" },
};

const CHES_1_STREETS: Record<string, { lat: number; lng: number; name: string }> = {
  rose: { lat: 14.27710, lng: 120.86480, name: "Rose Street, CHES Phase 1" },
  sampaguita: { lat: 14.27690, lng: 120.86520, name: "Sampaguita Street, CHES Phase 1" },
  camia: { lat: 14.27670, lng: 120.86560, name: "Camia Street, CHES Phase 1" },
  "ilang-ilang": { lat: 14.27650, lng: 120.86600, name: "Ilang-Ilang Street, CHES Phase 1" },
  ilang: { lat: 14.27650, lng: 120.86600, name: "Ilang-Ilang Street, CHES Phase 1" },
  orchid: { lat: 14.27630, lng: 120.86640, name: "Orchid Street, CHES Phase 1" },
  gumamela: { lat: 14.27610, lng: 120.86680, name: "Gumamela Street, CHES Phase 1" },
  jasmine: { lat: 14.27590, lng: 120.86720, name: "Jasmine Street, CHES Phase 1" },
  jasmin: { lat: 14.27590, lng: 120.86720, name: "Jasmine Street, CHES Phase 1" },
  everlasting: { lat: 14.27570, lng: 120.86760, name: "Everlasting Street, CHES Phase 1" },
  rosal: { lat: 14.27550, lng: 120.86800, name: "Rosal Street, CHES Phase 1" },
  gardenia: { lat: 14.27530, lng: 120.86840, name: "Gardenia Street, CHES Phase 1" },
};

/**
 * Detailed Multi-Tiered Local Geocoder
 * Returns the exact coordinates, resolution method, and estimated accuracy
 * /
export function resolveLocalGeocodeDetailed(address?: string | null, city?: string | null): ResolvedGeocodeResult {
  const addr = (address || "").trim().toLowerCase();

  // Extract Block and Lot numbers if present
  const blkMatch = addr.match(/(?:blk|block)\s*(\d+)/i);
  const lotMatch = addr.match(/(?:lot|lt)\s*(\d+)/i);
  const blockNum = blkMatch ? parseInt(blkMatch[1], 10) : null;
  const lotNum = lotMatch ? parseInt(lotMatch[1], 10) : null;

  // -------------------------------------------------------------
  // TIER 1: EXACT STREET MATCHING IN CHES 2 (PHASE 2)
  // -------------------------------------------------------------
  for (const [key, val] of Object.entries(CHES_2_STREETS)) {
    if (addr.includes(key)) {
      // Apply micro-offset if lot number is present along the street
      const lotOffsetLat = lotNum ? (lotNum % 10 - 5) * 0.00003 : 0;
      const lotOffsetLng = lotNum ? (lotNum % 10 - 5) * 0.00003 : 0;
      return {
        lat: val.lat + lotOffsetLat,
        lng: val.lng + lotOffsetLng,
        method: "exact_street",
        methodLabel: "Alternative 1: Exact Street-Level Pinpoint",
        matchedName: val.name,
        accuracyEstimateMeters: lotNum ? 5 : 15,
      };
    }
  }

  // -------------------------------------------------------------
  // TIER 1.5: EXACT STREET MATCHING IN CHES 1 (PHASE 1)
  // -------------------------------------------------------------
  for (const [key, val] of Object.entries(CHES_1_STREETS)) {
    if (addr.includes(key)) {
      const lotOffsetLat = lotNum ? (lotNum % 10 - 5) * 0.00003 : 0;
      const lotOffsetLng = lotNum ? (lotNum % 10 - 5) * 0.00003 : 0;
      return {
        lat: val.lat + lotOffsetLat,
        lng: val.lng + lotOffsetLng,
        method: "exact_street",
        methodLabel: "Alternative 1: Exact Street-Level Pinpoint",
        matchedName: val.name,
        accuracyEstimateMeters: lotNum ? 5 : 15,
      };
    }
  }

  // -------------------------------------------------------------
  // TIER 2: BLOCK & LOT GRID INTERPOLATION (CHES 2)
  // -------------------------------------------------------------
  const isChes2 =
    addr.includes("ches.2") ||
    addr.includes("ches 2") ||
    addr.includes("ches2") ||
    addr.includes("phase 2") ||
    addr.includes("phase2") ||
    (addr.includes("capitol hills") && (addr.includes("2") || addr.includes("two")));

  if (isChes2) {
    if (blockNum !== null) {
      // CHES 2 Block Sector Grid Interpolation:
      // Blocks 1-8: Front sector (near Marcin's Ave & Dayflower)
      // Blocks 9-18: Middle sector (around Wistaria / Oceander / Tulip / Magnolia)
      // Blocks 19-35: Back sector (around Geranium / Columbine / Hazel)
      let baseLat = 14.27600;
      let baseLng = 120.86130;
      let sectorName = "Middle Sector (Blk 9-18)";

      if (blockNum <= 8) {
        baseLat = 14.27530 + (blockNum * 0.00005);
        baseLng = 120.86180 - (blockNum * 0.00004);
        sectorName = `Front Sector (Block ${blockNum})`;
      } else if (blockNum <= 18) {
        baseLat = 14.27580 + ((blockNum - 8) * 0.00005);
        baseLng = 120.86140 - ((blockNum - 8) * 0.00004);
        sectorName = `Mid-Grid Sector (Block ${blockNum})`;
      } else {
        baseLat = 14.27630 + (Math.min(blockNum - 18, 15) * 0.00004);
        baseLng = 120.86090 - (Math.min(blockNum - 18, 15) * 0.00005);
        sectorName = `West Back Sector (Block ${blockNum})`;
      }

      const lotOffset = lotNum ? (lotNum * 0.00002) : 0;
      return {
        lat: baseLat + lotOffset,
        lng: baseLng - lotOffset,
        method: "block_interpolation",
        methodLabel: "Alternative 2: Block & Lot Grid Interpolation",
        matchedName: `CHES Phase 2 - ${sectorName}${lotNum ? ` Lot ${lotNum}` : ""}`,
        accuracyEstimateMeters: 45,
      };
    }

    // Default CHES 2 Centroid
    return {
      lat: 14.27600,
      lng: 120.86130,
      method: "subdivision_centroid",
      methodLabel: "Alternative 3: Subdivision Phase Centroid",
      matchedName: "Capitol Hills Executive Subdivision (CHES Phase 2)",
      accuracyEstimateMeters: 120,
    };
  }

  // -------------------------------------------------------------
  // TIER 2.5: BLOCK & LOT GRID INTERPOLATION (CHES 1)
  // -------------------------------------------------------------
  const isChes1 =
    addr.includes("ches.1") ||
    addr.includes("ches 1") ||
    addr.includes("ches1") ||
    addr.includes("phase 1") ||
    addr.includes("phase1") ||
    (addr.includes("capitol hills") && !isChes2);

  if (isChes1) {
    if (blockNum !== null) {
      // CHES 1 Block Sector Grid Interpolation (East of Marcin's Ave)
      let baseLat = 14.27670;
      let baseLng = 120.86580;
      let sectorName = "Middle Sector (Blk 11-20)";

      if (blockNum <= 10) {
        baseLat = 14.27700 - (blockNum * 0.00004);
        baseLng = 120.86500 + (blockNum * 0.00006);
        sectorName = `West Entrance Sector (Block ${blockNum})`;
      } else if (blockNum <= 20) {
        baseLat = 14.27660 - ((blockNum - 10) * 0.00004);
        baseLng = 120.86580 + ((blockNum - 10) * 0.00006);
        sectorName = `Mid-Phase 1 Sector (Block ${blockNum})`;
      } else {
        baseLat = 14.27600 - (Math.min(blockNum - 20, 15) * 0.00003);
        baseLng = 120.86680 + (Math.min(blockNum - 20, 15) * 0.00005);
        sectorName = `East Sector (Block ${blockNum})`;
      }

      const lotOffset = lotNum ? (lotNum * 0.00002) : 0;
      return {
        lat: baseLat + lotOffset,
        lng: baseLng + lotOffset,
        method: "block_interpolation",
        methodLabel: "Alternative 2: Block & Lot Grid Interpolation",
        matchedName: `CHES Phase 1 - ${sectorName}${lotNum ? ` Lot ${lotNum}` : ""}`,
        accuracyEstimateMeters: 45,
      };
    }

    // Default CHES 1 Centroid
    return {
      lat: 14.27668,
      lng: 120.86545,
      method: "subdivision_centroid",
      methodLabel: "Alternative 3: Subdivision Phase Centroid",
      matchedName: "Capitol Hills Executive Subdivision (CHES Phase 1)",
      accuracyEstimateMeters: 120,
    };
  }

  // -------------------------------------------------------------
  // TIER 3: BARANGAY LAPIDARIO CENTROID FALLBACK
  // -------------------------------------------------------------
  if (addr.includes("lapidario")) {
    return {
      lat: 14.27780,
      lng: 120.86580,
      method: "barangay_centroid",
      methodLabel: "Alternative 4: Barangay Community Centroid",
      matchedName: "Barangay Lapidario Center, Trece Martires City",
      accuracyEstimateMeters: 250,
    };
  }

  // Other Cavite subdivisions
  if (addr.includes("zapote") || addr.includes("bacoor")) {
    return {
      lat: 14.4624,
      lng: 120.9645,
      method: "subdivision_centroid",
      methodLabel: "Alternative 3: Area Centroid",
      matchedName: "Zapote, Bacoor City",
      accuracyEstimateMeters: 500,
    };
  }
  if (addr.includes("greenbreeze") || addr.includes("langkaan")) {
    return {
      lat: 14.3050,
      lng: 120.9320,
      method: "subdivision_centroid",
      methodLabel: "Alternative 3: Area Centroid",
      matchedName: "Greenbreeze / Langkaan, DasmariÃ±as",
      accuracyEstimateMeters: 300,
    };
  }
  if (addr.includes("golden city") || addr.includes("salawag")) {
    return {
      lat: 14.3220,
      lng: 120.9420,
      method: "subdivision_centroid",
      methodLabel: "Alternative 3: Area Centroid",
      matchedName: "Golden City, Salawag, DasmariÃ±as",
      accuracyEstimateMeters: 300,
    };
  }
  if (addr.includes("lancaster")) {
    return {
      lat: 14.4020,
      lng: 120.8980,
      method: "subdivision_centroid",
      methodLabel: "Alternative 3: Area Centroid",
      matchedName: "Lancaster New City, General Trias / Imus",
      accuracyEstimateMeters: 400,
    };
  }
  if (addr.includes("primarosa") || addr.includes("buhay na tubig")) {
    return {
      lat: 14.4150,
      lng: 120.9410,
      method: "subdivision_centroid",
      methodLabel: "Alternative 3: Area Centroid",
      matchedName: "Primarosa, Buhay na Tubig, Imus",
      accuracyEstimateMeters: 300,
    };
  }

  // -------------------------------------------------------------
  // TIER 4: CITY / MUNICIPALITY LEVEL FALLBACK
  // -------------------------------------------------------------
  const loc = (city || address || "").toLowerCase();
  for (const [key, muni] of Object.entries(CAVITE_MUNICIPALITIES)) {
    if (loc.includes(key.toLowerCase())) {
      return {
        lat: muni.center[0],
        lng: muni.center[1],
        method: "city_centroid",
        methodLabel: "Alternative 5: City / Municipality Hall Centroid",
        matchedName: muni.name,
        accuracyEstimateMeters: 2500,
      };
    }
  }

  // Default Cavite Business Center
  return {
    lat: 14.2825,
    lng: 120.8667,
    method: "city_centroid",
    methodLabel: "Alternative 5: Cavite Capital Center",
    matchedName: "Trece Martires City Center (Governor's Drive)",
    accuracyEstimateMeters: 3000,
  };
}

/**
 * Standard backward-compatible geocoder returning { lat, lng }
 * /
export function resolveLocalGeocode(address?: string | null, city?: string | null): GeoLocation {
  const result = resolveLocalGeocodeDetailed(address, city);
  return { lat: result.lat, lng: result.lng };
}

/**
 * Recognizable 2-letter uppercase initials for Cavite Municipalities / Cities
 * /
export const CAVITE_AREA_INITIALS: Record<string, string> = {
  "alfonso": "AL",
  "amadeo": "AM",
  "bacoor": "BC",
  "carmona": "CR",
  "cavite city": "CC",
  "dasmarinas": "DM",
  "dasmariÃ±as": "DM",
  "general emilio aguinaldo": "GA",
  "bailen": "GA",
  "general mariano alvarez": "GM",
  "gma": "GM",
  "general trias": "GT",
  "imus": "IM",
  "indang": "IN",
  "kawit": "KW",
  "magallanes": "MG",
  "maragondon": "MR",
  "mendez": "MD",
  "naic": "NC",
  "noveleta": "NV",
  "rosario": "RS",
  "silang": "SL",
  "tagaytay": "TG",
  "tanza": "TZ",
  "ternate": "TR",
  "trece martires": "TM",
};

/**
 * Returns a 2-letter geographic abbreviation based on the place name (not the applicant's name).
 * /
export function getAreaInitials(areaName?: string | null): string {
  if (!areaName) return "ðŸ“";
  const raw = areaName.trim();
  const lower = raw.toLowerCase();

  for (const [key, code] of Object.entries(CAVITE_AREA_INITIALS)) {
    if (lower === key || lower.includes(key)) {
      return code;
    }
  }

  // Generic algorithm for any other municipality/city:
  const words = raw
    .replace(/\b(City|Municipality|Of|The|Brgy\.?|Barangay)\b/gi, "")
    .trim()
    .split(/[\s\-]+/)
    .filter(Boolean);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return raw.slice(0, 2).toUpperCase() || "ðŸ“";
}


*/
export {};

