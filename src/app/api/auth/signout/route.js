import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  cookieStore.delete("home_os_session");
  return Response.redirect(process.env.AUTH_URL || "http://localhost:3000");
}
