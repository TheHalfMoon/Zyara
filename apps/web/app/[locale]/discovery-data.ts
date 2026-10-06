export type Specialty = {
  slug: string;
  name: string;
  nameAr: string;
  icon: string;
  description: string;
  descriptionAr: string;
  aliases: string[];
};

export type NearbyPlace = {
  id: string;
  kind: "clinic" | "hospital" | "dental" | "imaging" | "lab";
  name: string;
  area: string;
  address: string;
  specialties: string[];
  services: string[];
  insurers: string[];
  rating: number;
  reviews: number;
  distanceKm: number;
  driveMinutes: number;
  openNow: boolean;
  closesAt: string;
  nextAvailable: string;
  doctors: number;
  verified: boolean;
  phone: string;
  bookingPhone: string;
  whatsapp: string;
  website: string;
  freshnessDays: number;
  lat: number;
  lng: number;
  hours: Array<{ day: string; hours: string }>;
};

export type DoctorLocation = {
  placeId: string;
  distanceKm: number;
  nextAvailable: string;
  insurers: string[];
};

export type NearbyDoctor = {
  id: string;
  name: string;
  title: string;
  specialty: string;
  subspecialty?: string;
  placeId: string;
  placeName: string;
  rating: number;
  reviews: number;
  distanceKm: number;
  languages: string[];
  nextAvailable: string;
  experienceYears: number;
  education: string[];
  qualifications: string[];
  expertise: string[];
  services: string[];
  freshnessDays: number;
  locations: DoctorLocation[];
};

export const SPECIALTIES: Specialty[] = [
  { slug: "dentistry", name: "Dentistry", nameAr: "طب الأسنان", icon: "◌", description: "Dentists, orthodontics, oral surgery and preventive care.", descriptionAr: "أطباء الأسنان والتقويم وجراحة الفم والعناية الوقائية.", aliases: ["dentist", "dental", "اسنان", "أسنان", "تقويم"] },
  { slug: "orthopedics", name: "Orthopedics", nameAr: "العظام", icon: "◇", description: "Bones, joints, sports injuries, spine and mobility care.", descriptionAr: "العظام والمفاصل والإصابات الرياضية والعمود الفقري والحركة.", aliases: ["ortho", "orthopaedics", "عظام", "ركبة", "مفاصل"] },
  { slug: "dermatology", name: "Dermatology", nameAr: "الجلدية", icon: "○", description: "Skin, hair, nails and dermatologic procedures.", descriptionAr: "الجلد والشعر والأظافر وإجراءات الجلدية.", aliases: ["derma", "skin", "جلدية", "بشرة"] },
  { slug: "pediatrics", name: "Pediatrics", nameAr: "الأطفال", icon: "✦", description: "Primary and specialty care for children and adolescents.", descriptionAr: "الرعاية العامة والمتخصصة للأطفال واليافعين.", aliases: ["peds", "children", "اطفال", "أطفال"] },
  { slug: "cardiology", name: "Cardiology", nameAr: "القلب", icon: "♡", description: "Heart and cardiovascular consultations and diagnostics.", descriptionAr: "استشارات وتشخيص أمراض القلب والأوعية الدموية.", aliases: ["heart", "cardio", "قلب"] },
  { slug: "ent", name: "ENT", nameAr: "الأنف والأذن والحنجرة", icon: "◉", description: "Ear, nose, throat, hearing and sinus care.", descriptionAr: "الأذن والأنف والحنجرة والسمع والجيوب الأنفية.", aliases: ["ear nose throat", "انف واذن", "أنف وأذن"] },
  { slug: "ophthalmology", name: "Ophthalmology", nameAr: "العيون", icon: "◎", description: "Eye health, vision and ophthalmic procedures.", descriptionAr: "صحة العين والنظر وإجراءات طب العيون.", aliases: ["eye", "eyes", "عيون"] },
  { slug: "obgyn", name: "OB/GYN", nameAr: "النساء والولادة", icon: "◐", description: "Women’s health, pregnancy and gynecology.", descriptionAr: "صحة المرأة والحمل والنساء والولادة.", aliases: ["obgyn", "gynecology", "نساء", "ولادة"] },
  { slug: "physiotherapy", name: "Physiotherapy", nameAr: "العلاج الطبيعي", icon: "↗", description: "Rehabilitation, movement and recovery programs.", descriptionAr: "إعادة التأهيل والحركة وبرامج التعافي.", aliases: ["physio", "pt", "علاج طبيعي"] },
  { slug: "imaging", name: "Imaging", nameAr: "الأشعة", icon: "▣", description: "MRI, CT, X-ray, ultrasound and diagnostic imaging.", descriptionAr: "الرنين والأشعة المقطعية والسينية والموجات فوق الصوتية.", aliases: ["mri", "ct", "xray", "scan", "اشعة", "أشعة"] },
];

// Rights-cleared synthetic discovery fixtures. Names, contact details and ratings
// are invented and are not claims about real providers. Coordinates are demo
// anchors in Riyadh only.
export const NEARBY_PLACES: NearbyPlace[] = [
  {
    id: "b1", kind: "clinic", name: "Al Noor Medical Center", area: "Al Olaya", address: "King Fahd Road, Al Olaya, Riyadh",
    specialties: ["General Practice", "Pediatrics", "Internal Medicine"], services: ["Same-day consultation", "Vaccination", "Chronic care follow-up", "Basic laboratory"],
    insurers: ["Bupa", "Tawuniya", "MedGulf"], rating: 4.2, reviews: 320, distanceKm: 2.1, driveMinutes: 6, openNow: true, closesAt: "10:00 PM",
    nextAvailable: "Today · 4:30 PM", doctors: 12, verified: true, phone: "+966 11 555 0101", bookingPhone: "+966 11 555 0111", whatsapp: "+966 55 555 0101",
    website: "https://example.com/al-noor", freshnessDays: 6, lat: 24.7118, lng: 46.6743,
    hours: [{ day: "Mon–Thu", hours: "8:00 AM – 10:00 PM" }, { day: "Friday", hours: "2:00 PM – 10:00 PM" }, { day: "Saturday", hours: "8:00 AM – 8:00 PM" }, { day: "Sunday", hours: "9:00 AM – 6:00 PM" }],
  },
  {
    id: "b2", kind: "clinic", name: "Riyadh Care Clinic", area: "Al Sahafa", address: "Prince Sultan Road, Al Sahafa, Riyadh",
    specialties: ["Dermatology", "Family Medicine", "Women’s Health"], services: ["Dermatology consultation", "Skin procedures", "Women’s health", "Family medicine"],
    insurers: ["Tawuniya", "MedGulf"], rating: 2.4, reviews: 184, distanceKm: 3.4, driveMinutes: 9, openNow: true, closesAt: "9:00 PM",
    nextAvailable: "Today · 5:00 PM", doctors: 8, verified: true, phone: "+966 11 555 0202", bookingPhone: "+966 11 555 0222", whatsapp: "+966 55 555 0202",
    website: "https://example.com/riyadh-care", freshnessDays: 11, lat: 24.7928, lng: 46.6429,
    hours: [{ day: "Sun–Thu", hours: "8:30 AM – 9:00 PM" }, { day: "Friday", hours: "4:00 PM – 9:00 PM" }, { day: "Saturday", hours: "10:00 AM – 8:00 PM" }],
  },
  {
    id: "b3", kind: "dental", name: "Smile Dental Clinic", area: "Al Muhammadiyah", address: "Tahlia Street, Al Muhammadiyah, Riyadh",
    specialties: ["Dentistry", "Orthodontics", "Cosmetic Dentistry"], services: ["General dentistry", "Orthodontics", "Root canal", "Dental implants"],
    insurers: ["Bupa", "Tawuniya"], rating: 4.7, reviews: 276, distanceKm: 5.8, driveMinutes: 13, openNow: true, closesAt: "8:00 PM",
    nextAvailable: "Tomorrow · 9:30 AM", doctors: 6, verified: true, phone: "+966 11 555 0303", bookingPhone: "+966 11 555 0333", whatsapp: "+966 55 555 0303",
    website: "https://example.com/smile-dental", freshnessDays: 4, lat: 24.7426, lng: 46.6532,
    hours: [{ day: "Sun–Thu", hours: "9:00 AM – 8:00 PM" }, { day: "Friday", hours: "Closed" }, { day: "Saturday", hours: "10:00 AM – 6:00 PM" }],
  },
  {
    id: "b4", kind: "hospital", name: "Saha Specialist Hospital", area: "Al Nakheel", address: "Northern Ring Road, Al Nakheel, Riyadh",
    specialties: ["Cardiology", "Orthopedics", "Imaging"], services: ["Orthopedic surgery", "Cardiac diagnostics", "MRI", "CT", "Emergency care"],
    insurers: ["Bupa", "Tawuniya", "MedGulf", "GIG"], rating: 4.6, reviews: 514, distanceKm: 7.2, driveMinutes: 16, openNow: true, closesAt: "24 hours",
    nextAvailable: "Today · 6:15 PM", doctors: 34, verified: true, phone: "+966 11 555 0404", bookingPhone: "+966 11 555 0444", whatsapp: "+966 55 555 0404",
    website: "https://example.com/saha", freshnessDays: 8, lat: 24.7565, lng: 46.6338,
    hours: [{ day: "Every day", hours: "Open 24 hours" }],
  },
];

export const NEARBY_DOCTORS: NearbyDoctor[] = [
  {
    id: "d1", name: "Dr. Layla Ahmed", title: "Consultant Cardiologist", specialty: "Cardiology", subspecialty: "Preventive Cardiology",
    placeId: "b1", placeName: "Al Noor Medical Center", rating: 4.9, reviews: 412, distanceKm: 2.1, languages: ["Arabic", "English"], nextAvailable: "Today · 5:30 PM",
    experienceYears: 15, education: ["MD · Gulf Medical College", "Cardiology residency · University Hospital"], qualifications: ["Board-certified in Cardiology", "Fellowship in Preventive Cardiology"],
    expertise: ["Heart health", "Hypertension", "Preventive cardiology"], services: ["Cardiology consultation", "ECG review", "Risk assessment"], freshnessDays: 7,
    locations: [{ placeId: "b1", distanceKm: 2.1, nextAvailable: "Today · 5:30 PM", insurers: ["Bupa", "Tawuniya"] }, { placeId: "b4", distanceKm: 7.2, nextAvailable: "Thursday · 9:00 AM", insurers: ["Bupa", "MedGulf"] }],
  },
  {
    id: "d2", name: "Dr. Omar Khalid", title: "Consultant Orthopedic Surgeon", specialty: "Orthopedics", subspecialty: "Knee & Sports Medicine",
    placeId: "b4", placeName: "Saha Specialist Hospital", rating: 4.8, reviews: 205, distanceKm: 7.2, languages: ["Arabic", "English", "German"], nextAvailable: "Tomorrow · 10:00 AM",
    experienceYears: 12, education: ["MBBS · National Medical University", "Orthopedic residency · Central Teaching Hospital"], qualifications: ["Board-certified in Orthopedic Surgery", "Sports Medicine Fellowship"],
    expertise: ["Knee", "Sports injuries", "Shoulder", "Joint pain"], services: ["Orthopedic consultation", "Sports injury assessment", "Post-operative follow-up"], freshnessDays: 5,
    locations: [{ placeId: "b4", distanceKm: 7.2, nextAvailable: "Tomorrow · 10:00 AM", insurers: ["Bupa", "Tawuniya", "GIG"] }, { placeId: "b1", distanceKm: 2.1, nextAvailable: "Sunday · 4:00 PM", insurers: ["Tawuniya"] }],
  },
  {
    id: "d3", name: "Dr. Reem Almutairi", title: "Consultant Dermatologist", specialty: "Dermatology", subspecialty: "Medical Dermatology",
    placeId: "b2", placeName: "Riyadh Care Clinic", rating: 4.9, reviews: 331, distanceKm: 3.4, languages: ["Arabic", "English", "French"], nextAvailable: "Today · 7:00 PM",
    experienceYears: 11, education: ["MBBS · Riyadh Medical University", "Dermatology residency · Specialist Medical City"], qualifications: ["Board-certified in Dermatology", "Clinical Dermatology Fellowship"],
    expertise: ["Acne", "Eczema", "Psoriasis", "Hair disorders"], services: ["Dermatology consultation", "Skin biopsy", "Medical skin treatment"], freshnessDays: 3,
    locations: [{ placeId: "b2", distanceKm: 3.4, nextAvailable: "Today · 7:00 PM", insurers: ["Tawuniya", "MedGulf"] }, { placeId: "b4", distanceKm: 7.2, nextAvailable: "Monday · 11:30 AM", insurers: ["Bupa", "Tawuniya"] }],
  },
  {
    id: "d4", name: "Dr. Sara Nasser", title: "Specialist Dentist", specialty: "Dentistry", subspecialty: "Orthodontics",
    placeId: "b3", placeName: "Smile Dental Clinic", rating: 4.7, reviews: 188, distanceKm: 5.8, languages: ["Arabic", "English"], nextAvailable: "Tomorrow · 11:00 AM",
    experienceYears: 9, education: ["BDS · College of Dentistry", "Orthodontic residency · Dental Teaching Center"], qualifications: ["Specialist in Orthodontics"],
    expertise: ["Braces", "Clear aligners", "Bite correction"], services: ["Orthodontic consultation", "Braces", "Clear aligners"], freshnessDays: 4,
    locations: [{ placeId: "b3", distanceKm: 5.8, nextAvailable: "Tomorrow · 11:00 AM", insurers: ["Bupa", "Tawuniya"] }],
  },
];

export function directionsUrl(place: NearbyPlace) {
  return `https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`;
}

export function mapUrl(place: NearbyPlace) {
  return `https://www.google.com/maps/search/?api=1&query=${place.lat},${place.lng}`;
}

export function whatsappUrl(place: NearbyPlace) {
  return `https://wa.me/${place.whatsapp.replace(/\D/g, "")}`;
}

export function placeById(id: string) {
  return NEARBY_PLACES.find((place) => place.id === id) ?? null;
}

export function doctorById(id: string) {
  return NEARBY_DOCTORS.find((doctor) => doctor.id === id) ?? null;
}

export function doctorsForPlace(placeId: string) {
  return NEARBY_DOCTORS.filter((doctor) => doctor.locations.some((location) => location.placeId === placeId));
}

export function specialtyBySlug(slug: string) {
  return SPECIALTIES.find((specialty) => specialty.slug === slug) ?? null;
}
