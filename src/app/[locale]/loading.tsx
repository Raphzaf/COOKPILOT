import { Spinner } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="flex min-h-[50dvh] items-center justify-center" role="status" aria-busy="true">
      <Spinner className="size-6 text-primary" />
    </div>
  );
}
