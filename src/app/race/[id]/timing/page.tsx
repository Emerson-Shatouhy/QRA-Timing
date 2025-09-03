'use client';
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Race, RaceType, RaceStatus } from "../../../../../utils/types/race";
import { getAllRaces, updateRaceActualStart, updateRaceStatus } from "../../../../../utils/races/getRace";
import { getBoatsByRace, updateBoatStatus } from "../../../../../utils/boats/getBoat";
import { createRaceResult, getRaceResultsByEntry, updateRaceResult, getRaceResultsByRace } from "../../../../../utils/raceResults/getRaceResult";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BoatStatus } from "../../../../../utils/types/boat";
import { createClient } from "../../../../../utils/supabase/client";

interface BoatEntry {
  id: bigint;
  bow_number: number;
  boat_status: string | null;
  teams: {
    id: bigint;
    team_name: string;
  };
}

interface TimingEvent {
  id: string;
  bowNumber: number | null;
  teamName: string | null;
  type: 'start' | 'finish';
  time: Date;
  raceResultId?: bigint;
  status?: 'pending' | 'assigned' | 'finished';
}

export default function RaceTimingPage() {
  const params = useParams();
  const router = useRouter();
  const raceId = params.id as string;
  
  const [race, setRace] = useState<Race | null>(null);
  const [boats, setBoats] = useState<BoatEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [raceStartTime, setRaceStartTime] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [bowNumberInput, setBowNumberInput] = useState<string>('');
  const [timingEvents, setTimingEvents] = useState<TimingEvent[]>([]);
  const [isRaceStarted, setIsRaceStarted] = useState(false);
  const [isRaceStopped, setIsRaceStopped] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const races = await getAllRaces();
        const foundRace = races?.find(r => r.id.toString() === raceId);
        
        if (!foundRace) {
          setError("Race not found");
          return;
        }

        if (foundRace.race_type !== RaceType.HEAD_RACE) {
          setError("This timing system is only for head races");
          return;
        }

        setRace(foundRace);
        
        // Check if race has already started
        if (foundRace.actual_start) {
          setRaceStartTime(new Date(foundRace.actual_start));
          setIsRaceStarted(true);
          if (foundRace.race_status === RaceStatus.FINISHED) {
            setIsRaceStopped(true);
          }
        }
        
        const boatEntries = await getBoatsByRace(BigInt(raceId));
        setBoats(boatEntries || []);

        // Load existing race results to restore timing events
        if (foundRace.actual_start) {
          try {
            const existingResults = await getRaceResultsByRace(BigInt(raceId));
            const restoredEvents: TimingEvent[] = [];

            for (const result of existingResults) {
              if (result.entries && result.start_time) {
                const startTime = new Date(result.start_time);
                
                // Add start event
                restoredEvents.push({
                  id: `start-${result.entries.bow_number}-${startTime.getTime()}`,
                  bowNumber: result.entries.bow_number,
                  teamName: result.entries.teams?.team_name || 'Unknown Team',
                  type: 'start',
                  time: startTime,
                  status: result.end_time ? 'finished' : 'assigned',
                  raceResultId: result.id
                });

                // Add finish event if exists
                if (result.end_time) {
                  const endTime = new Date(result.end_time);
                  
                  restoredEvents.push({
                    id: `finish-${result.entries.bow_number}-${endTime.getTime()}`,
                    bowNumber: result.entries.bow_number,
                    teamName: result.entries.teams?.team_name || 'Unknown Team',
                    type: 'finish',
                    time: endTime,
                    status: 'finished',
                    raceResultId: result.id
                  });
                }
              }
            }

            // Sort by time (newest first)
            restoredEvents.sort((a, b) => b.time.getTime() - a.time.getTime());
            setTimingEvents(restoredEvents);
          } catch (err) {
            console.error('Error loading existing race results:', err);
          }
        }
        
      } catch (err) {
        console.error('Error fetching data:', err);
        setError("Failed to load race data");
      } finally {
        setLoading(false);
      }
    };

    if (raceId) {
      fetchData();
    }
  }, [raceId]);

  // Realtime subscriptions for live updates
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`race_timing_${raceId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'races',
          filter: `id=eq.${raceId}`
        },
        async (payload) => {
          console.log('Race change:', payload);
          // Update race data when race status or start time changes
          if (payload.new) {
            const updatedRace = payload.new as Race;
            setRace(updatedRace);
            
            // Update race start time if it was set
            if (updatedRace.actual_start && !raceStartTime) {
              setRaceStartTime(new Date(updatedRace.actual_start));
              setIsRaceStarted(true);
            }
            
            // Update race stopped status
            if (updatedRace.race_status === RaceStatus.FINISHED) {
              setIsRaceStopped(true);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'race_results'
        },
        async (payload) => {
          console.log('Race results change:', payload);
          // Debounce realtime updates to prevent duplicate events
          setTimeout(async () => {
            if (race?.actual_start) {
            try {
              const existingResults = await getRaceResultsByRace(BigInt(raceId));
              const restoredEvents: TimingEvent[] = [];

              for (const result of existingResults) {
                if (result.entries && result.start_time) {
                  // Parse database timestamp correctly - Supabase returns UTC timestamps
                  const startTime = new Date(result.start_time);
                  // Adjust for timezone offset if needed
                  const correctedStartTime = new Date(startTime.getTime() + (startTime.getTimezoneOffset() * 60000));
                  console.log('Original start_time from DB:', result.start_time, 'Raw parsed:', startTime, 'Timezone corrected:', correctedStartTime);
                  
                  // Add start event
                  restoredEvents.push({
                    id: `start-${result.entries.bow_number}-${correctedStartTime.getTime()}`,
                    bowNumber: result.entries.bow_number,
                    teamName: result.entries.teams?.team_name || 'Unknown Team',
                    type: 'start',
                    time: correctedStartTime,
                    status: result.end_time ? 'finished' : 'assigned',
                    raceResultId: result.id
                  });

                  // Add finish event if exists
                  if (result.end_time) {
                    const endTime = new Date(result.end_time);
                    const correctedEndTime = new Date(endTime.getTime() + (endTime.getTimezoneOffset() * 60000));
                    console.log('Original end_time from DB:', result.end_time, 'Raw parsed:', endTime, 'Timezone corrected:', correctedEndTime);
                      
                    restoredEvents.push({
                      id: `finish-${result.entries.bow_number}-${correctedEndTime.getTime()}`,
                      bowNumber: result.entries.bow_number,
                      teamName: result.entries.teams?.team_name || 'Unknown Team',
                      type: 'finish',
                      time: correctedEndTime,
                      status: 'finished',
                      raceResultId: result.id
                    });
                  }
                }
              }

              // Sort by time (newest first)
              restoredEvents.sort((a, b) => b.time.getTime() - a.time.getTime());
              setTimingEvents(restoredEvents);
            } catch (err) {
              console.error('Error reloading timing events:', err);
            }
          }
          }, 1000); // 1 second debounce
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'entries'
        },
        async (payload) => {
          console.log('Entries change:', payload);
          // Reload boat data when entries are updated
          try {
            const boatEntries = await getBoatsByRace(BigInt(raceId));
            setBoats(boatEntries || []);
          } catch (err) {
            console.error('Error reloading boats:', err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [raceId, race?.actual_start, raceStartTime]);

  const getBoatStatusColor = (status: string | null): string => {
    switch (status) {
      case 'on_water':
        return 'border-green-500 bg-green-50';
      case 'finished':
        return 'border-gray-500 bg-gray-50';
      case 'ready':
        return 'border-yellow-500 bg-yellow-50';
      case 'dns':
        return 'border-orange-500 bg-orange-50';
      case 'dnf':
        return 'border-red-500 bg-red-50';
      case 'dsq':
        return 'border-purple-500 bg-purple-50';
      case 'entered':
      default:
        return 'border-blue-500 bg-blue-50';
    }
  };

  useEffect(() => {
    if (isRaceStarted && !isRaceStopped) {
      const interval = setInterval(() => {
        setCurrentTime(new Date());
      }, 100);
      return () => clearInterval(interval);
    }
  }, [isRaceStarted, isRaceStopped]);

  const handleBackToRace = () => {
    router.push(`/race/${raceId}`);
  };

  const handleStartRaceClock = async () => {
    const now = new Date();
    try {
      const success = await updateRaceActualStart(BigInt(raceId), now);
      if (success) {
        setRaceStartTime(now);
        setCurrentTime(now);
        setIsRaceStarted(true);
        setIsRaceStopped(false);
        // Update race object
        if (race) {
          setRace({
            ...race,
            actual_start: now,
            race_status: RaceStatus.STARTED
          });
        }
      } else {
        alert('Failed to start race clock');
      }
    } catch (err) {
      console.error('Error starting race clock:', err);
      alert('Failed to start race clock');
    }
  };

  const handleStopRaceClock = async () => {
    try {
      const success = await updateRaceStatus(BigInt(raceId), RaceStatus.FINISHED);
      if (success) {
        setIsRaceStopped(true);
        // Update race object
        if (race) {
          setRace({
            ...race,
            race_status: RaceStatus.FINISHED
          });
        }
      } else {
        alert('Failed to stop race clock');
      }
    } catch (err) {
      console.error('Error stopping race clock:', err);
      alert('Failed to stop race clock');
    }
  };

  const getElapsedTime = (): string => {
    if (!raceStartTime || !isRaceStarted) return "00:00:00.0";
    
    const elapsed = currentTime.getTime() - raceStartTime.getTime();
    const totalSeconds = Math.floor(elapsed / 1000);
    const tenths = Math.floor((elapsed % 1000) / 100);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${tenths}`;
  };

  const handleMarkTime = async (type: 'start' | 'finish') => {
    if (!raceStartTime || isRaceStopped) return;
    
    const now = new Date();
    let newEvent: TimingEvent;

    if (bowNumberInput.trim()) {
      // Has bow number - process immediately
      const bowNumber = parseInt(bowNumberInput.trim());
      const boat = boats.find(b => b.bow_number === bowNumber);
      
      if (!boat) {
        alert(`Bow number ${bowNumber} not found in this race`);
        return;
      }

      // Validation for timing events
      try {
        const existingResults = await getRaceResultsByEntry(boat.id);
        
        if (type === 'start') {
          // Check if boat already has a start time
          const hasStart = existingResults.some(r => r.start_time);
          if (hasStart) {
            alert(`Bow number ${bowNumber} has already started. Use finish time instead.`);
            return;
          }
        } else if (type === 'finish') {
          // Check if boat has started
          const activeResult = existingResults.find(r => r.status === BoatStatus.ON_WATER);
          
          if (!activeResult) {
            alert(`Bow number ${bowNumber} has not started yet. Please mark a start time first.`);
            return;
          }
          
          // Check if boat already finished
          if (activeResult.end_time) {
            alert(`Bow number ${bowNumber} has already finished.`);
            return;
          }
        }
      } catch (err) {
        console.error('Error checking boat timing status:', err);
        alert('Error checking boat timing status. Please try again.');
        return;
      }

      newEvent = {
        id: `${type}-${bowNumber}-${now.getTime()}`,
        bowNumber,
        teamName: boat.teams.team_name,
        type,
        time: now,
        status: 'assigned'
      };

      try {
        if (type === 'start') {
          const result = await createRaceResult(
            boat.id,
            now,
            undefined,
            undefined,
            BoatStatus.ON_WATER
          );
          if (result) {
            newEvent.raceResultId = result.id;
            // Update boat entry status to ON_WATER
            await updateBoatStatus(boat.id, BoatStatus.ON_WATER);
          }
        } else {
          const existingResults = await getRaceResultsByEntry(boat.id);
          const activeResult = existingResults.find(r => r.status === BoatStatus.ON_WATER);
          
          if (activeResult) {
            await updateRaceResult(activeResult.id, {
              end_time: now,
              status: BoatStatus.FINISHED
            });
            newEvent.raceResultId = activeResult.id;
            newEvent.status = 'finished';
            // Update boat entry status to FINISHED
            await updateBoatStatus(boat.id, BoatStatus.FINISHED);
          }
        }
        
      } catch (err) {
        console.error('Error updating race result:', err);
        alert('Failed to record timing event');
        return;
      }
    } else {
      // No bow number - create pending event
      newEvent = {
        id: `${type}-pending-${now.getTime()}`,
        bowNumber: null,
        teamName: null,
        type,
        time: now,
        status: 'pending'
      };
    }

    setTimingEvents(prev => [newEvent, ...prev]);
    setBowNumberInput('');
  };

  const handleAssignBowNumber = async (eventId: string, bowNumber: number) => {
    const boat = boats.find(b => b.bow_number === bowNumber);
    if (!boat) {
      alert(`Bow number ${bowNumber} not found in this race`);
      return;
    }

    const event = timingEvents.find(e => e.id === eventId);
    if (!event || event.status !== 'pending') return;

    try {
      if (event.type === 'start') {
        const result = await createRaceResult(
          boat.id,
          event.time,
          undefined,
          undefined,
          BoatStatus.ON_WATER
        );
        if (result) {
          // Update boat entry status to ON_WATER
          await updateBoatStatus(boat.id, BoatStatus.ON_WATER);
          setTimingEvents(prev => prev.map(e => 
            e.id === eventId 
              ? { ...e, bowNumber, teamName: boat.teams.team_name, status: 'assigned' as const, raceResultId: result.id }
              : e
          ));
        }
      } else {
        // For finish events, check if boat has started
        const existingResults = await getRaceResultsByEntry(boat.id);
        const activeResult = existingResults.find(r => r.status === BoatStatus.ON_WATER);
        
        if (!activeResult) {
          alert(`Bow number ${bowNumber} has not started yet. Cannot assign finish time.`);
          return;
        }

        if (activeResult) {
          await updateRaceResult(activeResult.id, {
            end_time: event.time,
            status: BoatStatus.FINISHED
          });
          // Update boat entry status to FINISHED
          await updateBoatStatus(boat.id, BoatStatus.FINISHED);
          setTimingEvents(prev => prev.map(e => 
            e.id === eventId 
              ? { ...e, bowNumber, teamName: boat.teams.team_name, status: 'finished' as const, raceResultId: activeResult.id }
              : e
          ));
        } else {
          alert('No active start time found for this boat');
        }
      }
    } catch (err) {
      console.error('Error assigning bow number:', err);
      alert('Failed to assign bow number');
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="max-w-7xl mx-auto">
          <div className="space-y-8">
            <div className="flex items-center gap-4">
              <Button onClick={handleBackToRace} variant="outline">
                ← Back to Race
              </Button>
            </div>
            <p>Loading timing system...</p>
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
              <Button onClick={handleBackToRace} variant="outline">
                ← Back to Race
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
              <Button onClick={handleBackToRace} variant="outline">
                ← Back to Race
              </Button>
              <h1 className="text-xl md:text-2xl font-bold">
                Timing: {race.race_name || 'Unnamed Race'}
              </h1>
            </div>
          </div>
          
          {/* Race Clock and Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            <div className="bg-white p-4 md:p-6 rounded-lg border shadow-sm">
              <h2 className="text-lg font-semibold mb-4">Race Clock</h2>
              <div className="text-center">
                <div className="text-4xl md:text-6xl font-mono font-bold mb-4 break-all">
                  {getElapsedTime()}
                </div>
                {!isRaceStarted ? (
                  <Button onClick={handleStartRaceClock} size="lg" className="w-full sm:w-auto">
                    Start Race Clock
                  </Button>
                ) : isRaceStopped ? (
                  <div className="space-y-2">
                    <p className="text-red-600 font-medium">Race Clock Stopped</p>
                    <p className="text-sm text-gray-500">Race has been finished</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-green-600 font-medium">Race Clock Running</p>
                    <Button onClick={handleStopRaceClock} variant="destructive" className="w-full sm:w-auto">
                      Stop Race Clock
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Timing Controls */}
            {isRaceStarted && !isRaceStopped && (
              <div className="bg-white p-4 md:p-6 rounded-lg border shadow-sm">
                <h2 className="text-lg font-semibold mb-4">Mark Times</h2>
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder="Bow Number (optional)"
                      value={bowNumberInput}
                      onChange={(e) => setBowNumberInput(e.target.value)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === 'Enter' && e.shiftKey) {
                          e.preventDefault();
                          handleMarkTime('finish');
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          handleMarkTime('start');
                        }
                      }}
                      autoFocus
                      className="text-base" // Prevent zoom on iOS
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      onClick={() => handleMarkTime('start')}
                      className="flex-1 min-h-[44px]" // Better touch target
                      size="lg"
                    >
                      <span className="hidden sm:inline">Mark Start (Enter)</span>
                      <span className="sm:hidden">Start</span>
                    </Button>
                    <Button 
                      onClick={() => handleMarkTime('finish')}
                      variant="destructive"
                      className="flex-1 min-h-[44px]" // Better touch target
                      size="lg"
                    >
                      <span className="hidden sm:inline">Mark Finish (Shift+Enter)</span>
                      <span className="sm:hidden">Finish</span>
                    </Button>
                  </div>
                  <p className="text-xs sm:text-sm text-gray-500">
                    You can mark times without bow numbers and assign them later
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Boat List for Reference */}
          <div className="bg-white p-4 md:p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Boats in Race</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {boats.map(boat => (
                <div 
                  key={boat.id.toString()} 
                  className={`p-2 border-2 rounded text-sm transition-colors ${getBoatStatusColor(boat.boat_status)}`}
                >
                  <div className="font-medium">Bow {boat.bow_number}</div>
                  <div className="text-gray-600 text-xs">{boat.teams.team_name}</div>
                  {boat.boat_status && (
                    <div className="text-xs mt-1 opacity-75 capitalize">
                      {boat.boat_status.replace('_', ' ')}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Recent Events */}
          <div className="bg-white p-4 md:p-6 rounded-lg border shadow-sm">
            <h2 className="text-lg font-semibold mb-4">Recent Events</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {timingEvents.length === 0 ? (
                <p className="text-gray-500">No timing events yet</p>
              ) : (
                timingEvents.map(event => {
                  const getEventStyling = () => {
                    if (event.status === 'pending') {
                      return 'border-l-yellow-500 bg-yellow-50';
                    } else if (event.status === 'finished') {
                      return 'border-l-gray-500 bg-gray-50';
                    } else if (event.status === 'assigned' && event.type === 'start') {
                      return 'border-l-green-500 bg-green-50';
                    } else {
                      return 'border-l-red-500 bg-red-50';
                    }
                  };

                  const getEventTextColor = () => {
                    if (event.status === 'pending') {
                      return 'text-yellow-700';
                    } else if (event.status === 'finished') {
                      return 'text-gray-600';
                    } else if (event.type === 'start') {
                      return 'text-green-700';
                    } else {
                      return 'text-red-700';
                    }
                  };

                  return (
                    <div 
                      key={event.id} 
                      className={`p-3 rounded border-l-4 ${getEventStyling()}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">
                            {event.bowNumber 
                              ? `Bow ${event.bowNumber} - ${event.teamName}`
                              : 'Unassigned'
                            }
                          </div>
                          <div className={`text-sm ${getEventTextColor()}`}>
                            {event.status === 'pending' 
                              ? `${event.type === 'start' ? 'Start' : 'Finish'} - Pending Assignment`
                              : event.status === 'finished'
                              ? 'Finished'
                              : event.type === 'start' ? 'Started' : 'Finished'
                            }
                          </div>
                          {event.status === 'pending' && (
                            <div className="mt-2">
                              <Input
                                type="number"
                                placeholder="Enter bow number"
                                className="w-full sm:w-24 h-8 text-sm"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const bowNumber = parseInt((e.target as HTMLInputElement).value);
                                    if (bowNumber) {
                                      handleAssignBowNumber(event.id, bowNumber);
                                    }
                                  }
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 text-right">
                          <div>{(() => {
                            const timeStr = event.time.toLocaleTimeString('en-US', { 
                              hour12: false, 
                              hour: '2-digit', 
                              minute: '2-digit', 
                              second: '2-digit' 
                            });
                            console.log('Event time:', event.time, 'Formatted:', timeStr);
                            return timeStr;
                          })()}</div>
                          {raceStartTime && (
                            <div>
                              +{Math.floor((event.time.getTime() - raceStartTime.getTime()) / 1000)}s
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}