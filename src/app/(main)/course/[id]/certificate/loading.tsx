import { PageLoading } from "@/components/nav/PageLoading";

/** The certificate page's shape while it loads. */
export default function Loading() {
  return <PageLoading name="certificate" heading="Your certificate" panels={2} />;
}
