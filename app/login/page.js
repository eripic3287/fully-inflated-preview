"use client";

import { useState } from "react";
import Link from "next/link";
import { login } from "@/app/auth/actions";
import { authStyles as s } from "@/components/authStyles";

export default function LoginPage() {
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await login(new FormData(e.currentTarget));
    if (result?.error) {
      setError(result.error);
      setPending(false);
    }
  }

  return (
    <div style={s.page}>
      <form style={s.card} onSubmit={handleSubmit}>
        <h1 style={s.title}>Log in to Fully Inflated</h1>
        <label style={s.label}>
          Email
          <input style={s.input} type="email" name="email" required autoComplete="email" />
        </label>
        <label style={s.label}>
          Password
          <input style={s.input} type="password" name="password" required autoComplete="current-password" />
        </label>
        {error && <div style={s.error}>{error}</div>}
        <button style={s.button} type="submit" disabled={pending}>
          {pending ? "Logging in…" : "Log in"}
        </button>
        <div style={s.footer}>
          Don't have an account? <Link href="/signup" style={s.link}>Sign up</Link>
        </div>
      </form>
    </div>
  );
}
