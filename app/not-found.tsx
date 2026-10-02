import Link from "next/link";
import { Shell } from "@/components/Shell";

export default function NotFound() {
  return (
    <Shell>
      <div className="page-head"><h1 className="title">Not in the book</h1></div>
      <p className="muted">That record doesn&apos;t exist — it may have been deleted.</p>
      <Link href="/" className="btn mt-16">Back to Today</Link>
    </Shell>
  );
}
