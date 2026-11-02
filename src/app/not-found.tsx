import { SearchX } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <SearchX className="size-10 text-zinc-400" aria-hidden />
      <h1 className="text-xl font-semibold">Task not found</h1>
      <p className="text-sm text-zinc-500">It may have been deleted.</p>
      <ButtonLink href="/" variant="secondary" className="mt-2">
        Back to tasks
      </ButtonLink>
    </div>
  );
}
