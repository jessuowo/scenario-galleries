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

function galleryMetaKey(
  scenario,
  gallery
) {
  return `_gallery-meta/${scenario}/${gallery}.json`;
}

async function getGalleryMeta(
  env,
  scenario,
  gallery
) {
  try {
    const object =
      await env.GALLERY_IMAGES.get(
        galleryMetaKey(
          scenario,
          gallery
        )
      );

    if (!object) {
      return {
        order: [],
        cover: null,
      };
    }

    const data =
      await object.json();

    return {
      order:
        Array.isArray(data?.order)
          ? data.order
          : [],

      cover:
        typeof data?.cover === "string"
          ? data.cover
          : null,
    };
  } catch {
    return {
      order: [],
      cover: null,
    };
  }
}

async function saveGalleryMeta(
  env,
  scenario,
  gallery,
  meta
) {
  await env.GALLERY_IMAGES.put(
    galleryMetaKey(
      scenario,
      gallery
    ),
    JSON.stringify({
      order:
        Array.isArray(meta?.order)
          ? meta.order
          : [],

      cover:
        typeof meta?.cover === "string"
          ? meta.cover
          : null,
    }),
    {
      httpMetadata: {
        contentType:
          "application/json",
      },
    }
  );
}

async function getGalleryOrder(
  env,
  scenario,
  gallery
) {
  const meta =
    await getGalleryMeta(
      env,
      scenario,
      gallery
    );

  return meta.order;
}

function sortByGalleryOrder(
  objects,
  order
) {
  if (!Array.isArray(order) || order.length === 0) {
    return objects;
  }

  const positions =
    new Map(
      order.map((key, index) => [
        key,
        index,
      ])
    );

  return [...objects].sort(
    (a, b) => {
      const aPosition =
        positions.has(a.key)
          ? positions.get(a.key)
          : Number.MAX_SAFE_INTEGER;

      const bPosition =
        positions.has(b.key)
          ? positions.get(b.key)
          : Number.MAX_SAFE_INTEGER;

      return aPosition - bPosition;
    }
  );
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

    // List images in a gallery
    if (
      url.pathname === "/api/admin/images" &&
      request.method === "GET"
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
        const scenario = safeSegment(
          url.searchParams.get("scenario")
        );

        const gallery = safeSegment(
          url.searchParams.get("gallery")
        );

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

        const prefix =
          `${scenario}/${gallery}/`;

        const result =
          await env.GALLERY_IMAGES.list({
            prefix,
            limit: 1000,
            include: [
              "customMetadata",
              "httpMetadata",
            ],
          });

        const galleryMeta =
          await getGalleryMeta(
            env,
            scenario,
            gallery
          );

        const savedOrder =
          galleryMeta.order;

        const orderedObjects =
          sortByGalleryOrder(
            result.objects,
            savedOrder
          );

        const images = orderedObjects.map(
          (object) => ({
            key: object.key,
            size: object.size,
            uploaded: object.uploaded,
            originalName:
              object.customMetadata?.originalName ||
              object.key.split("/").pop(),
          })
        );

        return Response.json({
          success: true,
          scenario,
          gallery,
          cover: galleryMeta.cover,
          images,
        });
      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            message: "Could not list images.",
          },
          {
            status: 500,
          }
        );
      }
    }

    // Public list of images in a gallery
    if (
      url.pathname === "/api/gallery-images" &&
      request.method === "GET"
    ) {
      try {
        const scenario = safeSegment(
          url.searchParams.get("scenario")
        );

        const gallery = safeSegment(
          url.searchParams.get("gallery")
        );

        if (!scenario || !gallery) {
          return Response.json(
            {
              success: false,
              message: "Scenario and gallery are required.",
            },
            {
              status: 400,
            }
          );
        }

        const prefix = `${scenario}/${gallery}/`;

        const result = await env.GALLERY_IMAGES.list({
          prefix,
          limit: 1000,
          include: ["customMetadata", "httpMetadata"],
        });

        const savedOrder =
          await getGalleryOrder(
            env,
            scenario,
            gallery
          );

        const orderedObjects =
          sortByGalleryOrder(
            result.objects,
            savedOrder
          );

        const images = orderedObjects.map((object) => ({
          key: object.key,

          originalName:
            object.customMetadata?.originalName ||
            object.key.split("/").pop(),

          url: `/api/gallery-image?key=${encodeURIComponent(
            object.key
          )}`,
        }));

        return Response.json({
          success: true,
          scenario,
          gallery,
          images,
        });
      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            message: "Could not load gallery images.",
          },
          {
            status: 500,
          }
        );
      }
    }

    // Public R2 image
    if (
      url.pathname === "/api/gallery-image" &&
      request.method === "GET"
    ) {
      try {
        const key =
          url.searchParams.get("key");

        if (!key) {
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

        const object =
          await env.GALLERY_IMAGES.get(key);

        if (!object) {
          return Response.json(
            {
              success: false,
              message: "Image not found.",
            },
            {
              status: 404,
            }
          );
        }

        const headers =
          new Headers();

        object.writeHttpMetadata(headers);

        headers.set(
          "etag",
          object.httpEtag
        );

        headers.set(
          "Cache-Control",
          "public, max-age=31536000, immutable"
        );

        return new Response(
          object.body,
          {
            headers,
          }
        );
      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            message: "Could not load image.",
          },
          {
            status: 500,
          }
        );
      }
    }

    // Public R2 summary for an entire scenario
    if (
      url.pathname === "/api/scenario-summary" &&
      request.method === "GET"
    ) {
      try {
        const scenario = safeSegment(
          url.searchParams.get("scenario")
        );

        if (!scenario) {
          return Response.json(
            {
              success: false,
              message: "Scenario is required.",
            },
            {
              status: 400,
            }
          );
        }

        const prefix = `${scenario}/`;

        let result = await env.GALLERY_IMAGES.list({
          prefix,
          limit: 1000,
        });

        const objects = [...result.objects];

        while (result.truncated) {
          result = await env.GALLERY_IMAGES.list({
            prefix,
            limit: 1000,
            cursor: result.cursor,
          });

          objects.push(...result.objects);
        }

        const galleries = {};

        for (const object of objects) {
          const remainder = object.key.slice(
            prefix.length
          );

          const slashIndex = remainder.indexOf("/");

          if (slashIndex === -1) {
            continue;
          }

          const gallerySlug = remainder.slice(
            0,
            slashIndex
          );

          if (!gallerySlug) {
            continue;
          }

          if (!galleries[gallerySlug]) {
            galleries[gallerySlug] = {
              count: 0,
              cover: null,
            };
          }

          galleries[gallerySlug].count += 1;

          if (!galleries[gallerySlug].cover) {
            galleries[gallerySlug].cover =
              `/api/gallery-image?key=${encodeURIComponent(
                object.key
              )}`;
          }
        }

        await Promise.all(
          Object.keys(galleries).map(
            async (gallerySlug) => {
              const meta =
                await getGalleryMeta(
                  env,
                  scenario,
                  gallerySlug
                );

              if (!meta.cover) {
                return;
              }

              const coverExists =
                objects.some(
                  (object) =>
                    object.key ===
                    meta.cover
                );

              if (!coverExists) {
                return;
              }

              galleries[
                gallerySlug
              ].cover =
                `/api/gallery-image?key=${encodeURIComponent(
                  meta.cover
                )}`;
            }
          )
        );

        return Response.json({
          success: true,
          scenario,
          totalImages: objects.length,
          galleries,
        });
      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            message:
              "Could not load scenario summary.",
          },
          {
            status: 500,
          }
        );
      }
    }

    // Save custom image order
    if (
      url.pathname === "/api/admin/reorder" &&
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
        const body =
          await request.json();

        const scenario =
          safeSegment(body?.scenario);

        const gallery =
          safeSegment(body?.gallery);

        const keys =
          Array.isArray(body?.keys)
            ? body.keys
            : [];

        if (
          !scenario ||
          !gallery
        ) {
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

        const prefix =
          `${scenario}/${gallery}/`;

        const validKeys =
          keys.filter(
            (key) =>
              typeof key === "string" &&
              key.startsWith(prefix)
          );

        if (
          validKeys.length !==
          keys.length
        ) {
          return Response.json(
            {
              success: false,
              message:
                "Invalid image key.",
            },
            {
              status: 400,
            }
          );
        }

        const uniqueKeys =
          [...new Set(validKeys)];

        const currentMeta =
          await getGalleryMeta(
            env,
            scenario,
            gallery
          );

        await saveGalleryMeta(
          env,
          scenario,
          gallery,
          {
            ...currentMeta,
            order: uniqueKeys,
          }
        );

        return Response.json({
          success: true,
          message:
            "Gallery order saved.",
          order: uniqueKeys,
        });
      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            message:
              "Could not save gallery order.",
          },
          {
            status: 500,
          }
        );
      }
    }

    // Set or clear custom gallery cover
    if (
      url.pathname === "/api/admin/cover" &&
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
        const body =
          await request.json();

        const scenario =
          safeSegment(
            body?.scenario
          );

        const gallery =
          safeSegment(
            body?.gallery
          );

        const key =
          body?.key ?? null;

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

        const prefix =
          `${scenario}/${gallery}/`;

        let cover = null;

        if (key !== null) {
          if (
            typeof key !== "string" ||
            !key.startsWith(prefix)
          ) {
            return Response.json(
              {
                success: false,
                message:
                  "Invalid cover image.",
              },
              {
                status: 400,
              }
            );
          }

          const object =
            await env.GALLERY_IMAGES.head(
              key
            );

          if (!object) {
            return Response.json(
              {
                success: false,
                message:
                  "Cover image was not found.",
              },
              {
                status: 404,
              }
            );
          }

          cover = key;
        }

        const currentMeta =
          await getGalleryMeta(
            env,
            scenario,
            gallery
          );

        await saveGalleryMeta(
          env,
          scenario,
          gallery,
          {
            ...currentMeta,
            cover,
          }
        );

        return Response.json({
          success: true,
          message:
            cover
              ? "Gallery cover saved."
              : "Gallery cover cleared.",
          cover,
        });
      } catch (error) {
        console.error(error);

        return Response.json(
          {
            success: false,
            message:
              "Could not save gallery cover.",
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