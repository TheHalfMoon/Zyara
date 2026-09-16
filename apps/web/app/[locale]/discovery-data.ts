export type NearbyPlace = {
  id: string;
  kind: "clinic" | "hospital" | "dental";
  name: string;
  area: string;
  address: string;
  specialties: string[];
  rating: number;
  reviews: number;
  distanceKm: number;
  driveMinutes: number;
  openNow: boolean;
  closesAt: string;
  nextAvailable: string;
  doctors: number;
  verified: boolean;
  lat: number;
  lng: number;
  hours: Array<{ day: string; hours: string }>;
};

export type NearbyDoctor = {
  id: string;
  name: string;
  specialty: string;
  placeId: string;
  placeName: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  languages: string[];
  nextAvailable: string;
};

// Rights-cleared synthetic discovery fixtures. Names are invented and are not
// claims about real providers. Coordinates are demo anchors in Riyadh only.
export const NEARBY_PLACES: NearbyPlace[] = [
  {
    id: "b1",
    kind: "clinic",
    name: "Al Noor Medical Center",
    area: "Al Olaya",
    address: "King Fahd Road, Al Olaya, Riyadh",
    specialties: ["General Practice", "Pediatrics", "Internal Medicine"],
    rating: 4.8,
    reviews: 320,
    distanceKm: 2.1,
    driveMinutes: 6,
    openNow: true,
    closesAt: "10:00 PM",
    nextAvailable: "Today · 4:30 PM",
    doctors: 12,
    verified: true,
    lat: 24.7118,
    lng: 46.6743,
    hours: [
      { day: "Mon–Thu", hours: "8:00 AM – 10:00 PM" },
      { day: "Friday", hours: "2:00 PM – 10:00 PM" },
      { day: "Saturday", hours: "8:00 AM – 8:00 PM" },
      { day: "Sunday", hours: "9:00 AM – 6:00 PM" },
    ],
  },
  {
    id: "b2",
    kind: "clinic",
    name: "Riyadh Care Clinic",
    area: "Al Sahafa",
    address: "Prince Sultan Road, Al Sahafa, Riyadh",
    specialties: ["Dermatology", "Family Medicine", "Women’s Health"],
    rating: 4.7,
    reviews: 184,
    distanceKm: 3.4,
    driveMinutes: 9,
    openNow: true,
    closesAt: "9:00 PM",
    nextAvailable: "Today · 5:00 PM",
    doctors: 8,
    verified: true,
    lat: 24.7928,
    lng: 46.6429,
    hours: [
      { day: "Sun–Thu", hours: "8:30 AM – 9:00 PM" },
      { day: "Friday", hours: "4:00 PM – 9:00 PM" },
      { day: "Saturday", hours: "10:00 AM – 8:00 PM" },
    ],
  },
  {
    id: "b3",
    kind: "dental",
    name: "Smile Dental Clinic",
    area: "Al Muhammadiyah",
    address: "Tahlia Street, Al Muhammadiyah, Riyadh",
    specialties: ["Dentistry", "Orthodontics", "Cosmetic Dentistry"],
    rating: 4.9,
    reviews: 276,
    distanceKm: 5.8,
    driveMinutes: 13,
    openNow: true,
    closesAt: "8:00 PM",
    nextAvailable: "Tomorrow · 9:30 AM",
    doctors: 6,
    verified: true,
    lat: 24.7426,
    lng: 46.6532,
    hours: [
      { day: "Sun–Thu", hours: "9:00 AM – 8:00 PM" },
      { day: "Friday", hours: "Closed" },
      { day: "Saturday", hours: "10:00 AM – 6:00 PM" },
    ],
  },
  {
    id: "b4",
    kind: "hospital",
    name: "Saha Specialist Hospital",
    area: "Al Nakheel",
    address: "Northern Ring Road, Al Nakheel, Riyadh",
    specialties: ["Cardiology", "Orthopedics", "Imaging"],
    rating: 4.6,
    reviews: 514,
    distanceKm: 7.2,
    driveMinutes: 16,
    openNow: true,
    closesAt: "24 hours",
    nextAvailable: "Today · 6:15 PM",
    doctors: 34,
    verified: true,
    lat: 24.7565,
    lng: 46.6338,
    hours: [{ day: "Every day", hours: "Open 24 hours" }],
  },
];

export const NEARBY_DOCTORS: NearbyDoctor[] = [
  {
    id: "d1",
    name: "Dr. Layla Ahmed",
    specialty: "Cardiology",
    placeId: "b1",
    placeName: "Al Noor Medical Center",
    rating: 4.9,
    reviews: 412,
    distanceKm: 2.1,
    languages: ["Arabic", "English"],
    nextAvailable: "Today · 5:30 PM",
  },
  {
    id: "d2",
    name: "Dr. Omar Khalid",
    specialty: "Orthopedics",
    placeId: "b4",
    placeName: "Saha Specialist Hospital",
    rating: 4.8,
    reviews: 205,
    distanceKm: 7.2,
    languages: ["Arabic", "English", "German"],
    nextAvailable: "Tomorrow · 10:00 AM",
  },
  {
    id: "d3",
    name: "Dr. Reem Almutairi",
    specialty: "Dermatology",
    placeId: "b2",
    placeName: "Riyadh Care Clinic",
    rating: 4.9,
    reviews: 331,
    distanceKm: 3.4,
    languages: ["Arabic", "English", "French"],
    nextAvailable: "Today · 7:00 PM",
  },
];

export function directionsUrl(place: NearbyPlace) {
  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
}

export function mapUrl(place: NearbyPlace) {
  return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
}

export function placeById(id: string) {
  return NEARBY_PLACES.find((place) => place.id === id) ?? null;
}
