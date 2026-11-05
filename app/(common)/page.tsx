import { connection } from "next/server";
import HomePage from "@/components/Common/landing-page/home-page";

export default async function Page() {
  // Render request-time search params (including checkout) into the initial HTML.
  await connection();
  return <HomePage />;
}
