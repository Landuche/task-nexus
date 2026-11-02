import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { TaskForm } from "@/components/TaskForm";

export const metadata: Metadata = { title: "New task" };

export default function NewTaskPage() {
  return (
    <>
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
        <ArrowLeft className="size-4" aria-hidden />
        Back to tasks
      </Link>
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">New task</h1>
      <TaskForm />
    </>
  );
}
