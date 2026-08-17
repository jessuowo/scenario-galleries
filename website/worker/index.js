function isAuthorized(request, env) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !env.ADMIN_TOKEN) {
    return false;
  }

  return authHeader === `Bearer ${env.ADMIN_TOKEN}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Read-only R2 connection test
    if (url.pathname === "/api/r2-test") {
      try {
        const result = await env.GALLERY_IMAGES.list({
          limit: 1,
        });

        return Response.json({
          success: true,
          message: "R2 connection is working.",
          bucketConnected: true,
          bucketHasImages: result.objects.length > 0,
        });
      } catch {
        return Response.json(
          {
            success: false,
            message: "Could not connect to R2.",
          },
          {
            status: 500,
          }
        );
      }
    }

    // Temporary protected admin test
    if (url.pathname === "/api/admin-test") {
      if (!isAuthorized(request, env)) {
        return Response.json(
          {
            success: false,
            message: "Unauthorized.",
          },
          {
            status: 401,
          }
        );
      }

      return Response.json({
        success: true,
        message: "Admin authentication is working.",
      });
    }

    return env.ASSETS.fetch(request);
  },
};