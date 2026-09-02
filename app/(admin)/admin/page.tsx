import AdminGate from "@/components/AdminGate";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminDashboard />
    </AdminGate>
  );
}
