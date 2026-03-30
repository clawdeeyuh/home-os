export async function GET() {
  const params = new URLSearchParams({
    client_id:     process.env.GOOGLE_CLIENT_ID,
    redirect_uri:  `${process.env.AUTH_URL}/api/auth/callback/google`,
    response_type: "code",
    scope: [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/tasks",
    ].join(" "),
    access_type: "offline",
    prompt:      "consent",
  });

  return Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  );
}
