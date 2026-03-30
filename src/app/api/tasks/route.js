import { auth } from "@/lib/auth";

const TASKS_BASE = "https://tasks.googleapis.com/tasks/v1";
const QUADRANTS = ["Production", "Replacement", "Investment", "Delegation"];

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
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });
  const created = await res.json();
  return created.id;
}

export async function POST(request) {
  try {
    const session = await auth();
    if (!session?.accessToken) {
      return Response.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { task, quadrant } = await request.json();
    if (!task || !QUADRANTS.includes(quadrant)) {
      return Response.json({ error: "Invalid request" }, { status: 400 });
    }

    const lists = await fetchTaskLists(session.accessToken);
    const listId = await getOrCreateListId(session.accessToken, quadrant, lists);

    const res = await fetch(`${TASKS_BASE}/lists/${listId}/tasks`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: task }),
    });

    const created = await res.json();
    return Response.json({ task: created });
  } catch (err) {
    console.error("[tasks]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
