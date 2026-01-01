const ROOM_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1518542013720-01fe7340df4c?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
];

const HERO_IMAGE_OVERRIDES: Record<string, string> = {
  'bellagiopokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1d/Bellagio_outside.jpg/1024px-Bellagio_outside.jpg',
  'ariapokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Aria_Las_Vegas_December_2013.jpg/1024px-Aria_Las_Vegas_December_2013.jpg',
  'mgmgrandpokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/da/LasVegas-MGMgrand.jpg/1024px-LasVegas-MGMgrand.jpg',
  'mandalaybaypokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/19/Mandalay_Bay_May_22_2023.jpg/1024px-Mandalay_Bay_May_22_2023.jpg',
  'venetianpokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/58/11_The_Venetian_Las_Vegas_-_luxury_hotel_and_casino_in_Las_Vegas_Strip.jpg/1200px-11_The_Venetian_Las_Vegas_-_luxury_hotel_and_casino_in_Las_Vegas_Strip.jpg',
  'resortsworldlasvegaspokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3f/Resorts_World_Las_Vegas_May_2022.jpg/1200px-Resorts_World_Las_Vegas_May_2022.jpg',
  'borgatapokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/29/Borgata_ac.jpg/1200px-Borgata_ac.jpg',
  'foxwoodspokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e4/Foxwood_Casino.JPG/1200px-Foxwood_Casino.JPG',
  'mohegansunpokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/28/Mohegan_Sun_3.jpg/1200px-Mohegan_Sun_3.jpg',
  'livecasinohotelmarylandpokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9a/Maryland_Live%21_Casino_Arundel_Mills.jpg/1024px-Maryland_Live%21_Casino_Arundel_Mills.jpg',
  'mgmnationalharborpokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/MGM_aerial-NHarbor.jpg/1024px-MGM_aerial-NHarbor.jpg',
  'livecasinohotelphiladelphiapokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/76/Live_Casino_%26_Hotel_Philadelphia.jpg/1024px-Live_Casino_%26_Hotel_Philadelphia.jpg',
  'riverscasinopittsburghpokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/6a/RiversCasino.jpg/1024px-RiversCasino.jpg',
  'mgmgranddetroitpokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/9/97/MGMGrand_Detroit1.jpg/1024px-MGMGrand_Detroit1.jpg',
  'seminolehardrockhollywoodpokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Hard_Rock_Casino_Hotel_Fort_Lauderdale_Florida%2C_June_2021.jpg/1024px-Hard_Rock_Casino_Hotel_Fort_Lauderdale_Florida%2C_June_2021.jpg',
  'choctawcasinoresortdurantpokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Choctaw_Casino_Durant_2023.jpg/1200px-Choctaw_Casino_Durant_2023.jpg',
  'winstarpokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cd/WinStar_World_Casino_1.jpg/1024px-WinStar_World_Casino_1.jpg',
  'thearenapokerroomattalkingstickresort': 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/Talking_Stick_Resort_Scottsdale_Arizona.jpg/1200px-Talking_Stick_Resort_Scottsdale_Arizona.jpg',
  'wynnlasvegaspokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Wynn_2_%282%29.jpg/1200px-Wynn_2_%282%29.jpg',
  'encorebostonharborpokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/81/Encore_Boston_Harbor_September_2024_from_Riverwalk.jpg/1200px-Encore_Boston_Harbor_September_2024_from_Riverwalk.jpg',
  'caesarspalacepokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Caesars_Palace_-_South_East_-_2010-12-12.jpg/1024px-Caesars_Palace_-_South_East_-_2010-12-12.jpg',
  'horseshoelasvegaspokerroomwsophalloffame': 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b1/Ballyshotelcasino-lv_cropped.jpg/1200px-Ballyshotelcasino-lv_cropped.jpg',
  'commercecasinopokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/Commerce_Casino.jpg/1024px-Commerce_Casino.jpg',
  'peppermillresortspsacasinopokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Peppermill_Reno.jpg/1024px-Peppermill_Reno.jpg',
  'hardrockcasinocincinnatipokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/JACKCincinnatiCasio_2017.jpg/1024px-JACKCincinnatiCasio_2017.jpg',
  'harrahsneworleanswsoppokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3b/Harrah%27s_Casino%2C_New_Orleans.jpg/1200px-Harrah%27s_Casino%2C_New_Orleans.jpg',
  'hollywoodcasinoatcharlestownracespokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/64/Hollywood_Charles_Town_Exterior.jpg/1024px-Hollywood_Charles_Town_Exterior.jpg',
  'turningstonepokerroom': 'https://upload.wikimedia.org/wikipedia/commons/2/23/Turning_Stone_Resort_and_Casino_hotel_tower.jpg',
  'harrahscherokeepokerroom': 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Cherokee_-_Harrah%27s_Casino_Cherokee_-_View_From_Parking_Tower.jpg/1200px-Cherokee_-_Harrah%27s_Casino_Cherokee_-_View_From_Parking_Tower.jpg',
};

function normalizeKey(value?: string | null) {
  return value?.toLowerCase().replace(/[^a-z0-9]/g, "") ?? "";
}

type RoomIdentity = {
  name: string;
  brand?: string | null;
  city?: string | null;
  imageUrl?: string | null;
};

export function getRoomImage(room: RoomIdentity) {
  const candidateKeys = [
    normalizeKey(room.name),
    normalizeKey(`${room.brand ?? ""}${room.city ?? ""}`),
    normalizeKey(room.brand),
    normalizeKey(room.city),
  ].filter(Boolean);

  for (const key of candidateKeys) {
    if (key && HERO_IMAGE_OVERRIDES[key]) {
      return HERO_IMAGE_OVERRIDES[key];
    }
  }

  const base = (room.brand ?? room.city ?? room.name ?? "pokerroom").toLowerCase();
  const sum = Array.from(base).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return ROOM_IMAGE_POOL[sum % ROOM_IMAGE_POOL.length];
}

export function getRoomLogo(room: RoomIdentity) {
  return room.imageUrl ?? null;
}
