export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Temporary read-only test endpoint
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
      } catch (error) {
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

    // Everything else continues to use your existing website
    return env.ASSETS.fetch(request);
  },
};