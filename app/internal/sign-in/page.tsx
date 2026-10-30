import { redirect } from "next/navigation";

/** Single customer sign-in; operators are routed to `/internal/` after auth. */
export default function InternalSignInPage() {
  redirect("/sign-in/?next=%2Finternal%2F");
}
