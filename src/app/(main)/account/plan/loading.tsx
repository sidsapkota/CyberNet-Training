import { PageLoading } from "@/components/nav/PageLoading";

/** Your plan's shape while it loads. */
export default function Loading() {
  return <PageLoading name="account-plan" heading="Your plan" width="max-w-page" panels={1} />;
}
