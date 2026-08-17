function isAuthorized(request, env) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader || !env.ADMIN_TOKEN) {
    return false;
  }

  return authHeader === `Bearer ${env.ADMIN_TOKEN}`;
}

function safeSegment(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function safeFilename(filename) {
  const lastDot = filename.lastIndexOf(".");

  const extension =
    lastDot >= 0
      ? filename.slice(lastDot).toLowerCase()
      : "";

  const base =
    lastDot >= 0
      ? filename.slice(0, lastDot)
      : filename;

  const cleanBase = safeSegment(base) || "image";

  return `${cleanBase}${extension}`;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Read-only R2 test
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

    // Admin authentication test
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

    // Upload image to R2
    if (
      url.pathname === "/api/admin/upload" &&
      request.method === "POST"
    ) {
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

      try {
        const formData = await request.formData();

        const file = formData.get("file");
        const scenario = safeSegment(
          formData.get("scenario")
        );
        const gallery = safeSegment(
          formData.get("gallery")
        );

        if (!(file instanceof File)) {
          return Response.json(
            {
              success: false,
              message: "No image file was provided.",
            },
            {
              status: 400,
            }
          );
        }

        if (!scenario || !gallery) {
          return Response.json(
            {
              success: false,
              message:
                "Scenario and gallery are required.",
            },
            {
              status: 400,
            }
          );
        }

        if (!file.type.startsWith("image/")) {
          return Response.json(
            {
              success: false,
              message:
                "Only image files can be uploaded.",
            },
            {
              status: 400,
            }
          );
        }

        const maxSize =
          20 * 1024 * 1024;

        if (file.size > maxSize) {
          return Response.json(
            {
              success: false,
              message:
                "Image must be smaller than 20 MB.",
            },
            {
              status: 400,
            }
          );
        }

        const filename =
          safeFilename(file.name);

        const uniqueId =
          crypto.randomUUID();

        const key =
          `${scenario}/${gallery}/${uniqueId}-${filename}`;

        const object =
          await env.GALLERY_IMAGES.put(
            key,
            file.stream(),
            {
              httpMetadata: {
                contentType:
                  file.type ||
                  "application/octet-stream",
              },
              customMetadata: {
                originalName: file.name,
                scenario,
                gallery,
              },
            }
          );

        return Response.json({
          success: true,
          message: "Image uploaded successfully.",
          image: {
            key: object.key,
            size: object.size,
            originalName: file.name,
            scenario,
            gallery,
          },
        });
      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            message: "Upload failed.",
          },
          {
            status: 500,
          }
        );
      }
    }

    // Delete image from R2
    if (
      url.pathname === "/api/admin/delete" &&
      request.method === "DELETE"
    ) {
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

      try {
        const body = await request.json();
        const key = body?.key;

        if (
          typeof key !== "string" ||
          key.trim() === ""
        ) {
          return Response.json(
            {
              success: false,
              message: "Image key is required.",
            },
            {
              status: 400,
            }
          );
        }

        await env.GALLERY_IMAGES.delete(key);

        return Response.json({
          success: true,
          message: "Image deleted successfully.",
          key,
        });
      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            message: "Delete failed.",
          },
          {
            status: 500,
          }
        );
      }
    }

    return env.ASSETS.fetch(request);
  },
};