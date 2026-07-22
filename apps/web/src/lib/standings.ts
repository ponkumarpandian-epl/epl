export type PlacementTone = "gold" | "silver" | "bronze";

export interface OverallPlacement {
  rank: 1 | 2 | 3;
  title: string;
  team: string;
  shortTeam: string;
  points: number;
  gold: number;
  silver: number;
  image: string;
  tone: PlacementTone;
}

export interface Standing {
  rank: number;
  team: string;
  cricket: number;
  badminton: number;
  volleyball: number;
  participation: number;
  bonus: number;
  total: number;
  gold: number;
  silver: number;
}

export interface SportPodium {
  sport: "Cricket" | "Badminton" | "Volleyball";
  champion: string;
  runnerUp: string;
  semiFinalists: string;
}

export const overallPlacements: OverallPlacement[] = [
  {
    rank: 1,
    title: "Overall Champions",
    team: "GM Infinite E-City Town",
    shortTeam: "GM E-City Town",
    points: 890,
    gold: 1,
    silver: 0,
    image: "https://steplmediacontent.blob.core.windows.net/season2/result/EPL_Champions_Collage.jpg",
    tone: "gold",
  },
  {
    rank: 2,
    title: "Overall Runners-up",
    team: "Sriram Summit",
    shortTeam: "Sriram Summit",
    points: 890,
    gold: 0,
    silver: 2,
    image: "https://steplmediacontent.blob.core.windows.net/season2/result/EPL_RunnersUp_Collage.jpg",
    tone: "silver",
  },
  {
    rank: 3,
    title: "Third Place",
    team: "SNN Raj Serenity",
    shortTeam: "SNN Raj Serenity",
    points: 810,
    gold: 1,
    silver: 1,
    image: "https://steplmediacontent.blob.core.windows.net/season2/result/EPL_ThirdPlace_Collage.jpg",
    tone: "bronze",
  },
];

export const sportPodiums: SportPodium[] = [
  {
    sport: "Cricket",
    champion: "RCC",
    runnerUp: "SNN Raj Serenity",
    semiFinalists: "GM Infinite & Sriram Summit",
  },
  {
    sport: "Badminton",
    champion: "SNN Raj Serenity",
    runnerUp: "Sriram Summit",
    semiFinalists: "GM Infinite & Ajmera",
  },
  {
    sport: "Volleyball",
    champion: "GM Infinite E-City Town",
    runnerUp: "Sriram Summit",
    semiFinalists: "Esteem & PSR Krish",
  },
];

export const standings: Standing[] = [
  { rank: 1, team: "GM Infinite E-City Town", cricket: 160, badminton: 160, volleyball: 320, participation: 150, bonus: 100, total: 890, gold: 1, silver: 0 },
  { rank: 2, team: "Sriram Summit", cricket: 160, badminton: 240, volleyball: 240, participation: 150, bonus: 100, total: 890, gold: 0, silver: 2 },
  { rank: 3, team: "SNN Raj Serenity", cricket: 240, badminton: 320, volleyball: 50, participation: 100, bonus: 100, total: 810, gold: 1, silver: 1 },
  { rank: 4, team: "Esteem", cricket: 50, badminton: 50, volleyball: 160, participation: 50, bonus: 100, total: 410, gold: 0, silver: 0 },
  { rank: 5, team: "PSR Krish", cricket: 50, badminton: 50, volleyball: 160, participation: 50, bonus: 100, total: 410, gold: 0, silver: 0 },
  { rank: 6, team: "RCC", cricket: 320, badminton: 0, volleyball: 0, participation: 50, bonus: 0, total: 370, gold: 1, silver: 0 },
  { rank: 7, team: "Ajmera", cricket: 0, badminton: 160, volleyball: 50, participation: 50, bonus: 0, total: 260, gold: 0, silver: 0 },
  { rank: 8, team: "Concord Manhattans", cricket: 50, badminton: 0, volleyball: 50, participation: 0, bonus: 0, total: 100, gold: 0, silver: 0 },
  { rank: 9, team: "SME Meadows", cricket: 50, badminton: 50, volleyball: 0, participation: 0, bonus: 0, total: 100, gold: 0, silver: 0 },
  { rank: 10, team: "SVG", cricket: 50, badminton: 0, volleyball: 0, participation: 50, bonus: 0, total: 100, gold: 0, silver: 0 },
  { rank: 11, team: "Ajmera 2", cricket: 0, badminton: 50, volleyball: 0, participation: 0, bonus: 0, total: 50, gold: 0, silver: 0 },
  { rank: 12, team: "H&H GM", cricket: 50, badminton: 0, volleyball: 0, participation: 0, bonus: 0, total: 50, gold: 0, silver: 0 },
  { rank: 13, team: "My Fortune", cricket: 50, badminton: 0, volleyball: 0, participation: 0, bonus: 0, total: 50, gold: 0, silver: 0 },
  { rank: 14, team: "TLVA", cricket: 50, badminton: 0, volleyball: 0, participation: 0, bonus: 0, total: 50, gold: 0, silver: 0 },
  { rank: 15, team: "Krishna Mystique", cricket: 0, badminton: 50, volleyball: 0, participation: 0, bonus: 0, total: 50, gold: 0, silver: 0 },
];
