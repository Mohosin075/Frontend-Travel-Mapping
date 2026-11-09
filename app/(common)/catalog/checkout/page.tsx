import { Suspense } from "react";
import MapCheckout from "@/components/Common/maps/map-checkout";

export default function CheckoutPage() {
  return <Suspense fallback={<p className="p-10 text-center">Loading…</p>}><MapCheckout /></Suspense>;
}
