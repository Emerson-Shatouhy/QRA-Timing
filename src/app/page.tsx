'use client';

import { useState } from 'react';
import RacesTable from "@/components/RacesTable";
import CreateRaceModal from "@/components/CreateRaceModal";

export default function Home() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleRaceCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-8">
          <section>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Races</h2>
              <CreateRaceModal onRaceCreated={handleRaceCreated} />
            </div>
            <RacesTable refreshTrigger={refreshTrigger} />
          </section>
        </div>
      </div>
    </div>
  );
}
