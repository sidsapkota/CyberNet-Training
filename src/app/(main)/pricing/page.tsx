import { redirect } from "next/navigation";

/** /pricing is the plans page, /pro (the nav's "Pricing" opens it too). */
export default function PricingPage(): never {
  redirect("/pro");
}
