'use client';
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Race, RaceType, RaceStatus } from "../../../../utils/types/race";
import { getAllRaces } from "../../../../utils/races/getRace";
import RaceEntriesTable from "@/components/RaceEntriesTable";
import RaceDetailsSidebar from "@/components/RaceDetailsSidebar";
import RaceResultsTable from "@/components/RaceResultsTable";
import { Button } from "@/components/ui/button";
import { createClient } from "../../../../utils/supabase/client";

export default function RacePage() {
  const params = useParams();
  const router = useRouter();
  const raceId = params.id as string;
  
  const [race, setRace] = useState<Race | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRace = async () => {
      try {
        const races = await getAllRaces();
        const foundRace = races?.find(r => r.id.toString() === raceId);
        
        if (foundRace) {
          setRace(foundRace);
        } else {
          setError("Race not found");
        }
      } catch (err) {
        console.error('Error fetching race:', err);
        setError("Failed to load race");
      } finally {
        setLoading(false);
      }
    };

    if (raceId) {
      fetchRace();
    }
  }, [raceId]);

  // Realtime subscription for race updates
  useEffect(() => {
    if (!raceId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`race_page_${raceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'races',
          filter: `id=eq.${raceId}`
        },
        async (payload) => {
          console.log('Race status change:', payload);
          if (payload.new) {
            const updatedRace = payload.new as Race;
            setRace(updatedRace);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raceId]);

  const handleBackToRaces = () => {
    router.push('/');
  };

  const handleStartRace = () => {
    router.push(`/race/${raceId}/timing`);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Button onClick={handleBackToRaces} variant="outline">
                ← Back to Races
              </Button>
            </div>
            <p>Loading race...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !race) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Button onClick={handleBackToRaces} variant="outline">
                ← Back to Races
              </Button>
            </div>
            <p className="text-red-600">{error || "Race not found"}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-6 md:space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Button onClick={handleBackToRaces} variant="outline">
                ← Back to Races
              </Button>
              <h1 className="text-xl md:text-2xl font-bold">
                {race.race_name || 'Unnamed Race'}
              </h1>
            </div>
            {race.race_type === RaceType.HEAD_RACE && race.race_status !== RaceStatus.FINISHED && (
              <Button onClick={handleStartRace} className="w-full sm:w-auto">
                Manage Race
              </Button>
            )}
          </div>
          
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
            <div className="flex-1 space-y-6 md:space-y-8">
              <RaceEntriesTable race={race} onBack={handleBackToRaces} />
              {race.race_status === RaceStatus.FINISHED && (
                <RaceResultsTable race={race} />
              )}
            </div>
            <div className="lg:w-80 lg:shrink-0">
              <RaceDetailsSidebar race={race} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}