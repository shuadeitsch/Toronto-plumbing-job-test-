import { logout } from "@/app/actions";
import { authEnabled } from "@/lib/auth";
import { isDemo } from "@/lib/store";

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          <b>Ellison &amp; Co.</b> Home Refresh
        </div>
        {authEnabled() && (
          <form action={logout}>
            <button className="btn ghost sm" type="submit">Lock</button>
          </form>
        )}
      </header>
      {isDemo() && <div className="demo-banner">Demo mode — sample data, nothing is saved permanently.</div>}
      <main className="page">{children}</main>
    </div>
  );
}
