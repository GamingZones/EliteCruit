/**
 * Nationwide Philippines Geocoding & Mapping Engine (mapData.ts)
 * Supports high-accuracy coordinate lookup, municipality centroids,
 * provincial centers, and geographic initial badges across the Philippines.
 */

export interface GeoLocation {
  lat: number;
  lng: number;
}

export type GeocodeMethod =
  | "exact_street"
  | "subdivision_centroid"
  | "barangay_centroid"
  | "city_centroid"
  | "province_centroid"
  | "national_fallback";

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

// Center of the Philippine archipelago
export const PHILIPPINES_DEFAULT_CENTER: [number, number] = [12.8797, 121.7740];

/**
 * Centroid coordinates [latitude, longitude] for all Philippine Provinces
 */
export const PHILIPPINES_PROVINCE_COORDINATES: Record<string, [number, number]> = {
  // National Capital Region (NCR)
  "Metro Manila": [14.5995, 120.9842],
  "Metro Manila (NCR)": [14.5995, 120.9842],
  "NCR": [14.5995, 120.9842],

  // Region IV-A (CALABARZON)
  "Cavite": [14.2825, 120.8667],
  "Laguna": [14.2814, 121.4172],
  "Batangas": [13.7565, 121.0583],
  "Rizal": [14.5842, 121.1764],
  "Quezon": [14.0250, 121.5944],

  // Region III (Central Luzon)
  "Bulacan": [14.8433, 120.8114],
  "Pampanga": [15.0347, 120.6869],
  "Bataan": [14.6806, 120.5408],
  "Zambales": [15.3333, 119.9833],
  "Tarlac": [15.4802, 120.5979],
  "Nueva Ecija": [15.4858, 120.9669],
  "Aurora": [15.7594, 121.5625],

  // Region I & CAR
  "Ilocos Norte": [18.1960, 120.5927],
  "Ilocos Sur": [17.5747, 120.3869],
  "La Union": [16.6159, 120.3209],
  "Pangasinan": [15.9761, 120.5711],
  "Benguet": [16.4023, 120.5960],
  "Abra": [17.5956, 120.6186],
  "Apayao": [18.0667, 121.1667],
  "Ifugao": [16.8333, 121.1667],
  "Kalinga": [17.3333, 121.1667],
  "Mountain Province": [17.0833, 120.9667],

  // Region II (Cagayan Valley)
  "Batanes": [20.4485, 121.9708],
  "Cagayan": [17.6131, 121.7269],
  "Isabela": [16.9754, 121.8107],
  "Nueva Vizcaya": [16.3262, 121.1578],
  "Quirino": [16.2736, 121.6111],

  // Region IV-B (MIMAROPA)
  "Marinduque": [13.4442, 121.9056],
  "Occidental Mindoro": [13.0667, 120.7333],
  "Oriental Mindoro": [13.1500, 121.2833],
  "Palawan": [9.8349, 118.7384],
  "Romblon": [12.5786, 122.2708],

  // Region V (Bicol)
  "Albay": [13.1391, 123.7438],
  "Camarines Norte": [14.1167, 122.9556],
  "Camarines Sur": [13.6218, 123.1948],
  "Catanduanes": [13.7833, 124.2333],
  "Masbate": [12.3708, 123.6300],
  "Sorsogon": [12.9742, 124.0058],

  // Region VI & VII (Visayas)
  "Aklan": [11.6967, 122.3667],
  "Antique": [10.7431, 121.9833],
  "Capiz": [11.5853, 122.7511],
  "Guimaras": [10.5667, 122.6167],
  "Iloilo": [10.7202, 122.5621],
  "Negros Occidental": [10.6765, 122.9509],
  "Bohol": [9.6500, 123.8500],
  "Cebu": [10.3157, 123.8854],
  "Negros Oriental": [9.3068, 123.3054],
  "Siquijor": [9.2167, 123.5167],

  // Region VIII (Eastern Visayas)
  "Biliran": [11.5500, 124.4667],
  "Eastern Samar": [11.7833, 125.4333],
  "Leyte": [11.2444, 125.0039],
  "Northern Samar": [12.5000, 124.6333],
  "Samar": [11.7833, 124.8833],
  "Southern Leyte": [10.3333, 124.9667],

  // Region IX, X, XI, XII, XIII, BARMM (Mindanao)
  "Zamboanga del Norte": [8.5833, 123.3400],
  "Zamboanga del Sur": [7.8258, 123.4372],
  "Zamboanga Sibugay": [7.7833, 122.6167],
  "Bukidnon": [8.1575, 125.1278],
  "Camiguin": [9.1764, 124.7297],
  "Lanao del Norte": [8.2280, 124.2452],
  "Misamis Occidental": [8.1469, 123.8417],
  "Misamis Oriental": [8.4542, 124.6319],
  "Davao de Oro": [7.5833, 126.0000],
  "Davao del Norte": [7.4478, 125.8078],
  "Davao del Sur": [7.1907, 125.4504],
  "Davao Occidental": [6.1833, 125.6833],
  "Davao Oriental": [6.9550, 126.2167],
  "Cotabato": [7.2236, 124.2464],
  "South Cotabato": [6.5028, 124.8469],
  "Sultan Kudarat": [6.6908, 124.6756],
  "Sarangani": [5.9000, 125.2667],
  "Agusan del Norte": [8.9475, 125.5406],
  "Agusan del Sur": [8.5000, 125.8333],
  "Dinagat Islands": [10.1167, 125.6000],
  "Surigao del Norte": [9.7892, 125.4919],
  "Surigao del Sur": [8.8667, 126.2667],
  "Basilan": [6.6167, 122.0667],
  "Lanao del Sur": [7.9986, 124.2928],
  "Maguindanao del Norte": [7.2167, 124.2500],
  "Maguindanao del Sur": [6.9500, 124.4833],
  "Sulu": [6.0500, 121.0000],
  "Tawi-Tawi": [5.1333, 120.0333],
};

/**
 * Centroid coordinates [latitude, longitude] for key cities nationwide
 */
export const PHILIPPINES_CITIES_COORDINATES: Record<string, [number, number]> = {
  // Metro Manila / NCR
  "Manila": [14.5995, 120.9842],
  "Quezon City": [14.6760, 121.0437],
  "Makati": [14.5547, 121.0244],
  "Taguig": [14.5176, 121.0509],
  "Pasig": [14.5764, 121.0851],
  "Mandaluyong": [14.5794, 121.0359],
  "Pasay": [14.5378, 121.0014],
  "Caloocan": [14.6416, 120.9762],
  "Parañaque": [14.4793, 121.0198],
  "Paranaque": [14.4793, 121.0198],
  "Las Piñas": [14.4445, 120.9939],
  "Las Pinas": [14.4445, 120.9939],
  "Marikina": [14.6507, 121.1029],
  "Muntinlupa": [14.4081, 121.0415],
  "Valenzuela": [14.6971, 120.9632],
  "Malabon": [14.6625, 120.9566],
  "Navotas": [14.6667, 120.9417],
  "San Juan": [14.6019, 121.0355],
  "Pateros": [14.5454, 121.0687],

  // Cavite
  "Dasmariñas": [14.3294, 120.9367],
  "Dasmarinas": [14.3294, 120.9367],
  "Bacoor": [14.4624, 120.9645],
  "Imus": [14.4296, 120.9367],
  "General Trias": [14.3833, 120.8833],
  "Tagaytay": [14.1153, 120.9621],
  "Trece Martires": [14.2825, 120.8667],
  "Silang": [14.2307, 120.9748],
  "Carmona": [14.3167, 121.0500],
  "Tanza": [14.3944, 120.8544],
  "Kawit": [14.4444, 120.9028],
  "Rosario": [14.4167, 120.8500],
  "Naic": [14.3197, 120.7686],
  "Indang": [14.1953, 120.8769],
  "Alfonso": [14.1350, 120.8530],
  "Amadeo": [14.1714, 120.9236],
  "General Mariano Alvarez (GMA)": [14.3000, 121.0000],
  "GMA": [14.3000, 121.0000],
  "Maragondon": [14.2750, 120.7360],
  "Mendez": [14.1306, 120.9069],
  "Noveleta": [14.4278, 120.8806],
  "Ternate": [14.2889, 120.7167],
  "Magallanes": [14.1889, 120.7556],
  "General Emilio Aguinaldo": [14.1833, 120.8000],
  "Cavite City": [14.4833, 120.9000],

  // Laguna
  "Calamba": [14.2144, 121.1656],
  "Santa Rosa": [14.3122, 121.1114],
  "Biñan": [14.3414, 121.0806],
  "Binan": [14.3414, 121.0806],
  "San Pedro": [14.3597, 121.0508],
  "Cabuyao": [14.2783, 121.1250],
  "San Pablo": [14.0678, 121.3256],
  "Los Baños": [14.1706, 121.2431],
  "Los Banos": [14.1706, 121.2431],
  "Santa Cruz": [14.2814, 121.4172],

  // Batangas
  "Batangas City": [13.7565, 121.0583],
  "Lipa": [13.9419, 121.1644],
  "Tanauan": [14.0864, 121.1500],
  "Santo Tomas": [14.1081, 121.1417],
  "Nasugbu": [14.0750, 120.6333],
  "Lemery": [13.8833, 120.9167],
  "Bauan": [13.7917, 121.0083],

  // Rizal
  "Antipolo": [14.5842, 121.1764],
  "Cainta": [14.5772, 121.1219],
  "Taytay": [14.5500, 121.1333],
  "San Mateo": [14.6972, 121.1194],
  "Rodriguez": [14.7333, 121.1500],
  "Angono": [14.5250, 121.1528],
  "Binangonan": [14.4644, 121.1925],

  // Central Luzon
  "San Fernando (Pampanga)": [15.0347, 120.6869],
  "Angeles": [15.1450, 120.5886],
  "Mabalacat": [15.2217, 120.5750],
  "Malolos": [14.8433, 120.8114],
  "San Jose del Monte": [14.8139, 121.0453],
  "Meycauayan": [14.7350, 120.9583],
  "Tarlac City": [15.4802, 120.5979],
  "Olongapo": [14.8386, 120.2842],
  "Balanga": [14.6806, 120.5408],
  "Cabanatuan": [15.4858, 120.9669],

  // Northern Luzon
  "Baguio": [16.4023, 120.5960],
  "Dagupan": [16.0433, 120.3333],
  "Laoag": [18.1960, 120.5927],
  "Vigan": [17.5747, 120.3869],
  "Tuguegarao": [17.6131, 121.7269],

  // Bicol
  "Legazpi": [13.1391, 123.7438],
  "Naga": [13.6218, 123.1948],
  "Sorsogon City": [12.9742, 124.0058],

  // Visayas
  "Cebu City": [10.3157, 123.8854],
  "Mandaue": [10.3333, 123.9333],
  "Lapu-Lapu": [10.3117, 123.9494],
  "Talisay (Cebu)": [10.2447, 123.8494],
  "Iloilo City": [10.7202, 122.5621],
  "Bacolod": [10.6765, 122.9509],
  "Dumaguete": [9.3068, 123.3054],
  "Tagbilaran": [9.6500, 123.8500],
  "Tacloban": [11.2444, 125.0039],
  "Ormoc": [11.0050, 124.6075],
  "Roxas City": [11.5853, 122.7511],

  // Mindanao
  "Davao City": [7.1907, 125.4504],
  "Tagum": [7.4478, 125.8078],
  "Panabo": [7.3000, 125.6833],
  "Digos": [6.7500, 125.3500],
  "Cagayan de Oro": [8.4542, 124.6319],
  "Iligan": [8.2280, 124.2452],
  "General Santos": [6.1164, 125.1716],
  "Koronadal": [6.5028, 124.8469],
  "Cotabato City": [7.2236, 124.2464],
  "Zamboanga City": [6.9214, 122.0790],
  "Butuan": [8.9475, 125.5406],
  "Surigao City": [9.7892, 125.4919],
};

/**
 * Creates a standard bounding box polygon coordinates around any center point
 */
function createBoxCoordinates(center: [number, number], offset = 0.03): [number, number][] {
  const [lat, lng] = center;
  return [
    [lat - offset, lng - offset],
    [lat + offset, lng - offset],
    [lat + offset, lng + offset],
    [lat - offset, lng + offset],
    [lat - offset, lng - offset],
  ];
}

/**
 * Nationwide Municipalities & Cities Boundary & Center Registry
 */
export const PHILIPPINES_MUNICIPALITIES: Record<string, MunicipalityBoundary> = {};

// Populate PHILIPPINES_MUNICIPALITIES dynamically with all known cities and provinces
for (const [cityName, center] of Object.entries(PHILIPPINES_CITIES_COORDINATES)) {
  PHILIPPINES_MUNICIPALITIES[cityName] = {
    name: cityName,
    center,
    coordinates: createBoxCoordinates(center),
  };
}

for (const [provName, center] of Object.entries(PHILIPPINES_PROVINCE_COORDINATES)) {
  if (!PHILIPPINES_MUNICIPALITIES[provName]) {
    PHILIPPINES_MUNICIPALITIES[provName] = {
      name: provName,
      center,
      coordinates: createBoxCoordinates(center, 0.08),
    };
  }
}

// Backward-compatible alias for existing code
export const CAVITE_MUNICIPALITIES = PHILIPPINES_MUNICIPALITIES;

/**
 * High-Precision Nationwide Geocoder
 * Resolves address, city, and province to real latitude and longitude coordinates.
 */
export function resolveLocalGeocodeDetailed(
  address?: string | null,
  city?: string | null,
  province?: string | null
): ResolvedGeocodeResult {
  const norm = (str?: string | null) => (str || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").trim();
  const rawCity = (city || "").trim();
  const rawProv = (province || "").trim();
  const rawAddr = (address || "").trim();

  const normCity = norm(rawCity);
  const normProv = norm(rawProv);
  const normAddr = norm(rawAddr);

  // 1. Direct city match in PHILIPPINES_CITIES_COORDINATES
  for (const [name, coords] of Object.entries(PHILIPPINES_CITIES_COORDINATES)) {
    const key = norm(name);
    if (key && (normCity === key || normCity.includes(key) || key.includes(normCity))) {
      return {
        lat: coords[0],
        lng: coords[1],
        method: "city_centroid",
        methodLabel: `City: ${name}`,
        matchedName: name,
        accuracyEstimateMeters: 2500,
      };
    }
  }

  // 2. Search address text for any known Philippine city
  if (normAddr) {
    for (const [name, coords] of Object.entries(PHILIPPINES_CITIES_COORDINATES)) {
      const key = norm(name);
      if (key && normAddr.includes(key)) {
        return {
          lat: coords[0],
          lng: coords[1],
          method: "city_centroid",
          methodLabel: `City in Address: ${name}`,
          matchedName: name,
          accuracyEstimateMeters: 2500,
        };
      }
    }
  }

  // 3. Match Province centroid in PHILIPPINES_PROVINCE_COORDINATES
  for (const [name, coords] of Object.entries(PHILIPPINES_PROVINCE_COORDINATES)) {
    const key = norm(name);
    if (key && (normProv === key || normProv.includes(key) || normAddr.includes(key))) {
      return {
        lat: coords[0],
        lng: coords[1],
        method: "province_centroid",
        methodLabel: `Province: ${name}`,
        matchedName: name,
        accuracyEstimateMeters: 15000,
      };
    }
  }

  // 4. National Fallback
  return {
    lat: PHILIPPINES_DEFAULT_CENTER[0],
    lng: PHILIPPINES_DEFAULT_CENTER[1],
    method: "national_fallback",
    methodLabel: "Philippines Central",
    matchedName: "Philippines",
    accuracyEstimateMeters: 50000,
  };
}

/**
 * Standard geocoder returning { lat, lng }
 */
export function resolveLocalGeocode(
  address?: string | null,
  city?: string | null,
  province?: string | null
): GeoLocation {
  const result = resolveLocalGeocodeDetailed(address, city, province);
  return { lat: result.lat, lng: result.lng };
}

/**
 * Returns a 2-letter uppercase geographic abbreviation based on the place name.
 */
export function getAreaInitials(areaName?: string | null): string {
  if (!areaName) return "PH";
  const clean = areaName
    .replace(/\b(City|Municipality|Province|Of|The|Brgy\.?|Barangay)\b/gi, "")
    .trim();

  const words = clean.split(/[\s\-]+/).filter(Boolean);

  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  if (words.length === 1 && words[0].length >= 2) {
    return words[0].slice(0, 2).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase() || "PH";
}
