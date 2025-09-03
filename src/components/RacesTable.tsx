'use client';
import { getAllRaces, getEntryCountForRace } from "../../utils/races/getRace";
import { useEffect, useState } from "react";
import { Race } from "../../utils/types/race";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function RacesTable() {
  const [races, setRaces] = useState<Race[]>([]);
  const [entryCounts, setEntryCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRaces = async () => {
      try {
        const racesData = await getAllRaces();
        setRaces(racesData || []);
        
        // Fetch entry counts for each race
        if (racesData && racesData.length > 0) {
          const entryCountPromises = racesData.map(async (race) => ({
            raceId: race.id.toString(),
            count: await getEntryCountForRace(race.id)
          }));
          
          const entryCountResults = await Promise.all(entryCountPromises);
          const entryCountMap = entryCountResults.reduce((acc, { raceId, count }) => {
            acc[raceId] = count;
            return acc;
          }, {} as Record<string, number>);
          
          setEntryCounts(entryCountMap);
        }
      } catch (error) {
        console.error('Error fetching races:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRaces();
  }, []);

  if (loading) {
    return <p>Loading races...</p>;
  }

  return (
    <Table>
      <TableCaption>A list of all races in the regatta.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Race Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Event Date</TableHead>
          <TableHead>Scheduled Start</TableHead>
          <TableHead>Distance (m)</TableHead>
          <TableHead>Weather</TableHead>
          <TableHead>Max Entries</TableHead>
          <TableHead>Entries</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {races.length === 0 ? (
          <TableRow>
            <TableCell colSpan={9} className="text-center">
              No races found
            </TableCell>
          </TableRow>
        ) : (
          races.map((race) => (
            <TableRow key={race.id.toString()}>
              <TableCell className="font-medium">
                <Link 
                  href={`/race/${race.id}`}
                  className="text-blue-600 hover:text-blue-800 hover:underline"
                >
                  {race.race_name || 'Unnamed Race'}
                </Link>
              </TableCell>
              <TableCell>{race.race_type || 'N/A'}</TableCell>
              <TableCell>
                <span className={`px-2 py-1 rounded text-xs ${race.race_status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                    race.race_status === 'ready' ? 'bg-yellow-100 text-yellow-800' :
                      race.race_status === 'started' ? 'bg-green-100 text-green-800' :
                        race.race_status === 'finished' ? 'bg-gray-100 text-gray-800' :
                          race.race_status === 'cancelled' ? 'bg-red-100 text-red-800' :
                            race.race_status === 'abandoned' ? 'bg-orange-100 text-orange-800' :
                              'bg-gray-50 text-gray-500'
                  }`}>
                  {race.race_status || 'N/A'}
                </span>
              </TableCell>
              <TableCell>
                {race.event_date
                  ? new Date(race.event_date).toLocaleDateString()
                  : 'N/A'}
              </TableCell>
              <TableCell>
                {race.scheduled_start
                  ? new Date(race.scheduled_start).toLocaleString()
                  : 'N/A'}
              </TableCell>
              <TableCell>{race.distance_meters || 'N/A'}</TableCell>
              <TableCell>{race.weather_conditions || 'N/A'}</TableCell>
              <TableCell>{race.max_entries || 'N/A'}</TableCell>
              <TableCell>{entryCounts[race.id.toString()] ?? 0}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}