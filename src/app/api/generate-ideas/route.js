import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request) {
  try {
    const { type, cat } = await request.json();

    const prompt =
      type === "us"
        ? `Return ONLY a JSON array of 4 strings, each under 15 words. Specific ideas for a work-from-home entrepreneur mom to invest in her partnership this week. Ideas can be solo initiatives she takes on her own (e.g. tackling a home area that's been procrastinated, quietly handling something he'd notice, planning something for them) OR things they do together — whatever fits the category. The investment is in the act of initiating, not just co-doing. Category: ${cat || "any"}. No markdown, no preamble. Just the array.`
        : `Return ONLY a JSON array of 4 strings, each under 15 words. Specific ideas for a mom to create a memory with her 12-year-old twin boys this week. Category: ${cat || "any"}. Realistic, age-appropriate. No markdown, no preamble. Just the array.`;

    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = msg.content[0].text.replace(/```json|```/g, "").trim();
    const ideas = JSON.parse(raw);

    return Response.json({ ideas });
  } catch (err) {
    console.error("[generate-ideas]", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
