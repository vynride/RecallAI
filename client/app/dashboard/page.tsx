import { JobsList } from "@/components/dashboard/JobsList";
import { UploadDropzoneLoader } from "@/components/dashboard/UploadDropzoneLoader";

export default function DashboardPage() {
  return (
    <div className="space-y-16">

      {/* Upload section — pale-green tinted card */}
      <section>
        <div className="mb-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-coral">New job</p>
          <h1 className="mt-2 text-3xl font-medium tracking-tight text-primary">Upload PDFs</h1>
          <p className="mt-1 text-body-muted text-[15px]">
            Drop your past papers and get a study-ready PDF back.
          </p>
        </div>

        {/* Tinted upload card */}
        <div className="relative rounded-lg overflow-hidden border border-card-border bg-pale-blue">
          {/* Accent stripe */}
          <div className="absolute inset-x-0 top-0 h-0.5 bg-action-blue/30" />
          <div className="p-6">
            <UploadDropzoneLoader />
          </div>
        </div>
      </section>

      {/* Jobs section */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted">History</p>
            <h2 className="mt-1 text-xl font-medium tracking-tight text-primary">Recent jobs</h2>
          </div>
        </div>
        <JobsList />
      </section>

    </div>
  );
}
