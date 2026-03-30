import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();
  const raw = cookieStore.get("home_os_session");

  if (!raw) return Response.json({ authenticated: false });

  try {
    const { email, name } = JSON.parse(raw.value);
    return Response.json({ authenticated: true, email, name });
  } catch {
    return Response.json({ authenticated: false });
  }
}
