import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { dbConnect } from "./mongodb";
import User from "./models/User";

export async function getCurrentUser() {
  const { userId } = await auth();

  if (!userId) {
    return null;
  }

  await dbConnect();

  // First try the permanent Clerk ID relationship.
  let user = await User.findOne({
    clerkId: userId,
  });

  if (user) {
    return user;
  }

  // If this is an existing user who was seeded before
  // Clerk was connected, link the accounts by email once.
  const clerkUser = await currentUser();

  if (!clerkUser) {
    return null;
  }

  const email = clerkUser.emailAddresses[0]?.emailAddress?.toLowerCase();

  if (!email) {
    return null;
  }

  user = await User.findOne({
    email,
  });

  if (!user) {
    return null;
  }

  // Don't allow one MongoDB user to be linked to
  // a different Clerk account accidentally.
  if (user.clerkId && user.clerkId !== userId) {
    return null;
  }

  user.clerkId = userId;
  await user.save();

  return user;
}

export async function requireUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/sign-in");
  }

  if (!user.active) {
    redirect("/access-denied");
  }

  return user;
}

export async function requireAdmin() {
  const user = await requireUser();

  if (user.role !== "admin") {
    redirect("/dashboard");
  }

  return user;
}
