import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TaskForm } from "@/components/TaskForm";
import { caller } from "@/server/caller";

export const metadata: Metadata = { title: "Edit task" };

export default async function EditTaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // A malformed ID also throws (BAD_REQUEST) and is shown as a 404.
  const task = await caller.tasks.get({ id }).catch(() => null);
  if (!task) notFound();

  return (
    <>
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        <ArrowLeft className="size-4" aria-hidden />
        Back to tasks
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Edit task</h1>
      <TaskForm task={task} />
    </>
  );
}
