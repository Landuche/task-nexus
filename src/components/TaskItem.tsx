import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import type { Task } from "@/server/tasks-store";

type Props = {
  task: Task;
  isConfirming: boolean;
  isDeleting: boolean;
  onToggle: (completed: boolean) => void;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
};

export function TaskItem({
  task,
  isConfirming,
  isDeleting,
  onToggle,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: Props) {
  // Local state lets the checkbox reflect the click immediately; the server value follows via props.
  const [completed, setCompleted] = useState(task.completed);
  useEffect(() => setCompleted(task.completed), [task.completed]);

  return (
    <li className="flex items-start gap-4 p-4 transition-colors hover:bg-zinc-50/60 dark:hover:bg-zinc-800/40">
      <input
        type="checkbox"
        checked={completed}
        onChange={(event) => {
          setCompleted(event.target.checked);
          onToggle(event.target.checked);
        }}
        aria-label={`Mark "${task.title}" as completed`}
        className="mt-1 size-4 shrink-0 cursor-pointer accent-emerald-600"
      />

      <div className="min-w-0 flex-1">
        <h3 className={`truncate font-medium ${completed ? "text-zinc-400 line-through" : ""}`}>{task.title}</h3>
        {task.description && (
          <p className="mt-0.5 line-clamp-2 whitespace-pre-line text-sm text-zinc-600 dark:text-zinc-400">
            {task.description}
          </p>
        )}
        <p className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
          <CalendarClock className="size-3.5" aria-hidden />
          <time dateTime={new Date(task.createdAt).toISOString()}>{formatDate(task.createdAt)}</time>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {isConfirming ? (
          <>
            <span className="mr-1 text-sm text-zinc-600 dark:text-zinc-400">Delete?</span>
            <Button variant="danger" className="px-3 py-1.5" loading={isDeleting} onClick={onConfirmDelete}>
              {isDeleting ? "Deleting" : "Yes"}
            </Button>
            <Button variant="ghost" className="px-3 py-1.5" onClick={onCancelDelete} disabled={isDeleting}>
              No
            </Button>
          </>
        ) : (
          <>
            <Link
              href={`/tasks/${task.id}/edit`}
              aria-label={`Edit "${task.title}"`}
              className="grid size-9 place-items-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-2 focus-visible:outline-accent dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              <Pencil className="size-4" aria-hidden />
            </Link>
            <button
              type="button"
              aria-label={`Delete "${task.title}"`}
              onClick={onRequestDelete}
              className="grid size-9 cursor-pointer place-items-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 focus-visible:outline-2 focus-visible:outline-accent dark:hover:bg-red-950/50"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          </>
        )}
      </div>
    </li>
  );
}
