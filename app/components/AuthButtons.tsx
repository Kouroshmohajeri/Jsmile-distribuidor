"use client";

import Link from "next/link";

import { SignInButton, Show, UserButton } from "@clerk/nextjs";

export default function AuthButtons() {
  return (
    <>
      <Show when="signed-out">
        <SignInButton>
          <button className="bg-[#1b2559] text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition">
            Iniciar sesión
          </button>
        </SignInButton>
      </Show>

      <Show when="signed-in">
        <div className="flex flex-col items-center gap-4">
          <UserButton />

          <Link
            href="/dashboard"
            className="bg-[#1b2559] text-white font-bold px-8 py-3 rounded-xl hover:opacity-90 transition"
          >
            Ir al panel
          </Link>
        </div>
      </Show>
    </>
  );
}
