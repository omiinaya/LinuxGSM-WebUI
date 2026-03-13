export interface Game {
  id: string;
  name: string;
  description: string;
  defaultPort: number;
  steamAppId?: number;
  image?: string;
}

export const GAMES_CATALOG: Game[] = [
  {
    id: "cs2",
    name: "Counter-Strike 2",
    description: "Popular competitive FPS from Valve",
    defaultPort: 27015,
    steamAppId: 730,
  },
  {
    id: "tf2",
    name: "Team Fortress 2",
    description: "Class-based team shooter",
    defaultPort: 27015,
    steamAppId: 440,
  },
  {
    id: "rust",
    name: "Rust",
    description: "Survival multiplayer game",
    defaultPort: 28015,
    steamAppId: 252490,
  },
  {
    id: "valheim",
    name: "Valheim",
    description: "Viking survival game",
    defaultPort: 2456,
  },
  {
    id: "mc",
    name: "Minecraft (Java)",
    description: "Classic sandbox game",
    defaultPort: 25565,
  },
  {
    id: "ark",
    name: "ARK: Survival Evolved",
    description: "Dinosaur survival MMO",
    defaultPort: 27015,
    steamAppId: 346110,
  },
  {
    id: "7d2d",
    name: "7 Days to Die",
    description: "Zombie survival horror",
    defaultPort: 26900,
    steamAppId: 251570,
  },
  {
    id: "squad",
    name: "Squad",
    description: "Team-based tactical shooter",
    defaultPort: 7787,
    steamAppId: 403240,
  },
];
