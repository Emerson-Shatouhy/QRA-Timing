import RacesTable from "@/components/RacesTable";

export default function Home() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">Races</h2>
            <RacesTable />
          </section>
        </div>
      </div>
    </div>
  );
}
