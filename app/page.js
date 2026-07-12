// app/page.js — root redirect to /dashboard
import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/dashboard");
}
