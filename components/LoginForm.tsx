"use client";

import { useActionState } from "react";
import { login } from "@/app/actions";
import { Submit } from "./forms";

export function LoginForm() {
  const [state, action] = useActionState(login, undefined);
  return (
    <form action={action} className="form">
      <div className="field">
        <label htmlFor="passcode">Passcode</label>
        <input className="input" id="passcode" name="passcode" type="password" autoComplete="current-password" autoFocus required />
      </div>
      {state?.error && <p className="error">{state.error}</p>}
      <Submit pendingText="Opening…">Open the book</Submit>
    </form>
  );
}
