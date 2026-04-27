"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type RegisterErrors = {
  name?: string;
  email?: string;
  password?: string;
  form?: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<RegisterErrors>({});
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: RegisterErrors = {};
    if (!name.trim()) nextErrors.name = "Name is required.";
    if (!email.trim()) nextErrors.email = "Email is required.";
    if (password.length < 8) nextErrors.password = "Password must be at least 8 characters.";

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      setSubmitting(true);
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrors({ form: data.error || "Unable to create account." });
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClassName =
    "w-full rounded-none border-2 border-black bg-[var(--cream)] px-3 py-2 text-sm text-black outline-none transition focus:shadow-[4px_4px_0px_#0d0d0d]";

  return (
    <main className="min-h-screen bg-[var(--cream)]">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        <section className="flex flex-col justify-between bg-[var(--cream)] p-8 lg:p-12">
          <div className="inline-flex w-fit items-center gap-2 border-2 border-black bg-[var(--yellow)] px-4 py-2 shadow-[4px_4px_0px_#0d0d0d]">
            <span className="text-xl">MS</span>
            <span className="text-lg font-extrabold">Mayhem-Sequence</span>
          </div>
          <div className="max-w-md space-y-4">
            <h1 className="text-4xl font-extrabold text-black lg:text-5xl">Build your team hub.</h1>
            <p className="text-base font-semibold text-black/80">
              Create an account to manage projects, builds, and feedback from one control center.
            </p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.1em] text-black/70">
            Secure authentication with JWT cookies
          </p>
        </section>

        <section className="flex items-center justify-center bg-black p-6 lg:p-12">
          <div className="w-full max-w-md border-2 border-black bg-white p-6 shadow-[8px_8px_0px_#ffe047] lg:p-8">
            <h2 className="text-3xl font-extrabold text-black">Register</h2>
            <p className="mt-1 text-sm font-semibold text-black/70">Create your Mayhem account.</p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
              <div className="space-y-1.5">
                <label htmlFor="name" className="text-sm font-bold text-black">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className={inputClassName}
                  autoComplete="name"
                />
                {errors.name ? (
                  <p className="border-2 border-[var(--coral)] bg-[#fff4ef] px-2 py-1 text-xs font-semibold text-black">
                    {errors.name}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="email" className="text-sm font-bold text-black">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={inputClassName}
                  autoComplete="email"
                />
                {errors.email ? (
                  <p className="border-2 border-[var(--coral)] bg-[#fff4ef] px-2 py-1 text-xs font-semibold text-black">
                    {errors.email}
                  </p>
                ) : null}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="password" className="text-sm font-bold text-black">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={inputClassName}
                  autoComplete="new-password"
                />
                {errors.password ? (
                  <p className="border-2 border-[var(--coral)] bg-[#fff4ef] px-2 py-1 text-xs font-semibold text-black">
                    {errors.password}
                  </p>
                ) : null}
              </div>

              {errors.form ? (
                <p className="border-2 border-[var(--coral)] bg-[#fff4ef] px-2 py-1 text-xs font-semibold text-black">
                  {errors.form}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={submitting}
                className="w-full border-2 border-black bg-[var(--yellow)] px-4 py-2 text-sm font-extrabold uppercase tracking-[0.06em] text-black shadow-[4px_4px_0px_#0d0d0d] transition hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0px_#0d0d0d] disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none"
              >
                {submitting ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-4 text-sm font-semibold text-black/80">
              Already registered?{" "}
              <Link href="/login" className="underline underline-offset-2">
                Login
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
