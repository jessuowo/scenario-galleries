(() => {
  function clamp(value, min, max) {
    return Math.min(
      max,
      Math.max(min, value)
    );
  }

  function getMetrics(
    image,
    container,
    zoom = 1
  ) {
    if (
      !image ||
      !container ||
      !image.naturalWidth ||
      !image.naturalHeight
    ) {
      return null;
    }

    const frameWidth =
      container.clientWidth;

    const frameHeight =
      container.clientHeight;

    if (
      frameWidth <= 0 ||
      frameHeight <= 0
    ) {
      return null;
    }

    const safeZoom =
      clamp(
        Number(zoom) || 1,
        1,
        3
      );

    // Scale required to cover the
    // entire frame at 100% zoom.
    const baseScale =
      Math.max(
        frameWidth /
          image.naturalWidth,

        frameHeight /
          image.naturalHeight
      );

    const finalScale =
      baseScale * safeZoom;

    const renderedWidth =
      image.naturalWidth *
      finalScale;

    const renderedHeight =
      image.naturalHeight *
      finalScale;

    return {
      renderedWidth,
      renderedHeight,

      overflowX:
        Math.max(
          0,
          renderedWidth -
            frameWidth
        ),

      overflowY:
        Math.max(
          0,
          renderedHeight -
            frameHeight
        ),
    };
  }

  function render(
    image,
    container
  ) {
    const cropX =
      clamp(
        Number(
          image.dataset.frameCropX
        ) || 0,
        0,
        100
      );

    const cropY =
      clamp(
        Number(
          image.dataset.frameCropY
        ) || 0,
        0,
        100
      );

    const zoom =
      clamp(
        Number(
          image.dataset.frameZoom
        ) || 1,
        1,
        3
      );

    const metrics =
      getMetrics(
        image,
        container,
        zoom
      );

    if (!metrics) {
      return;
    }

    /*
      0%   = align to left/top
      50%  = centered
      100% = align to right/bottom
    */

    const left =
      -metrics.overflowX *
      (cropX / 100);

    const top =
      -metrics.overflowY *
      (cropY / 100);

    image.style.position =
      "absolute";

    image.style.width =
      `${metrics.renderedWidth}px`;

    image.style.height =
      `${metrics.renderedHeight}px`;

    image.style.left =
      `${left}px`;

    image.style.top =
      `${top}px`;

    image.style.maxWidth =
      "none";

    image.style.maxHeight =
      "none";

    image.style.objectFit =
      "fill";

    image.style.objectPosition =
      "50% 50%";

    image.style.transform =
      "none";

    image.style.transformOrigin =
      "50% 50%";
  }

  function apply(
    image,
    container,
    cropX = 50,
    cropY = 50,
    zoom = 1
  ) {
    if (
      !image ||
      !container
    ) {
      return;
    }

    image.dataset.frameCropX =
      String(
        clamp(
          Number(cropX) || 0,
          0,
          100
        )
      );

    image.dataset.frameCropY =
      String(
        clamp(
          Number(cropY) || 0,
          0,
          100
        )
      );

    image.dataset.frameZoom =
      String(
        clamp(
          Number(zoom) || 1,
          1,
          3
        )
      );

    if (
      !image.complete ||
      !image.naturalWidth
    ) {
      if (
        image.dataset
          .coverFrameLoadBound !==
        "true"
      ) {
        image.dataset
          .coverFrameLoadBound =
          "true";

        image.addEventListener(
          "load",
          () => {
            delete image.dataset
              .coverFrameLoadBound;

            render(
              image,
              container
            );
          },
          {
            once: true,
          }
        );
      }

      return;
    }

    render(
      image,
      container
    );
  }

  function reapply(
    image,
    container
  ) {
    if (!image) {
      return;
    }

    apply(
      image,
      container,
      Number(
        image.dataset.frameCropX
      ),
      Number(
        image.dataset.frameCropY
      ),
      Number(
        image.dataset.frameZoom
      )
    );
  }

  window.CoverFrame = {
    apply,
    reapply,
    getMetrics,
  };
})();