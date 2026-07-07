"use client";

import { Bell, Check, Loader2 } from "lucide-react";
import { useState } from "react";

type SeasonNotifyCtaProps = {
  league: "NBA" | "NHL";
  variant?: "button" | "link";
};

export function SeasonNotifyCta({
  league,
  variant = "button",
}: SeasonNotifyCtaProps) {
  const [expanded, setExpanded] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch("/api/season-notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, league }),
      });

      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        setStatus("error");
        setErrorMessage(
          data?.error ?? "Something went wrong. Please try again.",
        );
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <p className="season-notify-success" role="status">
        <Check className="size-4 shrink-0" aria-hidden />
        You&apos;re on the list; we&apos;ll email you when {league} assignments
        return.
      </p>
    );
  }

  if (!expanded) {
    if (variant === "link") {
      return (
        <button
          type="button"
          className="font-medium text-zinc-800 underline-offset-2 hover:text-raptors hover:underline"
          onClick={() => setExpanded(true)}
        >
          Get notified when the {league} season starts
        </button>
      );
    }

    return (
      <button
        type="button"
        className="btn-secondary inline-flex items-center gap-2"
        onClick={() => setExpanded(true)}
      >
        <Bell className="size-4 shrink-0" aria-hidden />
        Notify me when the season starts
      </button>
    );
  }

  return (
    <form
      className="season-notify-form"
      onSubmit={handleSubmit}
      aria-label={`Email signup for ${league} season alerts`}
    >
      <label className="sr-only" htmlFor={`season-notify-email-${league}`}>
        Email address
      </label>
      <input
        id={`season-notify-email-${league}`}
        type="email"
        name="email"
        autoComplete="email"
        inputMode="email"
        required
        placeholder="you@example.com"
        value={email}
        disabled={status === "loading"}
        className="season-notify-input"
        onChange={(event) => setEmail(event.target.value)}
      />
      <button
        type="submit"
        className="btn-secondary season-notify-submit"
        disabled={status === "loading"}
      >
        {status === "loading" ? (
          <>
            <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          "Notify me"
        )}
      </button>
      {status === "error" && errorMessage ? (
        <p className="season-notify-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
