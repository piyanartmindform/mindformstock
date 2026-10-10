import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { registerHref } from "@/lib/warrantyRegister";

export interface InProgressJob {
  id: string;
  product_id: string;
  customer_name: string;
  project_name: string | null;
  sold: number;
  registered: number;
  productName: string;
}

// stock-out orders whose warranty registration was started but is not finished yet
export function InProgressJobs({ jobs }: { jobs: InProgressJob[] }) {
  if (jobs.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-gray-900">
        งานที่ลงทะเบียนยังไม่ครบ <span className="font-normal text-gray-500">({jobs.length})</span>
      </h2>
      {jobs.map((job) => {
        const pct = Math.min(100, Math.round((job.registered / job.sold) * 100));
        return (
          <Card key={job.id} className="py-3">
            <p className="text-xs font-medium text-gray-600">
              {job.customer_name}
              {job.project_name && ` · ${job.project_name}`}
            </p>
            <div className="flex items-center justify-between gap-3 mt-0.5">
              <p className="text-sm font-medium text-gray-900 min-w-0">{job.productName}</p>
              <span className="text-sm font-semibold text-amber-700 whitespace-nowrap">
                {job.registered}/{job.sold}
              </span>
            </div>
            <div className="h-2 rounded-full bg-gray-200 mt-2 overflow-hidden">
              <div className="h-full bg-brand" style={{ width: `${pct}%` }} />
            </div>
            <div className="flex justify-end mt-3">
              <Link
                href={registerHref(job)}
                className="inline-flex items-center justify-center h-8 px-2.5 rounded-lg border text-xs font-medium border-gray-300 bg-white text-gray-700 active:bg-gray-100"
              >
                ลงทะเบียนต่อ →
              </Link>
            </div>
          </Card>
        );
      })}
    </section>
  );
}
