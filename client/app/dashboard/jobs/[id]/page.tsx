import { JobView } from "@/components/dashboard/JobView";

export default async function JobPage({ params }: PageProps<"/dashboard/jobs/[id]">) {
  const { id } = await params;
  return <JobView jobId={id} />;
}
