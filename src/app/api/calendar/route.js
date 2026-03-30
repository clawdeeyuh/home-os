import { auth } from "@/lib/auth";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const now = new Date();
    const dow = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const params = new URLSearchParams({
      timeMin: monday.toISOString(),
      timeMax: sunday.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "50",
    });

    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
      { headers: { Authorization: `Bearer ${session.accessToken}` } }
    );

    const data = await res.json();

    if (!res.ok) {
      return Response.json(
        { error: data.error?.message || "Calendar error" },
        { status: res.status }
      );
    }

    return Response.json({ events: data.items || [] });
  } catch (err) {
    console.error("[calendar]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
