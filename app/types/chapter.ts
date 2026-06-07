import type { Question } from "~/types";

export interface Chapters {
  Aéronef: AeronefChapter;
  ATLA: AtlaChapter;
  "Équipements et systèmes": EquipementsChapter;
  Météo: MeteoChapter;
  Moteur: MoteurChapter;
  Navigation: NavChapter;
}

export type Chapter<T extends Course> = Chapters[T];

export interface ChapterData {
  questions: Question[];
}

export interface QuiznacRouteParams {
  course: Course;
  chapter: Chapter<Course>;
}

export type ChapterDocument<T extends Course> = {
  [K in Chapter<T>]: ChapterData;
};

export const Courses = [
  "Aéronef",
  "ATLA",
  "Équipements et systèmes",
  "Météo",
  "Moteur",
  "Navigation",
] as const;
export type Course = UnionFromArray<typeof Courses>;

export const AtlaChapters = [
  "Introduction et organisations",
  "Unités et tables d'épellation",
  "Services de la circulation aérienne",
  "Aérodrome",
  "Procédures et séparations",
  "Altimétrie",
  "Règles de l'air",
  "Espace aérien",
  "Routes",
  "Attentes",
] as const;
export type AtlaChapter = UnionFromArray<typeof AtlaChapters>;

export const AeronefChapters = [
  "Introduction",
  "Élements de structure",
  "Unités et pilotage",
  "Forces en vol et portance",
  "Les traînées",
  "Hypersustentateurs et aérofreins",
  "Phases en vol",
  "Enveloppe de vol",
  "Anémométrie",
  "Stabilité",
] as const;
export type AeronefChapter = UnionFromArray<typeof AeronefChapters>;

export const EquipementsChapters = [
  "Signaux et ondes radio",
  "Principes de la radio",
  "Communications vocales pour l'ATC",
  "Exploitation opérationnelle des fréquences",
  "Communications non vocales",
  "Radiogoniométrie",
] as const;
export type EquipementsChapter = UnionFromArray<typeof EquipementsChapters>;

export const MeteoChapters = [
  "Atmosphère",
  "Énergie",
  "Température",
  "Pression",
  "Altimétrie barométrique",
  "Eau",
  "Nuages",
  "Précipitations",
  "Vent",
  "Circulation générale",
  "Masses d'air",
  "Systèmes frontaux",
  "Phénomènes locaux",
  "Visibilité",
  "Givrage",
  "Turbulence",
  "Cisaillement du vent",
  "CB et orages",
  "Cendres volcaniques",
  "Météorologie spatiale",
  "Services météo et organisation",
  "Messages d'aérodrome",
  "Messages en route",
  "Cartes météorologiques",
] as const;
export type MeteoChapter = UnionFromArray<typeof MeteoChapters>;

export const MoteurChapters = [] as const;
export type MoteurChapter = UnionFromArray<typeof MoteurChapters>;

export const NavChapters = [
  "Introduction",
  "La Terre",
  "Positionnement",
  "Unités de mesure",
  "Directions",
  "Distances",
  "Les temps",
  "Le magnétisme",
  "Les cartes OACI",
  "Les cartes commerciales",
  "Le triangle des vitesses",
  "Considérations opérationnelles",
  "Les systèmes de navigation",
  "Introduction à la radionavigation",
  "VDF (VHF Direction Finding)",
  "ADF (Automatic Direction Finder) et NDB (Non Directional Finder)",
  "VOR (VHF Omnidirectional Radio Range)",
  "DME (Distance Measuring Equipment)",
  "TACAN (TACtical Air Navigation)",
  "ILS (Instrument Landing System)",
  "Instruments de bord",
  "INS (Inertial Navigation System)",
  "GNSS (Global Navigation Satellite System)",
  "FMS (Flight Management Systems)",
  "RNAV (Area Navigation) et PBN (Performance-Based Navigation)",
  "Classification des approches aux instruments",
  "Cartes de vol aux instruments",
  "Les minima pour les approches aux instruments",
  "Procédures d'approche aux instruments",
] as const;
export type NavChapter = UnionFromArray<typeof NavChapters>;

export const Chapters: Record<Course, readonly Chapter<Course>[]> = {
  Aéronef: AeronefChapters,
  ATLA: AtlaChapters,
  "Équipements et systèmes": EquipementsChapters,
  Météo: MeteoChapters,
  Moteur: MoteurChapters,
  Navigation: NavChapters,
};
