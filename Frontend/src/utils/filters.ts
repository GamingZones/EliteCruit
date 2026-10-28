/**
 * EliteCruit - Shared Filtering, Matching, Taxonomy & Competencies
 * Consolidated single source of truth for BSIT/BSCS job roles, keywords,
 * technical skills, educational qualifications, industry certifications,
 * location filters, distance calculations, and algorithmic match scoring.
 */

export const BSIT_BSCS_JOB_TITLES = [
  "Web Developer",
  "Full-Stack Developer",
  "IT Support Specialist / IT Support Staff",
  "Database Administrator",
  "System Administrator",
  "Network Engineer",
  "Software Engineer",
  "Quality Assurance (QA) Tester",
  "Business/Systems Analyst",
  "Cybersecurity Analyst Junior",
  "Cloud Support Associate",
  "Data Analyst Junior",
  "UI/UX Designer",
  "IT Project Coordinator",
] as const;

export const CAVITE_CITIES = [
  "Alfonso",
  "Amadeo",
  "Bacoor",
  "Carmona",
  "Cavite City",
  "Dasmariñas",
  "General Emilio Aguinaldo",
  "General Mariano Alvarez (GMA)",
  "General Trias",
  "Imus",
  "Indang",
  "Kawit",
  "Magallanes",
  "Maragondon",
  "Mendez",
  "Naic",
  "Noveleta",
  "Rosario",
  "Silang",
  "Tagaytay",
  "Tanza",
  "Ternate",
  "Trece Martires",
] as const;

/**
 * ============================================================================
 * COMPLETE PHILIPPINES GEOGRAPHIC TAXONOMY (PSGC - PSA REGIONS, PROVINCES, CITIES)
 * ============================================================================
 */

export const PHILIPPINES_REGIONS = [
  "NCR (National Capital Region)",
  "CAR (Cordillera Administrative Region)",
  "Region I (Ilocos Region)",
  "Region II (Cagayan Valley)",
  "Region III (Central Luzon)",
  "Region IV-A (CALABARZON)",
  "Region IV-B (MIMAROPA)",
  "Region V (Bicol Region)",
  "Region VI (Western Visayas)",
  "Region VII (Central Visayas)",
  "Region VIII (Eastern Visayas)",
  "Region IX (Zamboanga Peninsula)",
  "Region X (Northern Mindanao)",
  "Region XI (Davao Region)",
  "Region XII (SOCCSKSARGEN)",
  "Region XIII (Caraga)",
  "BARMM (Bangsamoro Autonomous Region in Muslim Mindanao)",
] as const;

export const PHILIPPINES_REGION_PROVINCES_MAP: Record<string, string[]> = {
  "NCR (National Capital Region)": ["Metro Manila"],
  "CAR (Cordillera Administrative Region)": ["Abra", "Apayao", "Benguet", "Ifugao", "Kalinga", "Mountain Province"],
  "Region I (Ilocos Region)": ["Ilocos Norte", "Ilocos Sur", "La Union", "Pangasinan"],
  "Region II (Cagayan Valley)": ["Batanes", "Cagayan", "Isabela", "Nueva Vizcaya", "Quirino"],
  "Region III (Central Luzon)": ["Bataan", "Bulacan", "Nueva Ecija", "Pampanga", "Tarlac", "Zambales", "Aurora"],
  "Region IV-A (CALABARZON)": ["Cavite", "Laguna", "Batangas", "Rizal", "Quezon"],
  "Region IV-B (MIMAROPA)": ["Marinduque", "Occidental Mindoro", "Oriental Mindoro", "Palawan", "Romblon"],
  "Region V (Bicol Region)": ["Albay", "Camarines Norte", "Camarines Sur", "Catanduanes", "Masbate", "Sorsogon"],
  "Region VI (Western Visayas)": ["Aklan", "Antique", "Capiz", "Guimaras", "Iloilo", "Negros Occidental"],
  "Region VII (Central Visayas)": ["Bohol", "Cebu", "Negros Oriental", "Siquijor"],
  "Region VIII (Eastern Visayas)": ["Biliran", "Eastern Samar", "Leyte", "Northern Samar", "Samar", "Southern Leyte"],
  "Region IX (Zamboanga Peninsula)": ["Zamboanga del Norte", "Zamboanga del Sur", "Zamboanga Sibugay"],
  "Region X (Northern Mindanao)": ["Bukidnon", "Camiguin", "Lanao del Norte", "Misamis Occidental", "Misamis Oriental"],
  "Region XI (Davao Region)": ["Davao de Oro", "Davao del Norte", "Davao del Sur", "Davao Occidental", "Davao Oriental"],
  "Region XII (SOCCSKSARGEN)": ["Cotabato", "Sarangani", "South Cotabato", "Sultan Kudarat"],
  "Region XIII (Caraga)": ["Agusan del Norte", "Agusan del Sur", "Dinagat Islands", "Surigao del Norte", "Surigao del Sur"],
  "BARMM (Bangsamoro Autonomous Region in Muslim Mindanao)": ["Basilan", "Lanao del Sur", "Maguindanao del Norte", "Maguindanao del Sur", "Sulu", "Tawi-Tawi"],
};

export const PHILIPPINES_PROVINCE_CITIES_MAP: Record<string, string[]> = {
  "Cavite": [
    "Alfonso", "Amadeo", "Bacoor", "Carmona", "Cavite City", "Dasmariñas",
    "General Emilio Aguinaldo", "General Mariano Alvarez (GMA)", "General Trias",
    "Imus", "Indang", "Kawit", "Magallanes", "Maragondon", "Mendez", "Naic",
    "Noveleta", "Rosario", "Silang", "Tagaytay", "Tanza", "Ternate", "Trece Martires"
  ],
  "Metro Manila": [
    "Manila", "Quezon City", "Makati", "Taguig (BGC)", "Pasig", "Mandaluyong",
    "Parañaque", "Pasay", "Las Piñas", "Muntinlupa", "Caloocan", "Marikina",
    "Valenzuela", "Malabon", "Navotas", "San Juan", "Pateros"
  ],
  "Laguna": [
    "Biñan", "Cabuyao", "Calamba", "Los Baños", "San Pedro", "Santa Rosa",
    "San Pablo", "Santa Cruz", "Alaminos", "Bay", "Calauan", "Cavinti",
    "Famy", "Kalayaan", "Liliw", "Luisiana", "Lumban", "Mabitac", "Magdalena",
    "Nagcarlan", "Paete", "Pagsanjan", "Pakil", "Pangil", "Rizal", "Siniloan", "Victoria"
  ],
  "Batangas": [
    "Batangas City", "Lipa", "Tanauan", "Santo Tomas", "Nasugbu", "Bauan",
    "Lemery", "Mabini", "Calatagan", "Agoncillo", "Alitagtag", "Balayan",
    "Balete", "Calaca", "Cuenca", "Ibaan", "Laurel", "Lian", "Lobo",
    "Malvar", "Mataasnakahoy", "Padre Garcia", "Rosario", "San Jose",
    "San Juan", "San Luis", "San Nicolas", "San Pascual", "Santa Teresita",
    "Taal", "Taysan", "Tingloy", "Tuy"
  ],
  "Rizal": [
    "Antipolo", "Taytay", "Cainta", "Binangonan", "San Mateo", "Rodriguez (Montalban)",
    "Angono", "Teresa", "Baras", "Cardona", "Jala-jala", "Morong", "Pililla"
  ],
  "Quezon": [
    "Lucena", "Tayabas", "Candelaria", "Sariaya", "Tiaong", "Pagbilao",
    "Calauag", "Gumaca", "Lopez", "Infanta", "Real", "General Nakar"
  ],
  "Batanes": [
    "Basco", "Itbayat", "Ivana", "Mahatao", "Sabtang", "Uyugan"
  ],
  "Cagayan": [
    "Tuguegarao", "Aparri", "Baggao", "Ballesteros", "Camalaniugan", "Claveria", "Gattaran", "Gonzaga", "Lal-lo", "Sanchez-Mira"
  ],
  "Isabela": [
    "Ilagan", "Cauayan", "Santiago", "Alicia", "Cabagan", "Echague", "Roxas", "San Mateo", "Tumauini"
  ],
  "Nueva Vizcaya": [
    "Bayombong", "Solano", "Bambang", "Aritao", "Bagabag", "Dupax del Norte", "Villaverde"
  ],
  "Quirino": [
    "Cabarroguis", "Aglipay", "Diffun", "Maddela", "Nagtipunan", "Saguday"
  ],
  "Ilocos Norte": [
    "Laoag", "Batac", "Bacarra", "Bangui", "Pagudpud", "Paoay", "San Nicolas"
  ],
  "Ilocos Sur": [
    "Vigan", "Candon", "Cabugao", "Narvacan", "Santa", "Santa Maria", "Santo Domingo"
  ],
  "La Union": [
    "San Fernando", "Agoo", "Bangar", "Bauang", "Naguilian", "Rosario", "San Juan"
  ],
  "Pangasinan": [
    "Dagupan", "San Carlos", "Urdaneta", "Alaminos", "Lingayen", "Binmaley", "Calasiao", "Malasiqui", "Manaoag", "Rosales", "San Fabian", "Tayug"
  ],
  "Abra": ["Bangued", "Bucay", "Dolores", "La Paz", "Tayum"],
  "Apayao": ["Kabugao", "Calanasan", "Conner", "Flora", "Luna"],
  "Benguet": [
    "Baguio", "La Trinidad", "Itogon", "Tuba", "Tublay", "Atok", "Bakun",
    "Bokod", "Buguias", "Kabayan", "Kapangan", "Kibungan", "Mankayan"
  ],
  "Ifugao": ["Lagawe", "Banaue", "Hungduan", "Kiangan", "Mayoyao"],
  "Kalinga": ["Tabuk", "Balbalan", "Lubuagan", "Pasil", "Tinglayan"],
  "Mountain Province": ["Bontoc", "Bauko", "Besao", "Sagada", "Tadian"],
  "Bataan": [
    "Balanga", "Mariveles", "Dinalupihan", "Orani", "Hermosa", "Abucay", "Bagac", "Limay", "Orion", "Samal"
  ],
  "Bulacan": [
    "Malolos", "Meycauayan", "San Jose del Monte", "Marilao", "Santa Maria",
    "Bocaue", "Baliwag", "Hagonoy", "Plaridel", "Guiguinto", "Balagtas",
    "Bustos", "Calumpit", "Doña Remedios Trinidad", "Norzagaray", "Obando",
    "Pandi", "Paombong", "San Ildefonso", "San Miguel", "San Rafael"
  ],
  "Nueva Ecija": [
    "Cabanatuan", "Palayan", "San Jose", "Gapan", "Science City of Muñoz", "Talavera", "Guimba", "Jaen", "Santa Rosa"
  ],
  "Pampanga": [
    "San Fernando", "Angeles", "Mabalacat", "Guagua", "Lubao", "Mexico",
    "Apalit", "Arayat", "Bacolor", "Candaba", "Floridablanca", "Macabebe",
    "Magalang", "Masantol", "Minalin", "Porac", "San Luis", "San Simon", "Santa Ana", "Santa Rita"
  ],
  "Tarlac": [
    "Tarlac City", "Capas", "Concepcion", "Gerona", "Paniqui", "Camiling", "La Paz", "Victoria"
  ],
  "Zambales": [
    "Olongapo", "Iba", "Subic", "Castillejos", "San Marcelino", "San Antonio", "Botolan", "Santa Cruz"
  ],
  "Aurora": [
    "Baler", "Casiguran", "Dilasag", "Dinalungan", "Dingalan", "Dipaculao", "Maria Aurora", "San Luis"
  ],
  "Marinduque": ["Boac", "Buenavista", "Gasan", "Mogpog", "Santa Cruz", "Torrijos"],
  "Occidental Mindoro": ["Mamburao", "San Jose", "Sablayan", "Abra de Ilog", "Calintaan", "Paluan", "Santa Cruz"],
  "Oriental Mindoro": ["Calapan", "Puerto Galera", "Pinamalayan", "Roxas", "Baco", "Bongabong", "Bulalacao", "Naujan", "Pola", "Victoria"],
  "Palawan": ["Puerto Princesa", "El Nido", "Coron", "Brooke's Point", "Bataraza", "Aborlan", "Culion", "Roxas", "San Vicente", "Taytay"],
  "Romblon": ["Romblon", "Odiongan", "Cajidiocan", "Calatrava", "Ferrol", "Looc", "Magdiwang", "San Agustin", "San Fernando"],
  "Albay": ["Legazpi", "Daraga", "Tabaco", "Ligao", "Camalig", "Guinobatan", "Malilipot", "Polangui", "Tiwi"],
  "Camarines Norte": ["Daet", "Labo", "Basud", "Capalonga", "Jose Panganiban", "Mercedes", "Paracale", "Vinzons"],
  "Camarines Sur": ["Naga", "Iriga", "Pili", "Calabanga", "Libmanan", "Sipocot", "Tigaon", "Buhi", "Caramoan"],
  "Catanduanes": ["Virac", "Bato", "Caramoran", "Gigmoto", "Pandan", "Panganiban", "San Andres", "Viga"],
  "Masbate": ["Masbate City", "Aroroy", "Cawayan", "Dimasalang", "Milagros", "Placer", "San Jacinto", "Uson"],
  "Sorsogon": ["Sorsogon City", "Bulan", "Gubat", "Irosin", "Castilla", "Donsol", "Casiguran", "Magallanes", "Matnog"],
  "Aklan": ["Kalibo", "Malay (Boracay)", "Ibajay", "Banga", "Batan", "Makato", "New Washington", "Numancia"],
  "Antique": ["San Jose de Buenavista", "Belison", "Bugasong", "Culasi", "Hamtic", "Pandan", "Sibalom", "Tibiao"],
  "Capiz": ["Roxas City", "Dao", "Dumalag", "Dumarao", "Ivisan", "Mambusao", "Panay", "Pontevedra", "Sigma"],
  "Guimaras": ["Jordan", "Buenavista", "Nueva Valencia", "San Lorenzo", "Sibunag"],
  "Iloilo": [
    "Iloilo City", "Passi", "Oton", "Santa Barbara", "Pavia", "Dumangas",
    "Estancia", "Guimbal", "Janiuay", "Miagao", "Pototan", "Sara", "Tigbauan"
  ],
  "Negros Occidental": [
    "Bacolod", "Talisay", "Silay", "Bago", "Kabankalan", "San Carlos",
    "Cadiz", "Escalante", "Himamaylan", "La Carlota", "Sagay", "Sipalay", "Victorias"
  ],
  "Bohol": ["Tagbilaran", "Panglao", "Carmen", "Jagna", "Tubigon", "Ubay", "Anda", "Corella", "Dauis", "Loon"],
  "Cebu": [
    "Cebu City", "Mandaue", "Lapu-Lapu", "Talisay", "Toledo", "Danao",
    "Carcar", "Naga", "Consolacion", "Liloan", "Minglanilla", "Compostela",
    "Cordova", "Balamban", "Bantayan", "Bogo", "Dumanjug", "Moalboal", "Oslob", "San Fernando"
  ],
  "Negros Oriental": ["Dumaguete", "Bais", "Bayawan", "Canlaon", "Tanjay", "Bacong", "Guihulngan", "Sibulan", "Valencia"],
  "Siquijor": ["Siquijor", "Larena", "Lazi", "Enrique Villanueva", "Maria", "San Juan"],
  "Biliran": ["Naval", "Almeria", "Biliran", "Cabucgayan", "Caibiran", "Culaba", "Kawayan", "Maripipi"],
  "Eastern Samar": ["Borongan", "Guiuan", "Arteche", "Balangiga", "Can-avid", "Dolores", "Oras", "Salcedo", "Sulat"],
  "Leyte": ["Tacloban", "Ormoc", "Baybay", "Palo", "Tanauan", "Abuyog", "Barugo", "Carigara", "Hilongos", "Isabel", "Palompon"],
  "Northern Samar": ["Catarman", "Allen", "Catubig", "Laoang", "Lope de Vega", "Mondragon", "Palapag", "San Roque"],
  "Samar": ["Catbalogan", "Calbayog", "Basey", "Gandara", "Hinabangan", "Motiong", "Paranas", "Santa Rita", "Wright"],
  "Southern Leyte": ["Maasin", "Sogod", "Liloan", "Malitbog", "Padre Burgos", "Pintuyan", "San Juan", "Saint Bernard", "Tomas Oppus"],
  "Zamboanga del Norte": ["Dipolog", "Dapitan", "Sindangan", "Labason", "Liloy", "Manukan", "Roxas", "Siocon", "Tampilisan"],
  "Zamboanga del Sur": [
    "Zamboanga City", "Pagadian", "Aurora", "Bayog", "Dimataling", "Dinas",
    "Dumalinao", "Guipos", "Kumalarang", "Labangan", "Lapuyan", "Mahayag", "Molave"
  ],
  "Zamboanga Sibugay": ["Ipil", "Buug", "Diplahan", "Kabasalan", "Mabuhay", "Malangas", "Naga", "Titay", "Tungawan"],
  "Bukidnon": ["Malaybalay", "Valencia", "Manolo Fortich", "Maramag", "Quezon", "Don Carlos", "Kibawe", "Lantapan", "Talakag"],
  "Camiguin": ["Mambajao", "Catarman", "Guinsiliban", "Mahinog", "Sagay"],
  "Lanao del Norte": ["Iligan", "Tubod", "Balaoan", "Kapatagan", "Lala", "Linamon", "Maigo", "Salvador"],
  "Misamis Occidental": ["Ozamiz", "Oroquieta", "Tangub", "Clarin", "Jimenez", "Lopez Jaena", "Plaridel", "Tudela"],
  "Misamis Oriental": [
    "Cagayan de Oro", "Gingoog", "El Salvador", "Alubijid", "Balingasag",
    "Claveria", "Initao", "Jasaan", "Opol", "Tagoloan", "Villanueva"
  ],
  "Davao de Oro": ["Nabunturan", "Compostela", "Laak", "Mabini", "Maco", "Maragusan", "Monkayo", "Pantukan"],
  "Davao del Norte": ["Tagum", "Panabo", "Samal (IGaCOS)", "Carmen", "Kapalong", "New Corella", "Santo Tomas"],
  "Davao del Sur": [
    "Davao City", "Digos", "Bansalan", "Hagonoy", "Kiblawan", "Magsaysay",
    "Malalag", "Matanao", "Padada", "Santa Cruz", "Sulop"
  ],
  "Davao Occidental": ["Malita", "Don Marcelino", "Jose Abad Santos", "Sarangani", "Santa Maria"],
  "Davao Oriental": ["Mati", "Baganga", "Boston", "Caraga", "Cateel", "Governor Generoso", "Lupon", "Manay", "Tarragona"],
  "Cotabato": ["Kidapawan", "Midsayap", "Kabacan", "Aleosan", "Antipas", "Banisilan", "Carmen", "Makilala", "Pikit", "Tulunan"],
  "Sarangani": ["Alabel", "Glan", "Kiamba", "Maasim", "Maitum", "Malapatan", "Malungon"],
  "South Cotabato": [
    "General Santos", "Koronadal", "Polomolok", "Tupi", "Surallah", "Banga",
    "Lake Sebu", "Norala", "Santo Niño", "Tantangan", "T'Boli"
  ],
  "Sultan Kudarat": ["Tacurong", "Isulan", "Bagumbayan", "Columbio", "Esperanza", "Lutayan", "President Quirino", "Sen. Ninoy Aquino"],
  "Agusan del Norte": [
    "Butuan", "Cabadbaran", "Buenavista", "Carmen", "Jabonga", "Kitcharao",
    "Las Nieves", "Magallanes", "Nasipit", "Remedios T. Romualdez", "Tubay"
  ],
  "Agusan del Sur": ["Prosperidad", "Bayugan", "Bunawan", "Esperanza", "Loreto", "Rosario", "San Francisco", "Trento", "Veruela"],
  "Dinagat Islands": ["San Jose", "Basilisa", "Cagdianao", "Dinagat", "Libjo", "Loreto", "Tubajon"],
  "Surigao del Norte": ["Surigao City", "Dapa (Siargao)", "Del Carmen", "General Luna", "Placer", "San Benito", "Santa Monica", "Tagana-an"],
  "Surigao del Sur": ["Tandag", "Bislig", "Barobo", "Cantilan", "Hinatuan", "Lianga", "Lingig", "Madrid", "Tagbina"],
  "Basilan": ["Isabela City", "Lamitan", "Maluso", "Sumisip", "Tipo-Tipo", "Tuburan"],
  "Lanao del Sur": ["Marawi", "Balabagan", "Bumbaran", "Katai", "Malabang", "Marantao", "Ramain", "Wao"],
  "Maguindanao del Norte": ["Cotabato City", "Datu Odin Sinsuat", "Parang", "Sultan Kudarat", "Upi", "Barira", "Matanog"],
  "Maguindanao del Sur": ["Buluan", "Datu Paglas", "Datu Piang", "Isulan", "Mamasapano", "Rajah Buayan", "Shariff Aguak"],
  "Sulu": ["Jolo", "Batu-Batu", "Indanan", "Luuk", "Maimbung", "Panamao", "Patikul", "Siasi", "Talipao"],
  "Tawi-Tawi": ["Bongao", "Languyan", "Mapun", "Panglima Sugala", "Sapa-Sapa", "Simunul", "Sitangkai", "South Ubian"],
};

export const ALL_PHILIPPINES_PROVINCES = Array.from(
  new Set(Object.values(PHILIPPINES_REGION_PROVINCES_MAP).flat())
).sort();

export const ALL_PHILIPPINES_CITIES = Array.from(
  new Set(Object.values(PHILIPPINES_PROVINCE_CITIES_MAP).flat())
).sort();

export function getProvincesByRegion(regionName: string): string[] {
  return PHILIPPINES_REGION_PROVINCES_MAP[regionName] || ALL_PHILIPPINES_PROVINCES;
}

export function getCitiesByProvince(provinceName: string): string[] {
  const cities = PHILIPPINES_PROVINCE_CITIES_MAP[provinceName];
  if (cities && cities.length > 0) {
    return cities;
  }
  return [`${provinceName} Central / Capital City`];
}

export const WORK_ARRANGEMENTS = ["On-Site", "Hybrid", "Remote"] as const;

export const EXPERIENCE_LEVELS = [
  "Fresh Graduate",
  "Junior (1 - 2 years)",
  "Mid-level (3 - 5 years)",
  "Senior (5 - 8 years)",
  "Lead / Expert (8+ years)",
] as const;

export function formatExperienceLevel(level?: string | null): string {
  if (!level) return "";
  if (level.includes("Fresh Graduate") || level.includes("Entry-level")) {
    return "Fresh Graduate";
  }
  return level;
}

export function isCaviteProvince(name?: string | null): boolean {
  if (!name) return false;
  const clean = name.toLowerCase().replace(/[\(\)]/g, "").trim();
  return clean === "cavite" || clean === "province of cavite" || clean === "cavite province";
}

export function getCanonicalCaviteCity(name?: string | null): string | null {
  if (!name) return null;
  const clean = name.toLowerCase().replace(/[\(\)]/g, "").replace(/ñ/g, "n").trim();
  if (isCaviteProvince(clean)) return null;

  const found = CAVITE_CITIES.find((c) => {
    const cClean = c.toLowerCase().replace(/[\(\)]/g, "").replace(/ñ/g, "n").trim();
    if (clean === cClean) return true;
    if (clean === cClean.replace(" city", "")) return true;
    if (cClean === "cavite city") return clean === "cavite city";
    if (
      cClean.includes("general mariano alvarez") &&
      (clean === "gma" || clean === "gen. mariano alvarez" || clean === "gen mariano alvarez" || clean === "general mariano alvarez")
    ) {
      return true;
    }
    if (
      cClean.includes("general trias") &&
      (clean === "gen. trias" || clean === "gen trias" || clean === "gentri")
    ) {
      return true;
    }
    if (
      cClean.includes("general emilio aguinaldo") &&
      (clean === "bailen" || clean === "gen. emilio aguinaldo" || clean === "gen emilio aguinaldo")
    ) {
      return true;
    }
    if (
      cClean.includes("trece martires") &&
      (clean === "trece" || clean === "tmc")
    ) {
      return true;
    }
    return false;
  });
  return found || null;
}

function isKnownProvince(name?: string | null): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().replace(/[\(\)]/g, "").trim();
  return (
    isCaviteProvince(lower) ||
    lower === "metro manila" ||
    lower === "laguna" ||
    lower === "batangas" ||
    lower === "rizal" ||
    lower === "quezon" ||
    lower === "philippines" ||
    lower.includes("province")
  );
}

function parseLocationTokens(tokens: string[]): string[] {
  const result: string[] = [];
  let i = 0;
  while (i < tokens.length) {
    const cur = tokens[i];
    const next = tokens[i + 1];

    const curCaviteCity = getCanonicalCaviteCity(cur);

    if (next && isKnownProvince(next)) {
      if (curCaviteCity && isCaviteProvince(next)) {
        result.push(`${curCaviteCity}, Cavite`);
      } else {
        result.push(`${cur}, ${next}`);
      }
      i += 2;
    } else if (curCaviteCity) {
      result.push(`${curCaviteCity}, Cavite`);
      i += 1;
    } else if (isCaviteProvince(cur)) {
      if (result.length === 0 && tokens.length === 1) {
        result.push("Cavite");
      }
      i += 1;
    } else {
      result.push(cur);
      i += 1;
    }
  }
  return result;
}

export function cleanBranchLocation(item: string): string {
  if (!item) return "";
  const trimmed = item.trim();
  const parenMatch = trimmed.match(/\(([^)]+)\)$/);
  if (parenMatch && parenMatch[1]) {
    const inside = parenMatch[1].trim();
    const insideTokens = inside.split(/,\s*/).map((x) => x.trim()).filter(Boolean);
    if (insideTokens.length >= 2) {
      const paired = parseLocationTokens(insideTokens);
      if (paired.length > 0) return paired[0];
      return inside;
    }
    const city = getCanonicalCaviteCity(inside);
    if (city && !inside.toLowerCase().includes("cavite")) {
      return `${city}, Cavite`;
    }
    return inside;
  }
  const city = getCanonicalCaviteCity(trimmed);
  if (city && !trimmed.toLowerCase().includes("cavite")) {
    return `${city}, Cavite`;
  }
  return trimmed;
}

export function parseLocations(locStr?: string | null): string[] {
  if (!locStr || !locStr.trim()) return [];
  const s = locStr.trim();

  let rawList: string[] = [];

  if (s.includes(")")) {
    const parts = s.split(/(?<=\)),\s*|[;\n]+/).map((x) => x.trim()).filter(Boolean);
    for (const part of parts) {
      if (part.includes(")")) {
        rawList.push(part);
      } else {
        const sub = part.split(/;\s*|\n+/).map((x) => x.trim()).filter(Boolean);
        rawList.push(...sub);
      }
    }
  } else if (s.includes(";") || s.includes("\n")) {
    rawList = s.split(/[;\n]+/).map((x) => x.trim()).filter(Boolean);
  } else {
    const tokens = s.split(/,\s*/).map((x) => x.trim()).filter(Boolean);
    rawList = parseLocationTokens(tokens);
  }

  const cleanedList = rawList.map(cleanBranchLocation).filter(Boolean);

  const deduplicated: string[] = [];
  for (const loc of cleanedList) {
    if (!deduplicated.some((d) => d.toLowerCase() === loc.toLowerCase())) {
      deduplicated.push(loc);
    }
  }

  return deduplicated;
}

export function formatLocationWithCavite(loc?: string | null): string {
  const locs = parseLocations(loc);
  if (locs.length === 0) return "Cavite";
  return locs.join(", ");
}

export const EXP_YEARS_OPTIONS = [
  "Less than a year",
  "1 year",
  "2 years",
  "3 years",
  "4 years",
  "5+ years",
] as const;

/**
 * 1. Technical Skills (Languages, Frameworks, Developer Tools & Technical Capabilities)
 */
export const BSIT_BSCS_SKILLS = [
  "HTML / HTML5",
  "CSS / CSS3",
  "JavaScript",
  "TypeScript",
  "PHP",
  "React / Next.js",
  "Node.js / Express",
  "Python",
  "Java",
  "C# / .NET",
  "C++",
  "SQL / Relational Databases",
  "NoSQL / MongoDB",
  "Git / GitHub Version Control",
  "Figma / UI/UX Prototyping",
  "REST API / Web Services",
  "Linux / Bash Scripting",
  "Docker / Containerization",
  "Manual & Automation Testing",
  "Networking / TCP/IP & LAN/WAN",
  "Cybersecurity & Vulnerability Assessment",
  "Technical Support & Hardware Troubleshooting",
  "Data Analytics",
  "Power BI / Tableau",
  "Cloud Computing",
  "AWS",
  "Azure",
  "GCP",
  "WordPress / CMS Development",
  "Agile / Scrum Methodologies",
];

export const AVAILABLE_SKILLS_LIST = BSIT_BSCS_SKILLS;

/**
 * ============================================================================
 * COMPLETE MULTI-INDUSTRY TAXONOMY LIBRARY (CHED, TESDA, O*NET, Lightcast)
 * ============================================================================
 */

export const SHS_STRANDS_TAXONOMY = [
  "STEM - Science, Technology, Engineering, and Mathematics",
  "ABM - Accountancy, Business, and Management",
  "HUMSS - Humanities and Social Sciences",
  "TVL - ICT Information and Communications Technology",
  "TVL - Industrial Arts",
  "TVL - Home Economics",
  "TVL - Agri-Fishery Arts",
  "GAS - General Academic Strand",
];

export const EDUCATION_LEVELS_TAXONOMY = [
  "College Graduate - Bachelor's Degree",
  "College Undergraduate / Level Earner",
  "Vocational / Technical Course Graduate - TESDA NC II / NC III",
  "Associate Degree - 2-Year Program",
  "Senior High School - SHS Graduate",
  "Senior High School Undergraduate",
  "Junior High School / High School Graduate",
];

export const MULTI_INDUSTRY_COURSES = [
  "BS Information Technology - BSIT",
  "BS Computer Science - BSCS",
  "BS Information Systems - BSIS",
  "BS Business Administration - Marketing / HR / Operations",
  "BS Accountancy - BSA / Financial Management",
  "BS Hospitality Management - BSHM / Hotel & Restaurant",
  "BS Tourism Management - BSTM",
  "BS Civil Engineering - BSCE",
  "BS Electrical Engineering - BSEE",
  "BS Mechanical Engineering - BSME",
  "BS Industrial Engineering - BSIE",
  "BS Electronics Engineering - BSECE",
  "BS Nursing - BSN / Healthcare Services",
  "BS Pharmacy / Medical Technology",
  "Bachelor of Secondary Education - BSEd / Elementary Education",
  "Bachelor of Arts in Communication / Multimedia Arts",
  "BS Psychology / Human Resources",
  "BS Criminology / Law Enforcement",
  "TVL - Technical-Vocational / TESDA Specialization",
  "Associate in Computer Technology / Polytechnic Course",
];

export const IT_CLOUD_CERTIFICATIONS = [
  "AWS Certified Cloud Practitioner",
  "AWS Certified Solutions Architect – Associate",
  "AWS Certified Developer – Associate",
  "AWS Certified SysOps Administrator",
  "Microsoft Certified: Azure Fundamentals (AZ-900)",
  "Microsoft Certified: Azure Administrator Associate (AZ-104)",
  "Google Cloud Associate Cloud Engineer",
  "Google Cloud Professional Cloud Architect",
  "Cisco Certified Network Associate (CCNA)",
  "Cisco Certified Network Professional (CCNP)",
  "CompTIA Security+",
  "CompTIA Network+",
  "CompTIA A+ Service Technician",
  "CompTIA IT Fundamentals (ITF+)",
  "CompTIA Cybersecurity Analyst (CySA+)",
  "Certified Information Systems Security Professional (CISSP)",
  "Certified Ethical Hacker (CEH)",
  "Certified Information Security Manager (CISM)",
  "Certified Information Systems Auditor (CISA)",
  "Red Hat Certified System Administrator (RHCSA)",
  "Certified Kubernetes Administrator (CKA)",
  "HashiCorp Certified: Terraform Associate",
  "Docker Certified Associate (DCA)",
  "Oracle Certified Professional: Java / Database",
  "Salesforce Certified Administrator",
  "Salesforce Certified Platform Developer I",
  "ISTQB Certified Tester (CTFL)",
  "ITIL Foundation Certificate in IT Service Management",
  "ScrumAlliance Certified ScrumMaster (CSM)",
  "PMI Agile Certified Practitioner (PMI-ACP)",
];

export const PRC_CSC_CERTIFICATIONS = [
  "Civil Service Eligibility (Professional)",
  "Civil Service Eligibility (Sub-Professional)",
  "Certified Public Accountant (CPA - PRC)",
  "Licensed Professional Teacher (LPT - PRC)",
  "Registered Nurse (RN - PRC)",
  "Registered Civil Engineer (RCE - PRC)",
  "Registered Electrical Engineer (REE - PRC)",
  "Registered Mechanical Engineer (RME - PRC)",
  "Registered Electronics Engineer (ECE - PRC)",
  "Registered Chemical Engineer (PRC)",
  "Registered Industrial Engineer (CIE - PIIE)",
  "Registered Master Electrician (RME - PRC)",
  "Registered Master Plumber (PRC)",
  "Registered Architect (PRC)",
  "Registered Pharmacist (RPh - PRC)",
  "Registered Medical Technologist (RMT - PRC)",
  "Registered Criminologist (PRC)",
  "Registered Psychometrician / Psychologist (PRC)",
  "Registered Guidance Counselor (PRC)",
  "Licensed Real Estate Broker (PRC)",
  "Licensed Real Estate Appraiser (PRC)",
];

export const SAFETY_HEALTH_ENVIRONMENT_CERTIFICATIONS = [
  "Basic Occupational Safety and Health (BOSH - SO2)",
  "Construction Occupational Safety and Health (COSH - SO2)",
  "Safety Officer 1 (SO1 Certification)",
  "Safety Officer 3 (SO3 Advanced Certification)",
  "Safety Officer 4 (SO4 Specialist)",
  "Loss Control Management (LCM)",
  "Hazardous Waste Management / Pollution Control Officer (PCO - DENR EMB)",
  "Philippine Red Cross Standard First Aid & BLS/CPR",
  "ISO 9001:2015 Quality Management Lead Auditor",
  "ISO 14001:2015 Environmental Management Lead Auditor",
  "ISO 45001:2018 Occupational Health & Safety Lead Auditor",
];

export const BUSINESS_FINANCE_MANAGEMENT_CERTIFICATIONS = [
  "Project Management Professional (PMP)",
  "Certified Associate in Project Management (CAPM)",
  "Certified Bookkeeper (CB)",
  "Certified Internal Auditor (CIA)",
  "Certified Management Accountant (CMA)",
  "Chartered Financial Analyst (CFA Level I/II/III)",
  "Financial Risk Manager (FRM)",
  "Certified Fraud Examiner (CFE)",
  "Certified Payroll Professional (CPP)",
  "Six Sigma Yellow Belt",
  "Six Sigma Green Belt",
  "Six Sigma Black Belt",
  "Certified Human Resource Professional (CHRP)",
  "HubSpot Digital Marketing & Inbound Certification",
  "Google Data Analytics Professional Certificate",
  "Google Project Management Professional Certificate",
  "Google UX Design Professional Certificate",
  "Google IT Support Professional Certificate",
];

export const TESDA_VOCATIONAL_CERTIFICATIONS = [
  "TESDA Computer System Servicing (CSS) NC II",
  "TESDA Web Development NC III",
  "TESDA Visual Graphic Design NC III",
  "TESDA Electronic Products Assembly and Servicing (EPAS) NC II",
  "TESDA Bookkeeping NC III",
  "TESDA Electrical Installation and Maintenance (EIM) NC II",
  "TESDA Shielded Metal Arc Welding (SMAW) NC I / NC II",
  "TESDA Gas Metal Arc Welding (GMAW) NC II",
  "TESDA Machining NC II",
  "TESDA Pipefitting NC II",
  "TESDA Heavy Equipment Operation (Backhoe / Crane / Excavator) NC II",
  "TESDA Solar PV System Installation NC II",
  "TESDA Domestic Refrigeration and Air-Conditioning (RAC) Servicing NC II",
  "TESDA Plumbing NC II",
  "TESDA Automotive Servicing NC I / NC II",
  "TESDA Cookery NC II",
  "TESDA Bread and Pastry Production NC II",
  "TESDA Food and Beverage Services NC II",
  "TESDA Barista NC II",
  "TESDA Bartending NC II",
  "TESDA Front Office Services NC II",
  "TESDA Housekeeping NC II",
  "TESDA Caregiving NC II",
  "TESDA Emergency Medical Services NC II",
  "TESDA Events Management Services NC III",
  "TESDA Contact Center Services NC II (BPO)",
];

export const MARITIME_AVIATION_CERTIFICATIONS = [
  "MARINA Seafarer's Identification and Record Book (SIRB)",
  "MARINA Basic Safety Training (BST / STCW)",
  "MARINA Proficiency in Survival Craft and Rescue Boats (PSCRB)",
  "MARINA Advanced Fire Fighting (AFF)",
  "MARINA Medical First Aid (MFA)",
  "CAAP Private Pilot License (PPL)",
  "CAAP Commercial Pilot License (CPL)",
  "CAAP Aircraft Maintenance License (AML)",
];

export const MULTI_INDUSTRY_CERTIFICATIONS = Array.from(
  new Set([
    ...IT_CLOUD_CERTIFICATIONS,
    ...PRC_CSC_CERTIFICATIONS,
    ...SAFETY_HEALTH_ENVIRONMENT_CERTIFICATIONS,
    ...BUSINESS_FINANCE_MANAGEMENT_CERTIFICATIONS,
    ...TESDA_VOCATIONAL_CERTIFICATIONS,
    ...MARITIME_AVIATION_CERTIFICATIONS,
  ])
).sort();

export const CERTIFICATION_CATEGORIES_MAP: Record<string, string[]> = {
  "All Certification Categories": MULTI_INDUSTRY_CERTIFICATIONS,
  "IT & Cloud Infrastructure": IT_CLOUD_CERTIFICATIONS,
  "PRC Board License & Civil Service": PRC_CSC_CERTIFICATIONS,
  "Safety, Health & Environment (DOLE / OSHC)": SAFETY_HEALTH_ENVIRONMENT_CERTIFICATIONS,
  "Business, Finance & Management": BUSINESS_FINANCE_MANAGEMENT_CERTIFICATIONS,
  "TESDA & Vocational National Certificates": TESDA_VOCATIONAL_CERTIFICATIONS,
  "Maritime & Aviation Licenses": MARITIME_AVIATION_CERTIFICATIONS,
};

export const CERTIFICATION_CATEGORIES = Object.keys(CERTIFICATION_CATEGORIES_MAP);

export const SKILLS_COURSE_TAXONOMY_MAP: Record<string, string[]> = {
  "BS Information Technology": [
    "Web Development",
    "Frontend Development",
    "React",
    "Vue.js",
    "HTML / CSS",
    "Backend Development",
    "Node.js",
    "Express",
    "Python",
    "Java",
    "TypeScript & JavaScript",
    "HTML / HTML5",
    "CSS / CSS3",
    "JavaScript",
    "TypeScript",
    "React / Next.js",
    "PHP / Laravel",
    "Mobile App Development",
    "React Native",
    "Flutter",
    "Android",
    "WordPress / CMS Development",
    "REST API / Web Services",
    "UI/UX Design & Prototyping",
    "Figma",
    "Adobe XD",
    "Technical Support & Helpdesk Operations",
  ],
  "BS Computer Science": [
    "Data Structures and Algorithms",
    "Software Architecture & Design Patterns",
    "Quality Assurance & Software Testing - QA",
    "Manual & Automation Testing",
    "Python",
    "Java",
    "C# / .NET",
    "C++",
    "C Programming",
    "Linux / Bash Scripting",
    "Git / GitHub Version Control",
    "Agile / Scrum Methodologies",
    "Machine Learning & AI Fundamentals",
  ],
  "Networking & Infrastructure": [
    "Networking",
    "TCP/IP & LAN/WAN",
    "Network Configuration & Troubleshooting",
    "Cisco Packet Tracer",
    "Router & Switch Config",
    "Computer Systems Servicing & Hardware Repair",
    "Technical Support & Hardware Troubleshooting",
    "Windows Server Administration",
    "Linux System Administration",
    "Firewall & Router Configuration",
    "Virtualization",
    "VMware",
    "VirtualBox",
  ],
  "Cybersecurity & InfoSec": [
    "Cybersecurity & Information Security",
    "Cybersecurity & Vulnerability Assessment",
    "Network Security & Firewalls",
    "Penetration Testing & Ethical Hacking",
    "Information Security Compliance & Auditing",
    "Identity & Access Management - IAM",
    "Security Incident & Event Management - SIEM",
  ],
  "Cloud & DevOps Engineering": [
    "Cloud Computing",
    "AWS",
    "GCP",
    "Azure",
    "Docker / Containerization",
    "Kubernetes & Container Orchestration",
    "CI/CD Pipelines - GitHub Actions, Jenkins",
    "Infrastructure as Code - Terraform",
    "Serverless Architecture",
  ],
  "Business & Accountancy": [
    "Financial Accounting & Bookkeeping",
    "Tax Compliance & Filing - BIR",
    "Accounts Payable & Accounts Receivable - AP/AR",
    "QuickBooks",
    "Xero Accounting Software",
    "Financial Reporting & Variance Analysis",
    "Payroll Administration & Processing",
    "Auditing & Internal Control Systems",
    "Budgeting & Cash Flow Forecasting",
    "SAP / Oracle ERP Fundamentals",
  ],
  "Marketing, Sales & Customer Support": [
    "Digital Marketing & Social Media Strategy",
    "Search Engine Optimization - SEO & SEM",
    "SEO",
    "SEM",
    "Content Writing & Copywriting",
    "Customer Support & Contact Center Operations - BPO",
    "CRM Management",
    "HubSpot",
    "Salesforce",
    "B2B Sales & Lead Generation",
    "Market Research & Consumer Analysis",
    "Email Marketing & Automation",
  ],
  "Human Resources & Administration": [
    "Recruitment & Talent Acquisition",
    "Employee Relations & DOLE Labor Standards",
    "HR Information Systems - HRIS",
    "Compensation & Benefits Administration",
    "Onboarding & Training Facilitation",
    "Records & Office Document Management",
    "Performance Evaluation & Appraisal",
  ],
  "Engineering & Architecture": [
    "AutoCAD 2D / 3D Computer-Aided Drafting",
    "Revit & Building Information Modeling - BIM",
    "SolidWorks & 3D Mechanical Design",
    "Construction Project Estimation & Costing",
    "Structural Analysis & Engineering Design",
    "Electrical Wiring & Circuit Installation",
    "Quality Control & Inspection - QC/QA",
    "Safety Inspection & Compliance - BOSH / COSH",
  ],
  "Hospitality, Tourism & F&B": [
    "Food & Beverage Service - F&B",
    "Front Office & Hotel Desk Operations",
    "Hotel Property Management Systems - Opera PMS",
    "Culinary Arts & Kitchen Food Preparation",
    "Barista & Coffee Brewing Techniques",
    "Housekeeping & Sanitation Protocols",
    "Event Coordination & Banquet Planning",
    "Travel Itinerary Planning & Tour Guiding",
  ],
  "Healthcare & Allied Medical": [
    "Patient Care & Vital Signs Monitoring",
    "First Aid & Basic Life Support - BLS / CPR",
    "Medical Records Management & Billing",
    "Medication Dispensing & Pharmacology Support",
    "Phlebotomy & Clinical Specimen Handling",
    "Infection Control & Healthcare Sanitation",
    "Triage & Emergency Patient Assistance",
  ],
  "TVL-ICT & Technical Trades": [
    "Computer Systems Servicing & Hardware Repair - CSS NC II",
    "Visual Graphic Design",
    "Photoshop",
    "Illustrator",
    "Electrical Installation & Maintenance - EIM NC II",
    "Electronic Products Assembly & Servicing - EPAS NC II",
    "Shielded Metal Arc Welding - SMAW NC II",
    "Automotive Servicing & Engine Tune-up",
    "Air Conditioning & Refrigeration Servicing - RAC NC II",
    "Basic Web Page Design",
  ],
  "Creative Arts, Media & Education": [
    "Graphic Design & Branding",
    "Adobe Photoshop",
    "Illustrator",
    "Video Editing & Color Grading",
    "Premiere Pro",
    "DaVinci",
    "Motion Graphics & Animation - After Effects",
    "English Language Instruction - ESL / Online Teaching",
    "Curriculum Development & Lesson Planning",
    "Public Speaking & Presentation Skills",
    "Photography & Photo Post-Processing",
  ],
  "General Professional Skills": [
    "Project Management & Agile/Scrum",
    "Technical Documentation & User Training",
    "Critical Thinking & Problem Solving",
    "Data Analytics & Business Intelligence",
    "PowerBI",
    "Tableau",
    "Database Administration",
    "SQL",
    "PostgreSQL",
    "MongoDB",
    "ITIL Service Management Fundamentals",
    "Advanced Microsoft Excel",
    "VLOOKUP",
    "Pivot Tables",
  ],
};

export const ALL_UNIFIED_SKILLS: string[] = Array.from(
  new Set(Object.values(SKILLS_COURSE_TAXONOMY_MAP).flat())
).sort();

export const PRACTICAL_TRAINING_TAXONOMY: string[] = [
  "Capstone / Thesis Project Completion",
  "Internship / OJT Completion",
  "Professional Apprenticeship",
  "TVL - Technical-Vocational / TESDA Specialization",
];

/**
 * Unified list of qualifications ordered by tag group first, and sorted alphabetically within each tag:
 * 1. Education Levels
 * 2. College Degrees & Programs
 * 3. Senior High School Strands
 * 4. Practical Training & Tech-Voc
 */
export const ALL_UNIFIED_QUALIFICATIONS: string[] = [
  ...Array.from(new Set(EDUCATION_LEVELS_TAXONOMY)).sort(),
  ...Array.from(new Set(MULTI_INDUSTRY_COURSES.filter((c) => c !== "TVL - Technical-Vocational / TESDA Specialization"))).sort(),
  ...Array.from(new Set(SHS_STRANDS_TAXONOMY)).sort(),
  ...Array.from(new Set(PRACTICAL_TRAINING_TAXONOMY)).sort(),
];

export function getQualificationBadge(opt: string): string {
  if (EDUCATION_LEVELS_TAXONOMY.includes(opt)) return "Education Level";
  if (
    opt === "TVL - Technical-Vocational / TESDA Specialization" ||
    opt.toLowerCase().includes("tesda") ||
    opt.toLowerCase().includes("vocational")
  ) {
    return "Tech-Voc / TESDA";
  }
  if (
    opt === "Internship / OJT Completion" ||
    opt === "Capstone / Thesis Project Completion" ||
    opt === "Professional Apprenticeship" ||
    PRACTICAL_TRAINING_TAXONOMY.includes(opt) ||
    opt.toLowerCase().includes("internship") ||
    opt.toLowerCase().includes("capstone") ||
    opt.toLowerCase().includes("apprenticeship")
  ) {
    return "Practical Training";
  }
  if (SHS_STRANDS_TAXONOMY.includes(opt)) return "SHS Strand";
  if (MULTI_INDUSTRY_COURSES.includes(opt)) return "College Degree";
  return "College Degree";
}

export const ALL_UNIFIED_CERTIFICATIONS: string[] = Array.from(
  new Set(MULTI_INDUSTRY_CERTIFICATIONS)
).sort();

export const PHILIPPINES_UNIVERSITIES_COLLEGES: string[] = [
  "Cavite State University (CvSU) - Main Campus (Indang)",
  "Cavite State University (CvSU) - Bacoor Campus",
  "Cavite State University (CvSU) - Carmona Campus",
  "Cavite State University (CvSU) - Cavite City Campus",
  "Cavite State University (CvSU) - Imus Campus",
  "Cavite State University (CvSU) - Naic Campus",
  "Cavite State University (CvSU) - Rosario Campus",
  "Cavite State University (CvSU) - Silang Campus",
  "Cavite State University (CvSU) - Tanza Campus",
  "Cavite State University (CvSU) - Trece Martires Campus",
  "De La Salle University - Dasmariñas (DLSU-D)",
  "De La Salle Medical and Health Sciences Institute (DLSMHSI)",
  "Lyceum of the Philippines University (LPU) - Cavite Campus",
  "Emilio Aguinaldo College (EAC) - Cavite",
  "San Sebastian College - Recoletos de Cavite",
  "St. Dominic College of Asia (SDCA)",
  "Philippine Christian University (PCU) - Dasmariñas",
  "National University (NU) - Dasmariñas",
  "AMA Computer College - Cavite / Dasmariñas",
  "STI College - Bacoor",
  "STI College - Dasmariñas",
  "STI College - Carmona",
  "Imus Computer College (ICC)",
  "City College of Tagaytay (CCT)",
  "Polytechnic University of the Philippines (PUP) - Maragondon",
  "Technological University of the Philippines (TUP) - Cavite",
  "Far Eastern University (FEU) - Cavite",
  "Ateneo de Manila University",
  "De La Salle University - Manila",
  "University of the Philippines (UP Diliman / UPLB)",
  "University of Santo Tomas (UST)",
  "Mapúa University",
  "Adamson University",
  "University of the East (UE)",
  "Polytechnic University of the Philippines (PUP Main)",
];

export const PHILIPPINES_SENIOR_HIGH_SCHOOLS: string[] = Array.from(
  new Set([
    // Cavite High Schools & Tech-Voc
    "Alfonso National High School",
    "Amadeo National High School",
    "Bacoor City Senior High School - Dulong Bayan",
    "Bacoor City Senior High School - San Nicolas",
    "Bacoor National High School - Gawaran",
    "Bacoor National High School - Molino",
    "Bacoor National High School - Villa Maria / Main",
    "Bailen National High School (Gen. E. Aguinaldo)",
    "Binakayan National High School (Kawit)",
    "Carmona National High School",
    "Carmona Senior High School",
    "Cavite National High School - Cavite City",
    "Cavite National Science High School",
    "Cavite State University Science High School (CvSU SHS)",
    "Coastal High School - Naic",
    "Dasmariñas East National High School",
    "Dasmariñas Integrated High School",
    "Dasmariñas North National High School",
    "Dasmariñas West National High School",
    "De La Salle University - Dasmariñas Integrated School (DLSUD-IS)",
    "Emiliano Tria Tirona Memorial National High School (Kawit)",
    "Far Eastern University (FEU) - Cavite High School",
    "General Licerio Topacio National High School (Imus)",
    "General Mariano Alvarez Technical High School (GMATHS)",
    "General Trias City Senior High School",
    "General Trias National High School",
    "Governor Ferrer Memorial Integrated National High School (GFMINHS)",
    "Imus City Senior High School",
    "Imus National High School",
    "Indang National High School - Senior High",
    "Kawit National High School",
    "Lyceum of the Philippines University - Cavite (LPU SHS)",
    "Magallanes National High School",
    "Maragondon National High School",
    "Naic National High School",
    "Noveleta National High School",
    "Rosario National High School",
    "San Jose Community High School (GMA)",
    "San Sebastian College - Recoletos de Cavite High School",
    "Silang National High School",
    "Tagaytay City National High School",
    "Tagaytay City Science National High School",
    "Tanza National Comprehensive High School",
    "Tanza National Trade School (TNTS)",
    "Trece Martires City National High School",
    "Trece Martires City Senior High School (TMCSHS)",
    "University of Perpetual Help System DALTA - Molino High School",

    // Philippine Science High School (PSHS) Campuses Nationwide
    "Philippine Science High School - Main Campus (Diliman, Quezon City)",
    "Philippine Science High School - Ilocos Region Campus (San Ildefonso, Ilocos Sur)",
    "Philippine Science High School - Cagayan Valley Campus (Bayombong, Nueva Vizcaya)",
    "Philippine Science High School - Cordillera Administrative Region Campus (Baguio City)",
    "Philippine Science High School - Central Luzon Campus (Clark, Pampanga)",
    "Philippine Science High School - CALABARZON Region Campus (Batangas City)",
    "Philippine Science High School - MIMAROPA Region Campus (Odiongan, Romblon)",
    "Philippine Science High School - Bicol Region Campus (Goa, Camarines Sur)",
    "Philippine Science High School - Western Visayas Campus (Jaro, Iloilo City)",
    "Philippine Science High School - Central Visayas Campus (Argao, Cebu)",
    "Philippine Science High School - Eastern Visayas Campus (Palo, Leyte)",
    "Philippine Science High School - Zamboanga Peninsula Campus (Dipolog City)",
    "Philippine Science High School - Central Mindanao Campus (Balo-i, Lanao del Norte)",
    "Philippine Science High School - Southern Mindanao Campus (Tugbok, Davao City)",
    "Philippine Science High School - SOCCSKSARGEN Region Campus (Koronadal City)",
    "Philippine Science High School - Caraga Region Campus (Butuan City)",

    // NCR / Metro Manila High Schools
    "Adamson University Senior High School",
    "Araullo High School (Manila)",
    "Arellano University High School (Manila / Pasay / Pasig)",
    "Ateneo de Manila Senior High School (Quezon City)",
    "Bagong Silang High School (Caloocan)",
    "Batasan Hills National High School (Quezon City)",
    "Benigno 'Ninoy' S. Aquino High School (Makati)",
    "Caloocan City Science High School",
    "Caloocan High School",
    "Camarin High School (Caloocan)",
    "Centro Escolar University (CEU) Senior High School",
    "Commonwealth High School (Quezon City)",
    "Concepcion Integrated School (Marikina)",
    "De La Salle University Senior High School (Manila / Laguna)",
    "Dr. Arcadio Santos National High School (Parañaque)",
    "Ernesto Rondon High School (Quezon City)",
    "Eusebio High School (Pasig)",
    "Far Eastern University (FEU) High School (Manila)",
    "Fort Bonifacio High School (Makati)",
    "Judge Feliciano Belmonte Sr. High School (Quezon City)",
    "Las Piñas City National Science High School",
    "Las Piñas National High School - Main / Almanza",
    "Makati High School",
    "Makati Science High School",
    "Malabon National High School",
    "Malinta National High School (Valenzuela)",
    "Mandaluyong High School",
    "Manila High School (Intramuros)",
    "Manila Science High School",
    "Mapúa University Senior High School (Intramuros / Makati)",
    "Marikina High School",
    "Marikina Science High School",
    "Moonwalk National High School (Parañaque)",
    "Muntinlupa National High School",
    "Muntinlupa Science High School",
    "National University (NU) Senior High School (Manila / MOA / Fairview)",
    "Navotas National High School",
    "Our Lady of Fatima University (OLFU) Basic Education (Valenzuela / QC)",
    "Parañaque National High School - Main",
    "Parañaque Science High School",
    "Parang High School (Marikina)",
    "Pasay City North High School",
    "Pasay City South High School",
    "Pasay City West High School",
    "Pasig City Science High School",
    "Pedro E. Diaz High School (Muntinlupa)",
    "Pinagbuhatan High School (Pasig)",
    "Quezon City High School",
    "Quezon City Science High School",
    "Quirino High School (Quezon City)",
    "Ramon Magsaysay High School (Cubao, Quezon City)",
    "Ramon Magsaysay High School (Manila)",
    "Rizal High School (Pasig City)",
    "Sagad High School (Pasig)",
    "San Beda University Senior High School (Manila / Taytay)",
    "San Francisco High School (Quezon City)",
    "Sen. Renato 'Compañero' Cayetano Memorial Science and Technology High School (Taguig)",
    "Signal Village National High School (Taguig)",
    "Taguig National High School",
    "Taguig Science High School",
    "Technological Institute of the Philippines (TIP) Senior High School",
    "University of Santo Tomas (UST) Senior High School",
    "University of the East (UE) Basic Education Department",
    "University of the Philippines Integrated School (UPIS - Diliman)",
    "Upper Bicutan National High School (Taguig)",
    "Valenzuela City Science High School",
    "Valenzuela National High School",
    "Victorino Mapa High School (Manila)",
    "Western Bicutan National High School (Taguig)",

    // Region IV-A (Laguna, Batangas, Rizal, Quezon)
    "Angono National High School (Rizal)",
    "Antipolo City Senior High School",
    "Antipolo National High School",
    "Balayan National High School (Batangas)",
    "Batangas National High School (Batangas City)",
    "Batangas Province Science High School",
    "Bauan Technical High School (Batangas)",
    "Biñan City Senior High School",
    "Cabuyao Integrated National High School",
    "Cainta Catholic College - High School",
    "Calamba Bayside Integrated High School",
    "Calamba City Science High School",
    "Camp Vicente Lim Integrated School (Calamba)",
    "Candelaria Institute of Technology High School",
    "Francisco P. Felix Memorial National High School (Cainta)",
    "Gov. Feliciano Leviste Memorial National High School (Malvar, Batangas)",
    "Gumaca National High School (Quezon)",
    "Laguna State Polytechnic University (LSPU) Laboratory High School",
    "Lemery National High School (Batangas)",
    "Lipa City National High School",
    "Lipa City Science High School",
    "Los Baños National High School",
    "Lucena City National High School",
    "Morong National High School (Rizal)",
    "Nasugbu East National High School",
    "Pacita Complex National High School (San Pedro, Laguna)",
    "Pedro Guevara Memorial National High School (Santa Cruz, Laguna)",
    "Quezon National High School (Lucena City)",
    "Rizal National Science High School (Binangonan, Rizal)",
    "Rodriguez National High School (Montalban, Rizal)",
    "San Mateo National High School (Rizal)",
    "San Pedro Relocation Center National High School (SPRCNHS)",
    "Santa Rosa Educational Institution",
    "Santa Rosa Science and Technology High School",
    "Sariaya National High School (Quezon)",
    "Tanauan City Integrated High School",
    "Tanauan City National High School",
    "Tanay National High School (Rizal)",
    "Tayabas Western Academy High School",
    "Taytay National High School (Rizal)",
    "University of the Philippines Rural High School (UPRHS - Los Baños)",

    // Region III (Central Luzon)
    "Angeles City National High School (Pampanga)",
    "Angeles City Science High School",
    "Baliuag National High School (Mariano Ponce NHS)",
    "Bataan National High School (Balanga City)",
    "Bataan Peninsula State University - Laboratory High School",
    "Bulihan National High School (Malolos, Bulacan)",
    "Capas National High School (Tarlac)",
    "Central Luzon State University (CLSU) Science High School (Muñoz)",
    "City of San Jose del Monte National Science High School",
    "Guagua National Colleges High School",
    "Honorato C. Perez Sr. Memorial Science High School (Cabanatuan)",
    "Mabalacat National High School (Pampanga)",
    "Marcelo H. del Pilar National High School (Malolos, Bulacan)",
    "Marilao National High School (Bulacan)",
    "Mariveles National High School - Camaya (Bataan)",
    "Meycauayan National High School (Bulacan)",
    "Muñoz National High School - Main (Nueva Ecija)",
    "Nueva Ecija High School (Cabanatuan City)",
    "Olongapo City National High School",
    "Pampanga High School (City of San Fernando)",
    "Regional Science High School III (Olongapo City)",
    "San Jose del Monte National High School (Bulacan)",
    "Santa Maria National High School (Bulacan)",
    "Subic National High School",
    "Tarlac National High School",
    "Zambales National High School (Iba)",

    // Northern Luzon & CAR (Regions I, II, CAR)
    "Alaminos City National High School (Pangasinan)",
    "Baguio City National High School (BCNHS - Main)",
    "Cagayan National High School (Tuguegarao City)",
    "Cauayan City National High School (Isabela)",
    "Dagupan City National High School (Pangasinan)",
    "Ilocos Norte National High School (Laoag City)",
    "Ilocos Sur National High School (Vigan City)",
    "Isabela National High School (Ilagan City)",
    "La Union National High School (San Fernando)",
    "Mariano Marcos State University Laboratory High School (Batac)",
    "Nueva Vizcaya General Comprehensive High School (Bayombong)",
    "Pangasinan National High School (Lingayen)",
    "Pines City National High School (Baguio City)",
    "Saint Louis University Laboratory High School (Baguio City)",
    "San Carlos City National High School (Pangasinan)",
    "Santiago City National High School (Isabela)",
    "Tuguegarao City Science High School",
    "University of the Cordilleras High School",
    "Urdaneta City National High School (Pangasinan)",

    // MIMAROPA & Bicol Region (Regions IV-B & V)
    "Albay Central School / Albay High School (Legazpi City)",
    "Ateneo de Naga University Junior & Senior High School",
    "Bicol University Laboratory High School (Legazpi City)",
    "Camarines Norte National High School (Daet)",
    "Camarines Sur National High School (Naga City)",
    "Catanduanes National High School (Virac)",
    "Legazpi City National High School",
    "Marinduque National High School (Boac)",
    "Masbate National Comprehensive High School",
    "Naga City Science High School",
    "Occidental Mindoro National High School (San Jose)",
    "Oriental Mindoro National High School (Calapan City)",
    "Palawan National School (Puerto Princesa)",
    "Puerto Princesa City National Science High School",
    "Romblon National High School",
    "Sorsogon National High School",

    // Visayas (Regions VI, VII, VIII)
    "Abellana National School (Cebu City)",
    "Aklan National High School for Arts and Trades (Kalibo)",
    "Antique National School (San Jose de Buenavista)",
    "Bacolod City National High School",
    "Capiz National High School (Roxas City)",
    "Cebu City National Science High School",
    "Cebu Normal University - Integrated Laboratory School",
    "Central Philippine University (CPU) High School (Iloilo City)",
    "Dr. Cecilio Putong National High School (Tagbilaran City, Bohol)",
    "Dumaguete Science High School",
    "Eastern Samar National Comprehensive High School (Borongan)",
    "Holy Name University High School (Tagbilaran City)",
    "Iloilo National High School",
    "Lapu-Lapu City National High School",
    "Leyte National High School (Tacloban City)",
    "Mandaue City Comprehensive National High School",
    "Negros Occidental High School (Bacolod City)",
    "Negros Oriental High School (Dumaguete City)",
    "Northern Samar National High School (Catarman)",
    "Ormoc City National High School",
    "Samar National School (Catbalogan City)",
    "Silliman University High School (Dumaguete City)",
    "Siquijor Provincial Science High School",
    "Tacloban City National High School",
    "Tagbilaran City Science High School (Bohol)",
    "Talisay City National High School (Cebu)",
    "Toledo City National High School (Cebu)",
    "University of San Carlos (USC) Basic Education Department (Cebu)",
    "University of St. La Salle - Integrated School (Bacolod)",
    "University of the Philippines High School in Iloilo (UPHSI)",
    "West Visayas State University (WVSU) Integrated Laboratory School",

    // Mindanao (Regions IX, X, XI, XII, CARAGA, BARMM)
    "Agusan National High School (Butuan City)",
    "Ateneo de Davao University Junior & Senior High School",
    "Ateneo de Zamboanga University High School",
    "Bayugan National Comprehensive High School (Agusan del Sur)",
    "Bukidnon National High School (Malaybalay City)",
    "Cagayan de Oro National High School",
    "Cotabato City National High School",
    "Daniel R. Aguinaldo National High School (Davao City)",
    "Davao City National High School (DCNHS)",
    "Digos City National High School",
    "Dipolog City National High School",
    "Father Saturnino Urios University High School (Butuan City)",
    "General Santos City National High School",
    "Iligan City National High School",
    "Kidapawan City National High School",
    "Koronadal National Comprehensive High School",
    "Mati National Comprehensive High School (Davao Oriental)",
    "Misamis Oriental General Comprehensive High School (MOGCHS - CDO)",
    "Notre Dame of Dadiangas University High School (GenSan)",
    "Ozamiz City National High School",
    "Pagadian City National High School",
    "Panabo City National High School",
    "Regional Science High School IX (Zamboanga City)",
    "Surigao City National High School",
    "Tacurong National High School (Sultan Kudarat)",
    "Tagum City National High School",
    "Tandag National Science High School (Surigao del Sur)",
    "University of the Immaculate Conception High School (Davao)",
    "Valencia City National High School (Bukidnon)",
    "Xavier University - Ateneo de Cagayan High School",
    "Zamboanga City High School (Main)",
    "Zamboanga City State Polytechnic College High School",

    // Vocational, Technical, and Training Institutions (TESDA & Tech-Voc)
    "Cavite Provincial Training Center (TESDA PTC - Rosario / Paliparan)",
    "CITE Technical Institute (San Jose, Cebu City)",
    "Don Bosco Boys Home and Training Center - Liloan, Cebu",
    "Don Bosco Technical College - Mandaluyong (DBTC)",
    "Don Bosco Technical Institute - Makati (DBTI Makati)",
    "Don Bosco Training Center - San Jose, Nueva Ecija",
    "Don Bosco TVET Center - Canlubang, Laguna",
    "Don Bosco TVET Center - Tondo, Manila",
    "Dualtech Training Center (Canlubang, Laguna)",
    "Jacobo Z. Gonzales Memorial National Agricultural School (Biñan)",
    "MFI Polytechnic Institute (Pasig / Calamba)",
    "Quezon National Agricultural School (Pagbilao, Quezon)",
    "Regional Training Center - Central Luzon (TESDA Guiguinto / Mariveles)",
    "Regional Training Center - Central Visayas (TESDA Cebu City)",
    "Regional Training Center - Davao (Korea-Philippines Vocational Training Center)",
    "Regional Training Center - Ilocos Region (TESDA San Fernando, La Union)",
    "Regional Training Center - NCR (TESDA Taguig)",
    "Regional Training Center - Northern Mindanao (TESDA Tagoloan)",
    "Regional Training Center - Western Visayas (TESDA Talisay City)",
    "Regional Training Center - Zamboanga Peninsula (TESDA Zamboanga City)",
    "Rizal Provincial Technical Education and Skills Development Center (Binangonan)",
    "Technical Education and Skills Development Authority (TESDA) - Regional Training Center IV-A",
    "Technical Education and Skills Development Authority (TESDA) - Women's Center",

    // Nationwide Private Senior High School Networks
    "AMA Basic Education / Senior High School",
    "AMA Computer Learning Center (ACLC) Senior High School",
    "APEC Schools (Affordable Private Education Center)",
    "Informatics College Senior High School",
    "Phinma Education Senior High Schools",
    "STI Senior High School",
  ])
).sort();

export async function fetchPhilippineUniversitiesApi(): Promise<string[]> {
  return PHILIPPINES_UNIVERSITIES_COLLEGES;
}

/**
 * 2. Educational Qualifications (Degrees, Bootcamps, OJT, & Formal Training)
 */
export const BSIT_BSCS_QUALIFICATIONS = ALL_UNIFIED_QUALIFICATIONS;

/**
 * 3. Professional Certifications (Recognized Industry Credentials & Vendor Certificates)
 */
export const BSIT_BSCS_CERTIFICATIONS = ALL_UNIFIED_CERTIFICATIONS;

export interface JobRoleDefinition {
  title: string;
  category: "Software & Web" | "Infrastructure & Systems" | "Data & Security" | "Design & Management";
  aliases: string[];
  keywords: string[];
  description: string;
}

export const IT_JOB_ROLES_TAXONOMY: JobRoleDefinition[] = [
  {
    title: "Web Developer",
    category: "Software & Web",
    aliases: [
      "Web Developer",
      "Web Development",
      "Frontend Developer",
      "Backend Developer",
      "Web Engineer",
      "Web Programmer",
      "PHP Developer",
      "JavaScript Developer",
      "React Developer",
    ],
    keywords: [
      "HTML",
      "HTML5",
      "CSS",
      "CSS3",
      "JavaScript",
      "TypeScript",
      "PHP",
      "React",
      "Node.js",
      "Vue.js",
      "Angular",
      "Next.js",
      "Bootstrap",
      "Tailwind CSS",
      "Sass",
      "REST API",
      "WordPress",
      "Laravel",
      "Web Development",
      "Frontend",
      "Backend",
      "MySQL",
      "Responsive Design",
      "JSON",
    ],
    description: "Builds and maintains websites, web applications, and web services using modern frontend and backend technologies.",
  },
  {
    title: "Full-Stack Developer",
    category: "Software & Web",
    aliases: [
      "Full-Stack Developer",
      "Full Stack Developer",
      "Full-Stack Engineer",
      "Full Stack Engineer",
      "Fullstack Developer",
    ],
    keywords: [
      "HTML",
      "CSS",
      "JavaScript",
      "TypeScript",
      "Node.js",
      "React",
      "Express",
      "Python",
      "Django",
      "MongoDB",
      "PostgreSQL",
      "SQL",
      "REST API",
      "GraphQL",
      "Git",
      "Full-Stack",
      "Full Stack Development",
      "API Development",
      "MySQL",
      "Docker",
    ],
    description: "Designs and develops both client-side and server-side components of web applications.",
  },
  {
    title: "Software Engineer",
    category: "Software & Web",
    aliases: [
      "Software Engineer",
      "Software Developer",
      "Application Developer",
      "Programmer",
      "Java Developer",
      "C# Developer",
      "Python Developer",
    ],
    keywords: [
      "Java",
      "Python",
      "C#",
      "C++",
      ".NET",
      "Object-Oriented Programming (OOP)",
      "Data Structures and Algorithms",
      "Software Engineering",
      "Design Patterns",
      "Git",
      "Unit Testing",
      "CI/CD",
      "API Development",
      "Software Testing",
      "Algorithms",
      "Clean Architecture",
    ],
    description: "Applies computer science engineering principles to design, construct, test, and maintain robust software systems.",
  },
  {
    title: "IT Support Specialist / IT Support Staff",
    category: "Infrastructure & Systems",
    aliases: [
      "IT Support Specialist",
      "IT Support Staff",
      "Technical Support Specialist",
      "IT Helpdesk",
      "Desktop Support",
      "Helpdesk Technician",
      "Technical Support Staff",
    ],
    keywords: [
      "Technical Support",
      "Helpdesk",
      "Hardware",
      "Troubleshooting",
      "Windows 10/11",
      "Software Installation",
      "PC Assembly",
      "Printer Troubleshooting",
      "LAN",
      "CompTIA A+",
      "CompTIA IT Fundamentals (ITF+)",
      "Customer Support",
      "Networking Basics",
      "Active Directory Basics",
      "Desktop Support",
      "Ticketing System",
    ],
    description: "Provides frontline hardware, software, and networking technical support to end users and organizations.",
  },
  {
    title: "Database Administrator",
    category: "Data & Security",
    aliases: [
      "Database Administrator",
      "DBA",
      "Database Engineer",
      "Database Specialist",
      "SQL Developer",
      "Database Developer",
    ],
    keywords: [
      "SQL",
      "Database Management",
      "MySQL",
      "PostgreSQL",
      "Oracle",
      "MS SQL Server",
      "MongoDB",
      "Query Optimization",
      "Stored Procedures",
      "ETL",
      "Data Modeling",
      "Database Design",
      "Backup and Recovery",
      "Database Security",
      "Database Administration",
      "Database Indexing",
    ],
    description: "Manages, optimizes, secures, and maintains relational and non-relational database management systems.",
  },
  {
    title: "System Administrator",
    category: "Infrastructure & Systems",
    aliases: [
      "System Administrator",
      "SysAdmin",
      "Server Administrator",
      "Linux Administrator",
      "Windows Administrator",
      "Systems Engineer",
    ],
    keywords: [
      "Linux",
      "Ubuntu",
      "CentOS",
      "Windows Server",
      "Active Directory",
      "Bash",
      "PowerShell",
      "Virtualization",
      "VMware",
      "VirtualBox",
      "Server Management",
      "System Administration",
      "DNS",
      "DHCP",
      "SysAdmin",
      "Server Configuration",
    ],
    description: "Oversees the uptime, configuration, security, and operation of multi-user computing systems and servers.",
  },
  {
    title: "Network Engineer",
    category: "Infrastructure & Systems",
    aliases: [
      "Network Engineer",
      "Network Administrator",
      "Network Specialist",
      "Network Technician",
    ],
    keywords: [
      "Cisco",
      "CCNA",
      "Cisco Certified Network Associate (CCNA)",
      "Routing and Switching",
      "TCP/IP",
      "LAN/WAN",
      "Subnetting",
      "VLAN",
      "Firewalls",
      "VPN",
      "Network Troubleshooting",
      "Wireshark",
      "Network Security",
      "Network Protocols",
      "Routers",
      "Switches",
      "Packet Tracer",
    ],
    description: "Plans, implements, optimizes, and secures enterprise telecommunications and computer network infrastructures.",
  },
  {
    title: "Quality Assurance (QA) Tester",
    category: "Software & Web",
    aliases: [
      "Quality Assurance (QA) Tester",
      "QA Tester",
      "Software QA Engineer",
      "Test Engineer",
      "QA Analyst",
      "Software Tester",
    ],
    keywords: [
      "Software Testing",
      "Quality Assurance",
      "QA",
      "Manual Testing",
      "Test Cases",
      "Test Plans",
      "Bug Tracking",
      "Jira",
      "Selenium",
      "Postman",
      "API Testing",
      "Regression Testing",
      "Automation Testing",
      "Black Box Testing",
      "Cypress",
      "Quality Control",
    ],
    description: "Tests software products to identify bugs, verify functional requirements, and ensure optimal user experiences.",
  },
  {
    title: "Cybersecurity Analyst Junior",
    category: "Data & Security",
    aliases: [
      "Cybersecurity Analyst Junior",
      "Cybersecurity Analyst",
      "Information Security Analyst",
      "SOC Analyst",
      "Security Analyst",
    ],
    keywords: [
      "Cybersecurity",
      "Network Security",
      "Vulnerability Assessment",
      "Firewalls",
      "Incident Response",
      "Fortinet",
      "Fortinet Certified Associate Cybersecurity",
      "CompTIA Security+",
      "Penetration Testing",
      "Information Security",
      "SIEM",
      "Malware Analysis",
      "Ethical Hacking",
      "Threat Detection",
      "Data Protection",
    ],
    description: "Monitors, detects, investigates, and responds to cybersecurity events, vulnerabilities, and threats.",
  },
  {
    title: "Cloud Support Associate",
    category: "Infrastructure & Systems",
    aliases: [
      "Cloud Support Associate",
      "Cloud Engineer",
      "Cloud Specialist",
      "Cloud Associate",
      "AWS Cloud Associate",
    ],
    keywords: [
      "AWS",
      "Amazon Web Services",
      "Microsoft Azure",
      "Google Cloud",
      "GCP",
      "Cloud Fundamentals",
      "AWS Certified Cloud Practitioner",
      "Microsoft Certified: Azure Fundamentals (AZ-900)",
      "Docker",
      "Virtual Machines",
      "Cloud Storage",
      "Cloud Computing",
      "Cloud Support",
      "Terraform",
    ],
    description: "Assists organizations in deploying, monitoring, troubleshooting, and supporting cloud infrastructure environments.",
  },
  {
    title: "Data Analyst Junior",
    category: "Data & Security",
    aliases: [
      "Data Analyst Junior",
      "Data Analyst",
      "Junior Data Analyst",
      "BI Analyst",
      "Data Analytics Specialist",
    ],
    keywords: [
      "Data Analytics",
      "Data Analytics Training",
      "SQL",
      "Python",
      "Pandas",
      "Excel",
      "Power BI",
      "Tableau",
      "Data Visualization",
      "Data Cleaning",
      "Statistics",
      "Reporting",
      "BigQuery",
      "Data Extraction",
      "Business Intelligence",
    ],
    description: "Cleans, analyzes, and visualizes complex data sets to help organizations make informed business decisions.",
  },
  {
    title: "UI/UX Designer",
    category: "Design & Management",
    aliases: [
      "UI/UX Designer",
      "UI Designer",
      "UX Designer",
      "Product Designer",
      "User Interface Designer",
    ],
    keywords: [
      "Figma",
      "Adobe XD",
      "UI/UX Fundamentals",
      "Wireframing",
      "Prototyping",
      "User Research",
      "Usability Testing",
      "Design Systems",
      "HTML",
      "CSS",
      "Interaction Design",
      "Visual Design",
      "User Flow",
      "Mockups",
    ],
    description: "Crafts intuitive, user-friendly digital product interfaces, wireframes, prototypes, and user experiences.",
  },
  {
    title: "Business/Systems Analyst",
    category: "Design & Management",
    aliases: [
      "Business/Systems Analyst",
      "Business Analyst",
      "Systems Analyst",
      "IT Business Analyst",
    ],
    keywords: [
      "System Analysis",
      "Requirements Gathering",
      "UML",
      "Use Cases",
      "Business Process Modeling",
      "Flowcharts",
      "Agile",
      "Scrum",
      "Documentation",
      "Functional Specifications",
      "Gap Analysis",
      "Stakeholder Analysis",
    ],
    description: "Bridges the gap between business stakeholders and IT engineering teams by analyzing requirements and workflows.",
  },
  {
    title: "IT Project Coordinator",
    category: "Design & Management",
    aliases: [
      "IT Project Coordinator",
      "Project Coordinator",
      "Associate Project Manager",
      "Scrum Coordinator",
    ],
    keywords: [
      "Project Management",
      "Agile",
      "Scrum",
      "Scrum Fundamentals Certified (SFC)",
      "Jira",
      "Trello",
      "Sprint Planning",
      "Milestone Tracking",
      "Stakeholder Communication",
      "Documentation",
      "Resource Allocation",
      "Project Scheduling",
    ],
    description: "Coordinates technical projects, schedules sprints, tracks deliverables, and facilitates team communication.",
  },
];

/**
 * Top popular filter keywords displayed as clickable pill badges in search & filter UI.
 */
export const POPULAR_KEYWORD_FILTERS: string[] = [
  "HTML",
  "CSS",
  "PHP",
  "JavaScript",
  "TypeScript",
  "React",
  "Node.js",
  "Python",
  "Java",
  "SQL",
  "C#",
  "Figma",
  "AWS",
  "CCNA",
  "Linux",
  "Docker",
  "QA / Testing",
  "WordPress",
];

/**
 * Returns all keywords associated with a given job role.
 */
export function getKeywordsForJobRole(roleTitle: string): string[] {
  if (!roleTitle || !roleTitle.trim()) return [];
  const normalized = roleTitle.trim().toLowerCase();

  const matchedDef = IT_JOB_ROLES_TAXONOMY.find((role) => {
    if (role.title.toLowerCase() === normalized) return true;
    if (role.aliases.some((alias) => alias.toLowerCase() === normalized || normalized.includes(alias.toLowerCase()))) {
      return true;
    }
    return false;
  });

  return matchedDef ? matchedDef.keywords : [];
}

/**
 * Given a keyword (e.g. "PHP", "HTML", "SQL", "Figma"), returns all role definitions that use that keyword.
 */
export function getRelatedJobRolesForKeyword(keyword: string): JobRoleDefinition[] {
  if (!keyword || !keyword.trim()) return [];
  const query = keyword.trim().toLowerCase();

  return IT_JOB_ROLES_TAXONOMY.filter((role) => {
    if (role.title.toLowerCase().includes(query) || query.includes(role.title.toLowerCase())) {
      return true;
    }
    if (role.aliases.some((alias) => alias.toLowerCase().includes(query) || query.includes(alias.toLowerCase()))) {
      return true;
    }
    return role.keywords.some((kw) => kw.toLowerCase() === query || kw.toLowerCase().includes(query));
  });
}

/**
 * Checks if a job listing matches a search query using direct text match AND semantic role keyword matching.
 */
export function matchesJobWithTaxonomy(
  job: {
    title: string;
    description?: string | null;
    qualifications?: string | null;
    required_skills?: string | null;
    badges?: string[];
  },
  query: string
): boolean {
  if (!query || !query.trim()) return true;
  const q = query.trim().toLowerCase();

  // 1. Direct match on title, description, skills, qualifications, badges
  const textHaystack = [
    job.title,
    job.description || "",
    job.qualifications || "",
    job.required_skills || "",
    ...(job.badges || []),
  ].join(" ").toLowerCase();

  if (textHaystack.includes(q)) return true;

  // 2. Keyword-to-Role Expansion:
  const rolesMatchingQuery = getRelatedJobRolesForKeyword(q);
  const jobTitleLower = job.title.toLowerCase();
  for (const role of rolesMatchingQuery) {
    if (
      jobTitleLower.includes(role.title.toLowerCase()) ||
      role.aliases.some((alias) => jobTitleLower.includes(alias.toLowerCase()))
    ) {
      return true;
    }
  }

  // 3. Role-to-Keyword Expansion:
  const roleKeywords = getKeywordsForJobRole(q);
  if (roleKeywords.length > 0) {
    const hasAnyKeyword = roleKeywords.some((kw) => textHaystack.includes(kw.toLowerCase()));
    if (hasAnyKeyword) return true;
  }

  return false;
}

/**
 * 100% Local Haversine Distance Calculation (in kilometers).
 * Computes direct spherical distance between two sets of GPS coordinates.
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Parses raw text, JSON arrays, or comma/newline/bullet-delimited strings
 * into a clean array of string tokens.
 */
export function parseItemList(
  raw?: string | null,
  fallback: string[] = []
): string[] {
  if (!raw || !raw.trim()) return fallback;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const res = parsed
        .map((item) => {
          if (typeof item === "object" && item !== null && item.name) {
            return item.years ? `${item.name} (${item.years})` : String(item.name);
          }
          return String(item).trim();
        })
        .filter(Boolean);
      if (res.length > 0) return res;
    }
  } catch {}
  return raw
    .split(/[\n,;•|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const match = token.match(/^(.*?)\s*\((.*?)\)$/);
      if (match) {
        return `${match[1].trim()} (${match[2].trim()})`;
      }
      return token;
    });
}

/**
 * Checks if a combined haystack string matches a search query keyword.
 */
export function matchesKeyword(haystack: string, keyword: string): boolean {
  if (!keyword || !keyword.trim()) return true;
  return haystack.toLowerCase().includes(keyword.trim().toLowerCase());
}

/**
 * Matches a candidate distance against a selected radius filter.
 */
export function matchesRadius(
  distanceKm: number | undefined,
  selectedRadius: "all" | "5" | "10" | "15" | string
): boolean {
  if (selectedRadius === "all" || !selectedRadius) return true;
  if (distanceKm === undefined || Number.isNaN(distanceKm)) return false;
  const radiusNum = Number(selectedRadius);
  return distanceKm <= radiusNum;
}

export function parseExpectedSalary(raw: string | number | null | undefined): number {
  if (!raw) return 0;
  if (typeof raw === "number") return raw;
  const firstPart = String(raw).split("-")[0];
  const amount = Number(firstPart.replace(/[^0-9.]/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

export const PREFERRED_LOCATION_OPTIONS: string[] = Array.from(
  new Set([
    "Open to Any Location in Cavite",
    "Open to Relocation / Remote",
    ...CAVITE_CITIES,
    "Makati City",
    "Taguig City / BGC",
    "Pasig City",
    "Quezon City",
    "Mandaluyong City",
    "Pasay City",
    "Parañaque City",
    "Muntinlupa City / Alabang",
    "Santa Rosa, Laguna",
    "Calamba, Laguna",
    "Biñan, Laguna",
  ])
).sort();

export type CandidateMatchInput = {
  desired_job_title?: string | null;
  work_arrangement?: string | null;
  expected_salary?: number | string | null;
  distance_km?: number;
  city?: string | null;
  address?: string | null;
  preferred_locations?: string | null;
  skills?: string | null;
  qualifications?: string | null;
  certifications?: string | null;
};

export type JobMatchInput = {
  title?: string;
  work_arrangement?: string;
  location?: string;
  city?: string;
  required_skills?: string | null;
  skills?: string | null;
  required_qualifications?: string | null;
  qualifications?: string | null;
  required_certifications?: string | null;
  certifications?: string | null;
  salary_min?: number | string;
  salary_max?: number | string;
  min_salary?: number | string;
  max_salary?: number | string;
};

export function calculateCandidateMatch(
  cand?: CandidateMatchInput | null,
  job?: JobMatchInput | null
): number {
  if (!cand || !job) return 0;

  const jobCard: JobCardInput = {
    id: 0,
    title: job.title || "",
    location: job.location || job.city || "Cavite",
    salaryMin: Number(job.salary_min ?? job.min_salary) || 0,
    setup: job.work_arrangement || "On-Site",
    skillTags: parseCompetencyDisplayTags(job.required_skills ?? job.skills, "skills"),
    qualTags: parseCompetencyDisplayTags(job.required_qualifications ?? job.qualifications, "qualifications"),
    certTags: parseCompetencyDisplayTags(job.required_certifications ?? job.certifications, "certifications"),
  };

  const applicantProfile: ApplicantProfileInput = {
    desiredJobTitle: cand.desired_job_title || "",
    workArrangement: cand.work_arrangement || "Any",
    expectedSalary: cand.expected_salary ? parseExpectedSalary(cand.expected_salary) : 0,
    city: cand.city || cand.address || "Cavite",
    preferred_locations: parseCompetencyDisplayTags(cand.preferred_locations),
    skills: parseCompetencyDisplayTags(cand.skills, "skills"),
    qualifications: parseCompetencyDisplayTags(cand.qualifications, "qualifications"),
    certifications: parseCompetencyDisplayTags(cand.certifications, "certifications"),
  };

  return calculateJobMatchDetails(jobCard, applicantProfile).score;
}

export type ApplicantProfileInput = {
  desiredJobTitle?: string;
  workArrangement?: string;
  expectedSalary?: number;
  city?: string;
  preferredCities?: string[];
  preferred_locations?: string[];
  skills?: string[];
  qualifications?: string[];
  certifications?: string[];
  shsStrand?: string;
  shsSchool?: string;
  shsGradYear?: string;
  collegeGradYear?: string;
  vocationalGradYear?: string;
  isNonGraduateCertHolder?: boolean;
};

export type JobCardInput = {
  id: number;
  title: string;
  location: string;
  salaryMin: number;
  setup: string;
  skillTags?: string[];
  qualTags?: string[];
  certTags?: string[];
  createdRank?: number;
};

export function inferMatchScore(index: number = 0): number {
  const base = 80 - index * 7;
  return Math.max(35, Math.min(92, base));
}

/**
 * Jobseeker / Applicant perspective:
 * Calculates personalized match score (0-100%) and criteria breakdown.
 */
export type JobMatchDetailsResult = {
  score: number;
  breakdown: string;
  skillsPts: number;
  qualPts: number;
  certPts?: number;
  maxSkillsPts?: number;
  maxQualPts?: number;
  maxCertPts?: number;
  setupPts: number;
  salaryPts: number;
  locationPts: number;
  titleBonus: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchedQuals: string[];
  missingQuals: string[];
  matchedCerts?: string[];
  missingCerts?: string[];
  setupSummary: string;
  salarySummary: string;
  locationSummary: string;
  recommendations: string[];
};

// Skill / competency keyword ontology mapping
export const SKILL_KEYWORD_TAXONOMY: Record<string, string[]> = {
  "web development": [
    "html", "html5", "css", "css3", "javascript", "js", "typescript", "ts",
    "frontend", "front-end", "backend", "back-end", "fullstack", "full-stack", "full stack",
    "web design", "web development", "web dev", "react", "reactjs", "react.js",
    "vue", "vuejs", "vue.js", "angular", "angularjs", "node", "nodejs", "node.js",
    "express", "expressjs", "php", "laravel", "django", "flask", "ruby on rails", "rails",
    "asp.net", "dotnet", ".net", "bootstrap", "tailwind", "tailwind css", "sass", "scss",
    "webpack", "vite", "rest api", "graphql", "next.js", "nextjs", "web development bootcamp",
    "jquery", "redux", "web"
  ],
  "frontend": [
    "html", "html5", "css", "css3", "javascript", "js", "typescript", "ts",
    "react", "reactjs", "vue", "vuejs", "angular", "tailwind", "bootstrap",
    "sass", "scss", "ui/ux", "frontend", "front-end", "next.js", "nextjs", "web design"
  ],
  "backend": [
    "node", "nodejs", "node.js", "express", "expressjs", "python", "java", "c#", "c++",
    "php", "laravel", "django", "flask", "ruby", "rails", "asp.net", "dotnet", ".net",
    "sql", "mysql", "postgresql", "postgres", "mongodb", "nosql", "redis", "rest api",
    "graphql", "backend", "back-end", "database", "microservices", "api development"
  ],
  "database": [
    "sql", "mysql", "postgresql", "postgres", "nosql", "mongodb", "sqlite",
    "oracle", "redis", "firebase", "supabase", "database", "database management",
    "dbms", "rdbms", "mariadb", "cassandra", "dynamodb"
  ],
  "mobile development": [
    "android", "ios", "react native", "flutter", "swift", "kotlin", "mobile app",
    "mobile development", "dart", "xcode", "android studio"
  ],
  "programming": [
    "javascript", "typescript", "python", "java", "c++", "c#", "c", "php", "ruby",
    "go", "golang", "rust", "kotlin", "swift", "dart", "software development",
    "software engineering", "coding", "oop", "algorithms"
  ],
  "devops & cloud": [
    "aws", "amazon web services", "azure", "gcp", "google cloud", "docker",
    "kubernetes", "k8s", "ci/cd", "jenkins", "git", "github", "gitlab", "linux",
    "terraform", "ansible", "cloud computing", "devops", "cloud practitioner"
  ],
  "quality assurance": [
    "qa", "testing", "quality assurance", "manual testing", "automation testing",
    "automated testing", "selenium", "cypress", "jest", "unit testing", "test automation"
  ],
  "ui/ux design": [
    "ui", "ux", "ui/ux", "user interface", "user experience", "figma", "adobe xd",
    "wireframing", "prototyping", "web design", "graphic design", "photoshop", "illustrator"
  ],
  "data science & analytics": [
    "data science", "data analysis", "data analyst", "machine learning", "ml", "ai",
    "artificial intelligence", "pandas", "numpy", "python", "power bi", "tableau",
    "excel", "data visualization", "sql", "r", "statistics", "deep learning"
  ],
  "cybersecurity & networking": [
    "cybersecurity", "cyber security", "network security", "networking", "network",
    "firewall", "comptia", "comptia security+", "comptia network+", "comptia it fundamentals",
    "itf+", "cisco", "ccna", "ethical hacking", "penetration testing", "information security"
  ],
  "it support": [
    "it support", "technical support", "helpdesk", "help desk", "it fundamentals",
    "comptia it fundamentals", "itf+", "computer hardware", "troubleshooting",
    "network administration", "system administration", "sysadmin", "it operations"
  ],
  "computer science": [
    "computer science", "cs", "bs computer science", "bscs", "information technology",
    "it", "bsit", "bs information technology", "computer engineering", "bscpe",
    "software engineering", "computer studies"
  ]
};

/**
 * Calculates the total active experience duration in years for a skill or credential.
 * Automatically parses acquisition year e.g. "JavaScript (Since 2022)" or "(2022)"
 * and computes: CurrentYear - AcquiredYear.
 */
export function calculateSkillExperienceYears(rawSkill: string | null | undefined): number {
  if (!rawSkill || !rawSkill.trim()) return 1;

  const currentYear = new Date().getFullYear();

  // 1. Check for "Since YYYY" or "(YYYY)" or "Acquired YYYY" or "[Course] (Since YYYY)"
  const yearMatch = rawSkill.match(/(?:Since|Acquired|from|year|yr|in)?\s*\(?\s*(\b20\d{2}\b|\b19\d{2}\b)\s*\)?/i);
  if (yearMatch) {
    const startYear = parseInt(yearMatch[1], 10);
    if (!isNaN(startYear) && startYear <= currentYear) {
      const duration = currentYear - startYear;
      return Math.max(1, duration);
    }
  }

  // 2. Check for explicit year range e.g. "(2020 - 2024)"
  const rangeMatch = rawSkill.match(/(\b20\d{2}\b)\s*[-–]\s*(\b20\d{2}\b)/);
  if (rangeMatch) {
    const startYear = parseInt(rangeMatch[1], 10);
    const endYear = parseInt(rangeMatch[2], 10);
    if (!isNaN(startYear) && !isNaN(endYear) && endYear >= startYear) {
      return Math.max(1, endYear - startYear);
    }
  }

  // 3. Check for explicit "X years" text e.g. "(3 years)"
  const yearsTextMatch = rawSkill.match(/(\d+)\s*(?:years|year|yrs|yr)/i);
  if (yearsTextMatch) {
    const yrs = parseInt(yearsTextMatch[1], 10);
    if (!isNaN(yrs)) return Math.max(1, yrs);
  }

  return 1;
}

export const QUALIFICATION_TAXONOMY_MAP: Record<string, string[]> = {
  // Senior High School Strands
  "tvl - ict": [
    "tvl - ict",
    "tvl-ict",
    "ict",
    "information and communications technology",
    "tvl - ict information and communications technology",
    "tvl - ict (information and communications technology)",
    "tvl-ict (information and communications technology)",
    "information & communications technology",
    "ict strand",
    "tvl ict",
  ],
  "stem": [
    "stem",
    "science technology engineering and mathematics",
    "science, technology, engineering, and mathematics",
    "stem - science, technology, engineering, and mathematics",
    "stem strand",
  ],
  "abm": [
    "abm",
    "accountancy business and management",
    "accountancy, business, and management",
    "abm - accountancy, business, and management",
    "abm strand",
  ],
  "humss": [
    "humss",
    "humanities and social sciences",
    "humss - humanities and social sciences",
    "humss strand",
  ],
  "gas": [
    "gas",
    "general academic strand",
    "gas - general academic strand",
    "gas strand",
  ],
  "tvl - industrial arts": [
    "tvl - industrial arts",
    "industrial arts",
    "tvl industrial arts",
  ],
  "tvl - home economics": [
    "tvl - home economics",
    "home economics",
    "tvl home economics",
  ],
  "tvl - agri-fishery": [
    "tvl - agri-fishery arts",
    "agri fishery arts",
    "tvl agri-fishery",
  ],

  // Tertiary College Degrees
  "bsit": [
    "bsit",
    "bs information technology",
    "bachelor of science in information technology",
    "bs information technology - bsit",
    "bs information technology (bsit)",
    "information technology degree",
    "information technology",
  ],
  "bscs": [
    "bscs",
    "bs computer science",
    "bachelor of science in computer science",
    "bs computer science - bscs",
    "bs computer science (bscs)",
    "computer science degree",
    "computer science",
  ],
  "bsis": [
    "bsis",
    "bs information systems",
    "bachelor of science in information systems",
    "bs information systems - bsis",
    "information systems",
  ],
  "bscpe": [
    "bscpe",
    "bs computer engineering",
    "bachelor of science in computer engineering",
    "computer engineering",
  ],
  "bsba": [
    "bsba",
    "bs business administration",
    "bachelor of science in business administration",
    "bs business administration - marketing / hr / operations",
    "business administration",
    "marketing management",
    "human resource management",
  ],
  "bsa": [
    "bsa",
    "bs accountancy",
    "bachelor of science in accountancy",
    "bs accountancy - bsa / financial management",
    "accountancy",
    "financial management",
    "accounting",
  ],
  "bshm": [
    "bshm",
    "bs hospitality management",
    "bachelor of science in hospitality management",
    "bs hospitality management - bshm / hotel & restaurant",
    "hotel and restaurant management",
    "hospitality management",
  ],
  "bstm": [
    "bstm",
    "bs tourism management",
    "bachelor of science in tourism management",
    "bs tourism management - bstm",
    "tourism management",
  ],
  "bsce": [
    "bsce",
    "bs civil engineering",
    "bachelor of science in civil engineering",
    "civil engineering",
  ],
  "bsee": [
    "bsee",
    "bs electrical engineering",
    "bachelor of science in electrical engineering",
    "electrical engineering",
  ],
  "bsme": [
    "bsme",
    "bs mechanical engineering",
    "bachelor of science in mechanical engineering",
    "mechanical engineering",
  ],
  "bsie": [
    "bsie",
    "bs industrial engineering",
    "bachelor of science in industrial engineering",
    "industrial engineering",
  ],
  "bsece": [
    "bsece",
    "bs electronics engineering",
    "bachelor of science in electronics engineering",
    "electronics engineering",
  ],
  "bsn": [
    "bsn",
    "bs nursing",
    "bachelor of science in nursing",
    "bs nursing - bsn / healthcare services",
    "nursing",
  ],
  "bs pharmacy": [
    "bs pharmacy",
    "bachelor of science in pharmacy",
    "bs pharmacy / medical technology",
    "medical technology",
    "pharmacy",
  ],
  "bsed": [
    "bsed",
    "bachelor of secondary education",
    "bachelor of secondary education - bsed / elementary education",
    "elementary education",
    "secondary education",
    "education degree",
  ],
  "ba communication": [
    "ba communication",
    "bachelor of arts in communication",
    "bachelor of arts in communication / multimedia arts",
    "multimedia arts",
    "communication arts",
  ],
  "bs psychology": [
    "bs psychology",
    "bachelor of science in psychology",
    "bs psychology / human resources",
    "psychology",
  ],
  "bs criminology": [
    "bs criminology",
    "bachelor of science in criminology",
    "bs criminology / law enforcement",
    "criminology",
  ],
  "associate computer technology": [
    "associate in computer technology",
    "associate in computer technology / polytechnic course",
    "act",
    "associate degree",
    "polytechnic course",
  ],
};

/**
 * Checks whether an educational qualification matches broad educational attainment levels
 * (e.g. "College Graduate - Bachelor's Degree" vs an applicant's "BS Information Technology" degree,
 * or "Senior High School Graduate" vs an applicant's "STEM" or "TVL-ICT" strand).
 */
export function isEducationLevelMatch(rawA: string, rawB: string): boolean {
  if (!rawA || !rawB) return false;
  const a = rawA.toLowerCase();
  const b = rawB.toLowerCase();

  // 1. College / Bachelor's Degree Attainment Check
  const isBachelorReq = (text: string) =>
    text.includes("bachelor") ||
    text.includes("college graduate") ||
    text.includes("college degree") ||
    text.includes("degree holder") ||
    text.includes("undergraduate / level earner");

  const isBachelorAttainment = (text: string) =>
    text.includes("[college]") ||
    text.includes("bachelor") ||
    text.includes("college graduate") ||
    text.includes("degree holder") ||
    /\b(bs|bscs|bsit|bsis|bsba|bsa|bsce|bsee|bsme|bsie|bsece|bsn|bsed|beed|bscpe)\b/i.test(text);

  if (isBachelorReq(a) && isBachelorAttainment(b)) return true;
  if (isBachelorReq(b) && isBachelorAttainment(a)) return true;

  // 2. Senior High School Attainment Check
  const isShsReq = (text: string) =>
    text.includes("senior high") ||
    text.includes("shs graduate") ||
    text.includes("high school graduate");

  const isShsAttainment = (text: string) =>
    text.includes("[shs]") ||
    text.includes("senior high") ||
    text.includes("shs") ||
    /\b(stem|abm|humss|gas|tvl)\b/i.test(text);

  if (isShsReq(a) && isShsAttainment(b)) return true;
  if (isShsReq(b) && isShsAttainment(a)) return true;

  // 3. Tech-Voc / TESDA Attainment Check
  const isVocationalReq = (text: string) =>
    text.includes("vocational") ||
    text.includes("tesda") ||
    text.includes("nc ii") ||
    text.includes("nc iii");

  const isVocationalAttainment = (text: string) =>
    text.includes("tesda") ||
    text.includes("nc ii") ||
    text.includes("nc iii") ||
    text.includes("vocational") ||
    text.includes("[tesda]");

  if (isVocationalReq(a) && isVocationalAttainment(b)) return true;
  if (isVocationalReq(b) && isVocationalAttainment(a)) return true;

  // 4. Associate Degree Attainment Check
  const isAssociateReq = (text: string) => text.includes("associate");
  const isAssociateAttainment = (text: string) => text.includes("associate");

  if (isAssociateReq(a) && isAssociateAttainment(b)) return true;
  if (isAssociateReq(b) && isAssociateAttainment(a)) return true;

  return false;
}

function normalizeCompetencyText(raw: string): string {
  if (!raw) return "";
  let text = raw.toLowerCase().trim();

  // 1. Strip duration/years in parentheses like "(1 year)", "(2 years)", "(2021 - 2023)", "(since 2022)"
  text = text.replace(/\s*\((?:\d+|less|since|\d{4}\s*[-–]\s*\d{4}|\d+\s*years?|\d+\s*yrs?)[^)]*\)/gi, "");

  // 2. Strip bracket tags like "[SHS]", "[College]", "[TESDA]", "[Vocational]"
  text = text.replace(/\s*\[.*?\]/g, "");

  // 3. Extract qualification/degree part before school "@ School Name" if present
  // e.g., "TVL - ICT (Information and Communications Technology) @ Notre Dame of Trece Martires City"
  if (text.includes("@")) {
    text = text.split("@")[0].trim();
  }

  // 4. Remove remaining trailing parentheses that only contain dates or numbers
  text = text.replace(/\s*\(\s*\d{4}\s*[-–]?\s*\d{0,4}\s*\)/g, "");

  return text.trim();
}

function toNormalizedSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[()[\]{}@]/g, " ")
    .replace(/[-_/,+&|;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSkillMatch(itemA: string, itemB: string): boolean {
  if (!itemA || !itemB) return false;

  // Direct raw equality
  const rawCleanA = itemA.toLowerCase().replace(/\s*\(.*?\)/g, "").trim();
  const rawCleanB = itemB.toLowerCase().replace(/\s*\(.*?\)/g, "").trim();
  if (rawCleanA && rawCleanB && (rawCleanA === rawCleanB || rawCleanA.includes(rawCleanB) || rawCleanB.includes(rawCleanA))) {
    return true;
  }

  const normA = normalizeCompetencyText(itemA);
  const normB = normalizeCompetencyText(itemB);
  if (!normA || !normB) return false;

  const slugA = toNormalizedSlug(normA);
  const slugB = toNormalizedSlug(normB);

  // 1. Direct equality or substring match on normalized slugs
  if (slugA === slugB || (slugA.length >= 3 && slugB.includes(slugA)) || (slugB.length >= 3 && slugA.includes(slugB))) {
    return true;
  }

  // 1.5 Educational Attainment Level matching (e.g. Bachelor's Degree vs BSIT degree)
  if (isEducationLevelMatch(itemA, itemB)) {
    return true;
  }

  // 2. Check Qualification / Strand Taxonomy
  for (const [, keywords] of Object.entries(QUALIFICATION_TAXONOMY_MAP)) {
    const matchesA = keywords.some((kw) => slugA === kw || slugA.includes(kw) || kw.includes(slugA));
    const matchesB = keywords.some((kw) => slugB === kw || slugB.includes(kw) || kw.includes(slugB));
    if (matchesA && matchesB) {
      return true;
    }
  }

  // 3. Tokenize by slashes, commas, and hyphens (e.g., "HTML / HTML5" -> ["html", "html5"])
  const splitRegex = /[/,+&|;]|\s+and\s+|\s+or\s+/i;
  const tokensA = slugA.split(splitRegex).map((t) => t.trim()).filter(Boolean);
  const tokensB = slugB.split(splitRegex).map((t) => t.trim()).filter(Boolean);

  for (const tA of tokensA) {
    for (const tB of tokensB) {
      if (tA === tB || (tA.length >= 3 && tB.includes(tA)) || (tB.length >= 3 && tA.includes(tB))) {
        return true;
      }
    }
  }

  // 4. Skills Taxonomy / Subcategory lookup
  for (const [category, keywords] of Object.entries(SKILL_KEYWORD_TAXONOMY)) {
    const isCategoryA = slugA === category || slugA.includes(category) || category.includes(slugA) || tokensA.some((t) => t === category || category.includes(t));
    const isCategoryB = slugB === category || slugB.includes(category) || category.includes(slugB) || tokensB.some((t) => t === category || category.includes(t));

    const matchesKeywordA = keywords.some((kw) => slugA === kw || slugA.includes(kw) || kw.includes(slugA) || tokensA.some((t) => t === kw || kw.includes(t)));
    const matchesKeywordB = keywords.some((kw) => slugB === kw || slugB.includes(kw) || kw.includes(slugB) || tokensB.some((t) => t === kw || kw.includes(t)));

    // Case A: Item A is the broad category (e.g. "Web Development") and Item B is a subcategory (e.g. "HTML")
    if (isCategoryA && matchesKeywordB) return true;
    // Case B: Item B is the broad category and Item A is a subcategory
    if (isCategoryB && matchesKeywordA) return true;
  }

  return false;
}

/**
 * Normalizes certification string by stripping:
 * - Dates / years in parentheses, e.g. "(2024)", "(Since 2022)"
 * - Bracketed tags, e.g. "[Verified]", "[IT]"
 * - School / institution tags after "@"
 * - Extra punctuation, en-dashes, em-dashes
 */
function normalizeCertText(raw: string): string {
  if (!raw) return "";
  let text = raw.toLowerCase().trim();

  // Strip dates / years / durations like (2024), (2021 - 2023), (since 2022)
  text = text.replace(/\s*\((?:\d{4}|\d+\s*years?|since\s*\d+|\d{4}\s*[-–]\s*\d{4})[^)]*\)/gi, "");

  // Strip bracket tags like [Cloud], [IT]
  text = text.replace(/\s*\[.*?\]/g, "");

  // Extract part before "@" if present
  if (text.includes("@")) {
    text = text.split("@")[0].trim();
  }

  // Normalize en-dash, em-dash to regular hyphen
  text = text.replace(/[–—]/g, "-");

  return text.trim();
}

function toCertSlug(text: string): string {
  return normalizeCertText(text)
    .replace(/[()[\]{}@]/g, " ")
    .replace(/[-_/,+&|;:]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks whether an applicant's certification satisfies an employer's required certification.
 * Supports:
 * 1. Exact & normalized string/token matches (e.g. "AWS Cloud Practitioner" <=> "AWS Certified Cloud Practitioner")
 * 2. Vendor hierarchical equivalency:
 *    - AWS: Higher levels (Associate, Professional, Specialty) satisfy Foundational (Cloud Practitioner).
 *           Professional level satisfies Associate in the same domain.
 *    - Azure: Associate (AZ-104, AZ-204, etc.) & Expert (AZ-305, AZ-400) satisfy Fundamentals (AZ-900).
 *    - GCP: Associate & Professional satisfy Foundational (Cloud Digital Leader).
 *    - Cisco: CCNP & CCIE satisfy CCNA.
 *    - CompTIA: Higher tiers (Security+, CySA+, CASP+) satisfy entry tiers (A+, Network+, ITF+).
 *    - TESDA: Higher National Certificate levels (NC III, NC IV) satisfy lower levels (NC I, NC II).
 */
export function isCertificationMatch(jobCert: string, candCert: string): boolean {
  if (!jobCert || !candCert) return false;

  const rawCleanJob = jobCert.toLowerCase().replace(/\s*\(.*?\)/g, "").trim();
  const rawCleanCand = candCert.toLowerCase().replace(/\s*\(.*?\)/g, "").trim();

  if (rawCleanJob === rawCleanCand) return true;

  const slugJob = toCertSlug(jobCert);
  const slugCand = toCertSlug(candCert);

  if (!slugJob || !slugCand) return false;
  if (slugJob === slugCand) return true;

  // Remove common filler words like "certified", "certification", "certificate", "examination", etc.
  const stripCertFillers = (slug: string) =>
    slug
      .replace(/\b(certified|certification|certificate|cert|credential|license|licensure|exam|examination)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim();

  const coreJob = stripCertFillers(slugJob);
  const coreCand = stripCertFillers(slugCand);

  if (coreJob && coreCand) {
    if (coreJob === coreCand) return true;
    if (coreJob.length >= 5 && coreCand.includes(coreJob)) return true;
    if (coreCand.length >= 5 && coreJob.includes(coreCand)) return true;
  }

  // --- 1. AWS Track ---
  const isAws = (slug: string) =>
    slug.includes("aws") || slug.includes("amazon web services");

  if (isAws(slugJob) && isAws(slugCand)) {
    const isAwsFoundational = (slug: string) =>
      slug.includes("cloud practitioner") ||
      slug.includes("clf c01") ||
      slug.includes("clf c02") ||
      slug.includes("foundational");

    const isAwsAssociate = (slug: string) =>
      slug.includes("associate") ||
      slug.includes("solutions architect") ||
      slug.includes("developer") ||
      slug.includes("sysops") ||
      slug.includes("data engineer") ||
      slug.includes("saa c0") ||
      slug.includes("dva c0") ||
      slug.includes("soa c0") ||
      slug.includes("dea c0");

    const isAwsProfessional = (slug: string) =>
      slug.includes("professional") ||
      slug.includes("devops") ||
      slug.includes("architect professional") ||
      slug.includes("sap c0") ||
      slug.includes("dop c0");

    const isAwsSpecialty = (slug: string) =>
      slug.includes("specialty") ||
      slug.includes("advanced networking") ||
      slug.includes("security specialty") ||
      slug.includes("machine learning");

    const candIsHigherAws =
      isAwsAssociate(slugCand) ||
      isAwsProfessional(slugCand) ||
      isAwsSpecialty(slugCand) ||
      isAwsFoundational(slugCand);

    // If job requires Foundational (Cloud Practitioner), ANY valid AWS certification satisfies it!
    if (isAwsFoundational(slugJob) && candIsHigherAws) {
      return true;
    }

    // If job requires Solutions Architect Associate, Professional satisfies it
    if (slugJob.includes("solutions architect") && (slugCand.includes("solutions architect") || slugCand.includes("architect professional"))) {
      return true;
    }

    // If job requires Developer Associate, DevOps Engineer Professional satisfies it
    if (slugJob.includes("developer") && (slugCand.includes("developer") || slugCand.includes("devops"))) {
      return true;
    }

    // If job only asks for generic "aws" or "aws associate"
    if ((coreJob === "aws" || coreJob === "aws associate") && candIsHigherAws) {
      return true;
    }
  }

  // --- 2. Microsoft Azure Track ---
  const isAzure = (slug: string) =>
    slug.includes("azure") || slug.includes("microsoft certified");

  if (isAzure(slugJob) && isAzure(slugCand)) {
    const isAzureFundamentals = (slug: string) =>
      slug.includes("fundamentals") ||
      slug.includes("az 900") ||
      slug.includes("dp 900") ||
      slug.includes("ai 900") ||
      slug.includes("sc 900");

    const isAzureAssociate = (slug: string) =>
      slug.includes("az 104") ||
      slug.includes("az 204") ||
      slug.includes("dp 203") ||
      slug.includes("ai 102") ||
      slug.includes("associate") ||
      slug.includes("administrator") ||
      slug.includes("developer");

    const isAzureExpert = (slug: string) =>
      slug.includes("az 305") ||
      slug.includes("az 400") ||
      slug.includes("expert") ||
      slug.includes("solutions architect expert") ||
      slug.includes("devops engineer expert");

    const candHasHigherAzure =
      isAzureAssociate(slugCand) || isAzureExpert(slugCand) || isAzureFundamentals(slugCand);

    if (isAzureFundamentals(slugJob) && candHasHigherAzure) {
      return true;
    }

    if (slugJob.includes("administrator") && (slugCand.includes("az 305") || slugCand.includes("solutions architect expert"))) {
      return true;
    }
  }

  // --- 3. Google Cloud Platform (GCP) Track ---
  const isGcp = (slug: string) =>
    slug.includes("gcp") || slug.includes("google cloud");

  if (isGcp(slugJob) && isGcp(slugCand)) {
    const isGcpFoundational = (slug: string) =>
      slug.includes("digital leader") || slug.includes("cloud digital leader");

    const isGcpAssociate = (slug: string) =>
      slug.includes("associate cloud engineer") || slug.includes("cloud engineer");

    const isGcpProfessional = (slug: string) =>
      slug.includes("professional cloud architect") ||
      slug.includes("professional data engineer") ||
      slug.includes("professional cloud devops") ||
      slug.includes("professional cloud security") ||
      slug.includes("cloud architect");

    if (isGcpFoundational(slugJob) && (isGcpAssociate(slugCand) || isGcpProfessional(slugCand) || isGcpFoundational(slugCand))) {
      return true;
    }

    if (isGcpAssociate(slugJob) && isGcpProfessional(slugCand)) {
      return true;
    }
  }

  // --- 4. Cisco Track ---
  const isCisco = (slug: string) =>
    slug.includes("cisco") || slug.includes("ccna") || slug.includes("ccnp") || slug.includes("ccie");

  if (isCisco(slugJob) && isCisco(slugCand)) {
    const isCcna = (slug: string) => slug.includes("ccna") || slug.includes("network associate");
    const isCcnp = (slug: string) => slug.includes("ccnp") || slug.includes("network professional");
    const isCcie = (slug: string) => slug.includes("ccie") || slug.includes("internetwork expert");

    if (isCcna(slugJob) && (isCcnp(slugCand) || isCcie(slugCand) || isCcna(slugCand))) {
      return true;
    }
    if (isCcnp(slugJob) && (isCcie(slugCand) || isCcnp(slugCand))) {
      return true;
    }
  }

  // --- 5. CompTIA Track ---
  const isComptia = (slug: string) => slug.includes("comptia");

  if (isComptia(slugJob) && isComptia(slugCand)) {
    const tier = (slug: string) => {
      if (slug.includes("casp") || slug.includes("securityx")) return 5;
      if (slug.includes("cysa") || slug.includes("pentest")) return 4;
      if (slug.includes("security")) return 3;
      if (slug.includes("network")) return 2;
      if (slug.includes("a+")) return 1;
      if (slug.includes("itf")) return 0;
      return -1;
    };

    const jobTier = tier(slugJob);
    const candTier = tier(slugCand);

    if (jobTier >= 0 && candTier >= 0 && candTier >= jobTier) {
      return true;
    }
  }

  // --- 6. TESDA Track ---
  const isTesda = (slug: string) =>
    slug.includes("tesda") || slug.includes("nc i") || slug.includes("nc ii") || slug.includes("nc iii") || slug.includes("nc iv");

  if (isTesda(slugJob) && isTesda(slugCand)) {
    const getNcLevel = (slug: string) => {
      if (slug.includes("nc iv") || slug.includes("nc 4")) return 4;
      if (slug.includes("nc iii") || slug.includes("nc 3")) return 3;
      if (slug.includes("nc ii") || slug.includes("nc 2")) return 2;
      if (slug.includes("nc i") || slug.includes("nc 1")) return 1;
      return 0;
    };

    const jobLevel = getNcLevel(slugJob);
    const candLevel = getNcLevel(slugCand);

    // Extract trade domain, e.g. "rac servicing", "computer systems servicing", "smaw"
    const stripNc = (s: string) =>
      s.replace(/\b(tesda|nc\s*i{1,3}|nc\s*iv|nc\s*\d|national certificate)\b/gi, "").trim();

    const jobDomain = stripNc(slugJob);
    const candDomain = stripNc(slugCand);

    if (jobDomain && candDomain && (jobDomain.includes(candDomain) || candDomain.includes(jobDomain))) {
      if (candLevel >= jobLevel) return true;
    }
  }

  return false;
}

export function calculateJobMatchDetails(
  job: JobCardInput,
  profile: ApplicantProfileInput | null
): JobMatchDetailsResult {
  if (!profile) {
    const score = inferMatchScore(job.createdRank || 0);
    return {
      score,
      breakdown: "Sign in to view personalized match breakdown",
      skillsPts: 0,
      qualPts: 0,
      certPts: 0,
      maxSkillsPts: 50,
      maxQualPts: 30,
      maxCertPts: 20,
      matchedSkills: [],
      missingSkills: job.skillTags || [],
      matchedQuals: [],
      missingQuals: job.qualTags || [],
      matchedCerts: [],
      missingCerts: job.certTags || [],
      setupPts: 0,
      salaryPts: 0,
      locationPts: 0,
      titleBonus: 0,
      setupSummary: job.setup || "Standard",
      salarySummary: "Sign in to compare with your expected salary",
      locationSummary: job.location || "Cavite",
      recommendations: ["Sign in to get a personalized profile match breakdown."],
    };
  }

  // 1. Skills
  const rawJobSkills = job.skillTags || [];
  const profileSkills = profile.skills || [];
  const profileCerts = profile.certifications || [];
  const profileQuals = profile.qualifications || [];

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  rawJobSkills.forEach((item) => {
    const matchingProfileSkill =
      profileSkills.find((ps) => isSkillMatch(item, ps)) ||
      profileCerts.find((pc) => isSkillMatch(item, pc));
    if (matchingProfileSkill) {
      const expYears = calculateSkillExperienceYears(matchingProfileSkill);
      const displayLabel = expYears > 1 ? `${item} (${expYears} yrs exp)` : item;
      matchedSkills.push(displayLabel);
    } else {
      missingSkills.push(item);
    }
  });

  // 2. Qualifications
  const rawJobQuals = job.qualTags || [];
  const matchedQuals: string[] = [];
  const missingQuals: string[] = [];

  rawJobQuals.forEach((item) => {
    const matchingQual =
      profileQuals.find((pq) => isSkillMatch(item, pq)) ||
      profileSkills.find((ps) => isSkillMatch(item, ps));
    if (matchingQual) {
      matchedQuals.push(item);
    } else {
      missingQuals.push(item);
    }
  });

  // 3. Certifications
  const rawJobCerts = job.certTags || [];
  const matchedCerts: string[] = [];
  const missingCerts: string[] = [];

  rawJobCerts.forEach((item) => {
    const matchingCert =
      profileCerts.find((pc) => isCertificationMatch(item, pc)) ||
      profileQuals.find((pq) => isCertificationMatch(item, pq)) ||
      profileSkills.find((ps) => isCertificationMatch(item, ps));
    if (matchingCert) {
      matchedCerts.push(item);
    } else {
      missingCerts.push(item);
    }
  });

  // Dynamic point weighting based ONLY on skills, qualifications, and certifications
  const hasSkills = rawJobSkills.length > 0;
  const hasQuals = rawJobQuals.length > 0;
  const hasCerts = rawJobCerts.length > 0;

  const baseSkills = hasSkills ? 50 : 0;
  const baseQuals = hasQuals ? 30 : 0;
  const baseCerts = hasCerts ? 20 : 0;
  const totalBase = baseSkills + baseQuals + baseCerts;

  let maxSkillsPts = 0;
  let maxQualsPts = 0;
  let maxCertPts = 0;
  let skillsPts = 0;
  let qualPts = 0;
  let certPts = 0;
  let score = 0;

  if (totalBase === 0) {
    score = 100;
  } else {
    maxSkillsPts = hasSkills ? Math.round((baseSkills / totalBase) * 100) : 0;
    maxQualsPts = hasQuals ? Math.round((baseQuals / totalBase) * 100) : 0;
    maxCertPts = hasCerts ? (100 - maxSkillsPts - maxQualsPts) : 0;

    const skillsRatio = hasSkills ? matchedSkills.length / rawJobSkills.length : 0;
    const qualsRatio = hasQuals ? matchedQuals.length / rawJobQuals.length : 0;
    const certsRatio = hasCerts ? matchedCerts.length / rawJobCerts.length : 0;

    skillsPts = Math.round(skillsRatio * maxSkillsPts);
    qualPts = Math.round(qualsRatio * maxQualsPts);
    certPts = Math.round(certsRatio * maxCertPts);

    score = Math.max(0, Math.min(100, skillsPts + qualPts + certPts));
  }

  // Location, salary, and setup are explicitly 0 pts
  const setupSummary = job.setup || "Standard";
  const salarySummary = "Standard";
  const locationSummary = formatLocationWithCavite(job.location);

  const breakdownParts: string[] = [];
  if (hasSkills) breakdownParts.push(`• Skills: ${skillsPts}/${maxSkillsPts}%`);
  if (hasQuals) breakdownParts.push(`• Qualifications: ${qualPts}/${maxQualsPts}%`);
  if (hasCerts) breakdownParts.push(`• Certifications: ${certPts}/${maxCertPts}%`);

  const breakdown =
    breakdownParts.length > 0
      ? `Match Score: ${score}%\n` + breakdownParts.join("\n")
      : `100% Match on all criteria!`;

  const recommendations: string[] = [];
  if (missingSkills.length > 0) {
    recommendations.push(
      `Add "${missingSkills.slice(0, 2).join('", "')}" to your profile skills or certifications to increase your match score.`
    );
  }
  if (missingQuals.length > 0) {
    recommendations.push(
      `Highlight "${missingQuals.slice(0, 2).join('", "')}" under your qualifications.`
    );
  }
  if (missingCerts.length > 0) {
    recommendations.push(
      `Add "${missingCerts.slice(0, 2).join('", "')}" to your profile certifications.`
    );
  }
  if (score >= 80) {
    recommendations.push(
      "You are a top candidate for this role! We recommend submitting your application immediately."
    );
  } else if (recommendations.length === 0) {
    recommendations.push(
      "Ensure your competencies and profile credentials are up-to-date before applying."
    );
  }

  return {
    score,
    breakdown,
    skillsPts,
    qualPts,
    certPts,
    maxSkillsPts,
    maxQualPts: maxQualsPts,
    maxCertPts,
    matchedSkills,
    missingSkills,
    matchedQuals,
    missingQuals,
    matchedCerts,
    missingCerts,
    setupPts: 0,
    salaryPts: 0,
    locationPts: 0,
    titleBonus: 0,
    setupSummary,
    salarySummary,
    locationSummary,
    recommendations,
  };
}

/**
 * Returns color category for match score badges: 'red' | 'yellow' | 'green'.
 * Thresholds:
 *   0 - 50:  red
 *  51 - 80:  yellow
 *  81 - 100: green
 */
export function getMatchColorClass(score: number): "red" | "yellow" | "orange" | "green" {
  if (score <= 50) return "red";
  if (score <= 80) return "yellow";
  return "green";
}

export function calculateJobMatch(
  job: JobCardInput,
  profile: ApplicantProfileInput | null
): number {
  return calculateJobMatchDetails(job, profile).score;
}

/**
 * Parses competency items (skills, qualifications, certifications) from JSON or delimited strings
 * and formats them for display with their experience years (e.g. "Web Development (1 year)").
 */
export function parseCompetencyDisplayTags(
  raw: string | null | undefined,
  category?: "skills" | "qualifications" | "certifications"
): string[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          if (typeof item === "object" && item !== null && item.name) {
            // For qualifications and certifications, do not display artificial "years" of experience
            if (category === "qualifications" || category === "certifications") {
              if (item.requirement && item.requirement !== "Required") {
                return `${item.name} (${item.requirement})`;
              }
              return String(item.name);
            }
            if (item.years) {
              return `${item.name} (${item.years})`;
            }
            if (item.requirement && item.requirement !== "Required") {
              return `${item.name} (${item.requirement})`;
            }
            return String(item.name);
          }
          return String(item).trim();
        })
        .filter(Boolean);
    }
  } catch {}

  const res: string[] = [];
  let current = "";
  let parenCount = 0;
  let bracketCount = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw[i];
    if (char === "(") parenCount++;
    else if (char === ")") parenCount = Math.max(0, parenCount - 1);
    else if (char === "[") bracketCount++;
    else if (char === "]") bracketCount = Math.max(0, bracketCount - 1);

    if (
      (char === "," || char === "\n" || char === ";" || char === "•" || char === "|") &&
      parenCount === 0 &&
      bracketCount === 0
    ) {
      if (current.trim()) res.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  if (current.trim()) res.push(current.trim());

  return res
    .map((s) => s.trim())
    .filter(Boolean)
    .map((token) => {
      const match = token.match(/^(.*?)\s*(?:\[(.*?)\]\s*)?\((.*?)\)$/);
      if (match) {
        return `${match[1].trim()} (${match[3].trim()})`;
      }
      return token;
    });
}

export function parsePreferredLocationTags(raw: string | null | undefined): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    return (raw as any[]).map(String).map((s) => s.trim()).filter(Boolean);
  }
  if (typeof raw !== "string") return [];
  let trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch {}
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    trimmed = trimmed.slice(1, -1).trim();
  }
  if (trimmed.includes("|")) {
    return trimmed.split("|").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  }
  if (trimmed.includes(";")) {
    return trimmed.split(";").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  }
  if (trimmed.includes("\n")) {
    return trimmed.split("\n").map((s) => s.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  }
  return [trimmed.replace(/^["']|["']$/g, "").trim()].filter(Boolean);
}

/**
 * Determines whether a job posting is closed or expired based on
 * database status, application limit/count, or close date.
 */
export function isJobClosedOrExpired(
  closeDate?: string | null,
  dbStatus?: string | null,
  applicationLimit?: number | null,
  applicantCount?: number | null
): boolean {
  if (typeof dbStatus === "string" && dbStatus.toLowerCase().trim() === "closed") {
    return true;
  }
  if (applicationLimit && applicationLimit > 0 && typeof applicantCount === "number" && applicantCount >= applicationLimit) {
    return true;
  }
  if (!closeDate || closeDate === "-" || !closeDate.trim()) {
    return false;
  }
  const raw = closeDate.trim();
  const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match) {
    const month = Number(match[1]);
    const day = Number(match[2]);
    const year = Number(match[3]);
    const closeAt = new Date(year, month - 1, day, 23, 59, 59, 999).getTime();
    return Date.now() > closeAt;
  }
  const parsed = Date.parse(raw);
  if (!isNaN(parsed)) {
    const closeAt = new Date(parsed).setHours(23, 59, 59, 999);
    return Date.now() > closeAt;
  }
  return false;
}


