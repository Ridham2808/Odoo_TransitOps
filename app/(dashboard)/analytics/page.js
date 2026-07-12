// app/(dashboard)/analytics/page.js
import AnalyticsClient from "./AnalyticsClient";

export const metadata = {
  title: "Reports & Analytics",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}
