// app/(dashboard)/drivers/page.js
import DriversClient from "./DriversClient";

export const metadata = {
  title: "Drivers & Safety Profiles",
};

export default function DriversPage() {
  return <DriversClient />;
}
