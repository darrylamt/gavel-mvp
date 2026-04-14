// Ghana delivery locations
export const GHANA_LOCATIONS = {
  'Greater Accra': [
    'Greater Accra (All)',
    'Accra Central',
    'Osu',
    'Labone',
    'Cantonments',
    'Airport Residential',
    'East Legon',
    'Adabraka',
    'Asylum Down',
    'Ridge',
    'Roman Ridge',
    'Dzorwulu',
    'North Ridge',
    'Kokomlemle',
    'Abelemkpe',
    'North Labone',
    'Labadi',
    'Teshie',
    'Nungua',
    'Spintex',
    'Tema',
    'Community 1 - Tema',
    'Community 25 - Tema',
    'Ashaiman',
    'Madina',
    'Adenta',
    'Dome',
    'Achimota',
    'Lapaz',
    'Kaneshie',
    'Dansoman',
    'Mamprobi',
    'Korle Bu',
    'Circle (Nkrumah Circle)',
    'Kwame Nkrumah Circle',
    'Kasoa',
    'Weija',
    'Gbawe',
    'Mallam',
    'Santa Maria',
    'Anyaa',
    'Ofankor',
    'Pokuase',
    'Amasaman',
    'Ablekuma',
    'Odorkor',
    'Abeka',
    'Darkuman',
    'New Fadama',
    'Agbogbloshie',
    'Bubuashie',
    'Caprice',
    'Banana Inn',
    'Legon',
    'Haatso',
    'Atomic',
    'Kwabenya',
    'Ashongman',
    'Taifa',
    'Oyarifa',
    'Pantang',
  ],
  'Ashanti': [
    'Kumasi (All)',
    'Kumasi',
    'Adum',
    'Asafo',
    'Bantama',
    'Nhyiaeso',
    'Ahodwo',
    'North Suntreso',
    'South Suntreso',
    'Suame',
    'Maakro',
    'Ayigya',
    'KNUST Campus',
    'Kentinkrono',
    'Ayeduase',
    'Maxima',
    'Tech Junction',
    'Ahinsan',
    'Asokwa',
    'Kwadaso',
    'Oforikrom',
    'Ejisu',
    'Mampong',
    'Offinso',
    'Konongo',
    'Juaben',
    'Bekwai',
  ],
  'Western Region': ['Western Region'],
  'Central Region': ['Central Region'],
  'Eastern Region': ['Eastern Region'],
  'Volta Region': ['Volta Region'],
  'Northern Region': ['Northern Region'],
  'Upper East Region': ['Upper East Region'],
  'Upper West Region': ['Upper West Region'],
  'Bono Region': ['Bono Region'],
  'Bono East Region': ['Bono East Region'],
  'Ahafo Region': ['Ahafo Region'],
  'Savannah Region': ['Savannah Region'],
  'North East Region': ['North East Region'],
  'Oti Region': ['Oti Region'],
  'Western North Region': ['Western North Region'],
};

export const ALL_LOCATIONS = Object.entries(GHANA_LOCATIONS).flatMap(([region, locations]) =>
  locations.map(location => ({
    region,
    location,
    label: location === region ? location : `${location} (${region})`,
    value: `${region}:${location}`,
  }))
);

export type Location = {
  region: string;
  location: string;
  label: string;
  value: string;
};

// Approximate centre-point coordinates for each region — used for Dawurobo /estimates
export const REGION_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'Greater Accra':      { lat: 5.6037,  lng: -0.1870 },
  'Ashanti':            { lat: 6.6885,  lng: -1.6244 },
  'Western Region':     { lat: 4.8845,  lng: -1.7554 },
  'Central Region':     { lat: 5.1053,  lng: -1.2466 },
  'Eastern Region':     { lat: 6.0888,  lng: -0.2619 },
  'Volta Region':       { lat: 6.6003,  lng:  0.4700 },
  'Northern Region':    { lat: 9.4008,  lng: -0.8393 },
  'Upper East Region':  { lat: 10.7866, lng: -0.8520 },
  'Upper West Region':  { lat: 10.0601, lng: -2.5099 },
  'Bono Region':        { lat: 7.3349,  lng: -2.3268 },
  'Bono East Region':   { lat: 7.5891,  lng: -1.9328 },
  'Ahafo Region':       { lat: 6.8000,  lng: -2.5167 },
  'Savannah Region':    { lat: 9.0820,  lng: -1.8248 },
  'North East Region':  { lat: 10.5303, lng: -0.3720 },
  'Oti Region':         { lat: 8.0657,  lng:  0.1741 },
  'Western North Region': { lat: 6.2063, lng: -2.4838 },
}

// Reverse lookup: lowercase city/location name → region name
const CITY_REGION_MAP: Record<string, string> = Object.fromEntries(
  Object.entries(GHANA_LOCATIONS).flatMap(([region, cities]) =>
    cities.map((city) => [city.toLowerCase(), region])
  )
)

/**
 * Returns region-level coordinates for a given region name or city/location name.
 * Falls back to Greater Accra if not found.
 */
export function getCoordinatesForLocation(regionOrCity: string): { lat: number; lng: number } {
  if (!regionOrCity) return REGION_COORDINATES['Greater Accra']!
  const direct = REGION_COORDINATES[regionOrCity]
  if (direct) return direct
  const region = CITY_REGION_MAP[regionOrCity.toLowerCase()]
  return (region ? REGION_COORDINATES[region] : undefined) ?? REGION_COORDINATES['Greater Accra']!
}
