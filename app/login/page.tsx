import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { authEnabled } from "@/lib/auth";

export default function Login() {
  if (!authEnabled()) redirect("/");
  return (
    <main className="login">
      <div className="login-card">
        <div>
          <div className="brand"><b>Ellison &amp; Co.</b> Home Refresh</div>
          <h1 className="title mt-8">Job Book</h1>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
