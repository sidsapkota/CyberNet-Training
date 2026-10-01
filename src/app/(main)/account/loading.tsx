import { PageLoading } from "@/components/nav/PageLoading";

/** /account's shape while it loads, shown the moment the profile icon is tapped. */
export default function Loading() {
  return <PageLoading name="account" heading="Your account" node panels={4} />;
}
