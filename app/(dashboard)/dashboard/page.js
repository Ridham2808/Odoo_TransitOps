// app/(dashboard)/dashboard/page.js
// Dashboard home — KPI overview + quick links

export const metadata = {
  title: "Dashboard",
};

import DashboardHome from "./DashboardHome";

export default function DashboardPage() {
  return <DashboardHome />;
}
