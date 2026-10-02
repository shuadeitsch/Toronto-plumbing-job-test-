import { Suspense } from "react";
import { Chat } from "@/components/Chat";
import { Shell } from "@/components/Shell";

export default function Ask() {
  return (
    <Shell>
      <div className="page-head">
        <div>
          <h1 className="title">Ask your book</h1>
        </div>
      </div>
      <Suspense>
        <Chat />
      </Suspense>
    </Shell>
  );
}
