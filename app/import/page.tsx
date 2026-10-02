import { Back } from "@/components/bits";
import { Importer } from "@/components/Importer";
import { Shell } from "@/components/Shell";

export default function ImportPage() {
  return (
    <Shell>
      <Back href="/people" label="People" />
      <div className="page-head">
        <div>
          <h1 className="title">Import contacts</h1>
          <p className="subtitle">Bring over “JOBS FINAL v7”. Anyone already in the book is skipped.</p>
        </div>
      </div>
      <Importer />
    </Shell>
  );
}
