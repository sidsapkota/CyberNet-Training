import { Dashboard } from "@/components/dashboard/Dashboard";
import { getCourses } from "@/lib/content/server";

export default function DashboardPage() {
  return (
    <main className="mx-auto max-w-wide px-gutter py-6 sm:py-10">
      <Dashboard courses={getCourses()} />
    </main>
  );
}
