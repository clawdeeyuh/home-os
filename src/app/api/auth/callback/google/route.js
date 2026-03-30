import { cookies } from "next/headers";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code  = searchParams.get("code");
  const error = searchParams.get("error");
  const base  = process.env.AUTH_URL || "http://localhost:3000";

  if (error || !code) {
    return Response.redirect(`${base}/?auth_error=access_denied`);
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri:  `${base}/api/auth/callback/google`,
      grant_type:    "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();

  if (!tokenRes.ok) {
    console.error("[auth/callback]", tokens);
    return Response.redirect(`${base}/?auth_error=token_failed`);
  }

  // Get user info
  const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  const user = await userRes.json();

  // Store session in httpOnly cookie
  const cookieStore = await cookies();
  cookieStore.set("home_os_session", JSON.stringify({
    accessToken: tokens.access_token,
    email:       user.email,
    name:        user.name,
  }), {
    httpOnly: true,
    secure:   process.env.NODE_ENV === "production",
    maxAge:   60 * 60, // 1 hour
    path:     "/",
    sameSite: "lax",
  });

  return Response.redirect(base);
}
