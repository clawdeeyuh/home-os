import { cookies } from "next/headers";

const TASKS_BASE = "https://tasks.googleapis.com/tasks/v1";
const QUADRANTS  = ["Production", "Replacement", "Investment", "Delegation"];

async function fetchTaskLists(token) {
  const res = await fetch(`${TASKS_BASE}/users/@me/lists`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function getOrCreateListId(token, title, lists) {
  const existing = lists.items?.find((l) => l.title === title);
  if (existing) return existing.id;

  const res = await fetch(`${TASKS_BASE}/users/@me/lists`, {
    method:  "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body:    JSON.stringify({ title }),
  });
  const created = await res.json();
  return created.id;
}

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get("home_os_session");
    if (!raw) return Response.json({ error: "Not authenticated" }, { status: 401 });

    const { accessToken } = JSON.parse(raw.value);
    const { task, quadrant } = await request.json();

    if (!task || !QUADRANTS.includes(quadrant)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const lists  = await fetchTaskLists(accessToken);
    const listId = await getOrCreateListId(accessToken, quadrant, lists);

    const res = await fetch(`${TASKS_BASE}/lists/${listId}/tasks`, {
      method:  "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body:    JSON.stringify({ title: task }),
    });
    const created = await res.json();

    return Response.json({ task: created });
  } catch (err) {
    console.error("[tasks]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
