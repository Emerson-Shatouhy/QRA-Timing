import TeamsTable from "@/components/TeamsTable";

export default function TeamsPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="space-y-8">
          <section>
            <TeamsTable />
          </section>
        </div>
      </div>
    </div>
  );
}
