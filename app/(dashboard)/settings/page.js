// app/(dashboard)/settings/page.js
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "System Settings",
};

export default function SettingsPage() {
  return <SettingsClient />;
}
