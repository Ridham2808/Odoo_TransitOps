// app/(dashboard)/fleet/page.js
import FleetClient from "./FleetClient";

export const metadata = {
  title: "Fleet Registry",
};

export default function FleetPage() {
  return <FleetClient />;
}
