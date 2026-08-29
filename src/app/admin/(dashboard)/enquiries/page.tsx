import { redirect } from "next/navigation";

/** Website enquiries and CRM leads are the same records; /admin/leads owns them. */
export default function EnquiriesPage() {
  redirect("/admin/leads");
}
