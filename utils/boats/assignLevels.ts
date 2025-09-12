import { Boat } from '../types/boat';

/**
 * Assigns alphabetical levels (A, B, C, etc.) to boats from the same team in the same race
 */
export function assignLevelsToBoats(boats: Boat[]): Boat[] {
  const boatsWithLevels = [...boats];
  
  // Group boats by race and team
  const groupedByRaceAndTeam = new Map<string, Boat[]>();
  
  boatsWithLevels.forEach(boat => {
    if (boat.race_id) {
      const key = `${boat.race_id}_${boat.team_id}`;
      if (!groupedByRaceAndTeam.has(key)) {
        groupedByRaceAndTeam.set(key, []);
      }
      groupedByRaceAndTeam.get(key)!.push(boat);
    }
  });
  
  // Assign levels to each group
  groupedByRaceAndTeam.forEach(teamBoats => {
    // Sort by boat ID to ensure consistent ordering
    teamBoats.sort((a, b) => Number(a.id) - Number(b.id));
    
    // Assign levels A, B, C, etc.
    teamBoats.forEach((boat, index) => {
      boat.level = String.fromCharCode(65 + index); // 65 is ASCII for 'A'
    });
  });
  
  return boatsWithLevels;
}

/**
 * Generates the next level for a team in a specific race
 */
export function getNextLevelForTeam(existingBoats: Boat[], teamId: bigint, raceId: bigint): string {
  const teamBoatsInRace = existingBoats.filter(
    boat => boat.team_id === teamId && boat.race_id === raceId
  );
  
  const usedLevels = teamBoatsInRace
    .map(boat => boat.level)
    .filter(level => level !== null)
    .sort();
  
  // Find the next available level
  let nextLevelIndex = 0;
  while (nextLevelIndex < usedLevels.length) {
    const expectedLevel = String.fromCharCode(65 + nextLevelIndex);
    if (usedLevels[nextLevelIndex] !== expectedLevel) {
      return expectedLevel;
    }
    nextLevelIndex++;
  }
  
  // Return the next level in sequence
  return String.fromCharCode(65 + nextLevelIndex);
}