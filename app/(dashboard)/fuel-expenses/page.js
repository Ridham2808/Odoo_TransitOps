// app/(dashboard)/fuel-expenses/page.js
import FuelExpensesClient from "./FuelExpensesClient";

export const metadata = {
  title: "Operational Costs & Expenses",
};

export default function FuelExpensesPage() {
  return <FuelExpensesClient />;
}
