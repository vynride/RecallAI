import { JobsList } from "@/components/dashboard/JobsList";
import { UploadDropzoneLoader } from "@/components/dashboard/UploadDropzoneLoader";

export default function DashboardPage() {
  return (
    <div className="space-y-12">
      <section>
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-deep-green">
          New job
        </p>
        <h1 className="mt-2 text-3xl font-medium tracking-tight text-primary">
          Upload PDFs
        </h1>
        <div className="mt-6">
          <UploadDropzoneLoader />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-medium tracking-tight text-primary">Recent jobs</h2>
        <div className="mt-4">
          <JobsList />
        </div>
      </section>
    </div>
  );
}
