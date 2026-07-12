// app/(dashboard)/maintenance/page.js
import MaintenanceClient from "./MaintenanceClient";

export const metadata = {
  title: "Vehicle Maintenance",
};

export default function MaintenancePage() {
  return <MaintenanceClient />;
}
