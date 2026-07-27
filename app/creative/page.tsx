import { redirect } from "next/navigation";

/** Legacy agency URL → public press kit. */
export default function CreativeRedirectPage() {
  redirect("/press");
}
