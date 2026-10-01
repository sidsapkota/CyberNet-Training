import { PageLoading } from "@/components/nav/PageLoading";

/** The leagues page's shape while it loads. */
export default function Loading() {
  return <PageLoading name="leagues" heading="Leagues" width="max-w-page" panels={2} />;
}
