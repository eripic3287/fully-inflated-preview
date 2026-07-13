"use client";

import { useState } from "react";
import Link from "next/link";
import { signup } from "@/app/auth/actions";
import { authStyles as s } from "@/components/authStyles";

export default function SignupPage() {
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMessage(null);

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password");
    const confirm = formData.get("confirm");

    if (password !== confirm) {
      setError("Passwords don't match.");
      setPending(false);
      return;
    }

    formData.append("origin", window.location.origin);
    const result = await signup(formData);
    if (result?.error) {
      setError(result.error);
    } else if (result?.message) {
      setMessage(result.message);
    }
    setPending(false);
  }

  return (
    <div style={s.page}>
      <form style={s.card} onSubmit={handleSubmit}>
        <h1 style={s.title}>Create your account</h1>
        <label style={s.label}>
          Email
          <input style={s.input} type="email" name="email" required autoComplete="email" />
        </label>
        <label style={s.label}>
          Password
          <input style={s.input} type="password" name="password" required minLength={6} autoComplete="new-password" />
        </label>
        <label style={s.label}>
          Confirm password
          <input style={s.input} type="password" name="confirm" required minLength={6} autoComplete="new-password" />
        </label>
        {error && <div style={s.error}>{error}</div>}
        {message && <div style={s.success}>{message}</div>}
        <button style={s.button} type="submit" disabled={pending}>
          {pending ? "Creating account…" : "Sign up"}
        </button>
        <div style={s.footer}>
          Already have an account? <Link href="/login" style={s.link}>Log in</Link>
        </div>
      </form>
    </div>
  );
}
