function createImages({
  folder,
  prefix,
  count,
  alt,
  extension = "png",
}) {
  return Array.from({ length: count }, (_, index) => {
    const number = String(index + 1).padStart(2, "0");

    return {
      src: `/images/${folder}/${prefix}-${number}.${extension}`,
      alt,
    };
  });
}

export const scenarios = [
  {
    title: "Max the Roommate that Hates You V2",
    slug: "max-roommate",

    description:
      "Character artwork, locations, and visual references from the scenario.",

    // Temporary cover — we can replace this later
    cover: "/images/max-roommate/max/max-01.png",

    // Paste the real FictionLab scenario URL here later
    fictionLabUrl: "https://fictionlab.ai/?scenario=019fc4e3-cabb-7779-894e-592f5c74e967",

    galleries: [
      {
        title: "Max Thorne",
        slug: "max",
        type: "Character Gallery",

        description:
          "Character artwork for Maxwell “Max” Thorne.",

        cover: "/images/max-roommate/max/max-01.png",

        rating: "sfw",

        images: createImages({
          folder: "max-roommate/max",
          prefix: "max",
          count: 3,
          alt: "Max Thorne",
        }),
      },

      {
        title: 'Jasper "Jazz" Callahan',
        slug: "jazz",
        type: "Character Gallery",

        description:
          'Character artwork for Jasper "Jazz" Callahan.',

        cover: "",
        rating: "sfw",
        images: [],
      },

      {
        title: "Ethan Parker",
        slug: "ethan",
        type: "Character Gallery",

        description:
          "Character artwork for Ethan Parker.",

        cover: "",
        rating: "sfw",
        images: [],
      },

      {
        title: "Jason Rivers",
        slug: "jason",
        type: "Character Gallery",

        description:
          "Character artwork for Jason Rivers.",

        cover: "",
        rating: "sfw",
        images: [],
      },

      {
        title: "Brianna “Bree” Carter",
        slug: "bree",
        type: "Character Gallery",

        description:
          "Character artwork for Brianna “Bree” Carter.",

        cover: "",
        rating: "sfw",
        images: [],
      },

      {
        title: "Locations",
        slug: "locations",
        type: "World Gallery",

        description:
          "Locations, interiors, and visual references from the scenario.",

        cover: "",
        rating: "sfw",
        images: [],
      },

      {
        title: "Story Moments",
        slug: "story-moments",
        type: "Scene Gallery",

        description:
          "Illustrated scenes and memorable items from the scenario.",

        cover: "",
        rating: "sfw",
        images: [],
      },
    ],
  },

  {
    title: "Torn Between Two",

    slug: "torn-between-two",

    description:
      "Character artwork, locations, and visual references from the scenario.",

    // Temporary fallback until you upload
    // a dedicated scenario cover through /admin.
    cover: "/images/site/mascot-cat.png",

    fictionLabUrl: "",

    galleries: [
      {
        title: "Theo Wilder",

        slug: "theo-wilder",

        type: "Character Gallery",

        description:
          "Character artwork for Theo Wilder.",

        rating: "sfw",

        images: [],
      },

      {
        title: "Kai Wilder",

        slug: "kai-wilder",

        type: "Character Gallery",

        description:
          "Character artwork for Kai Wilder.",

        rating: "sfw",

        images: [],
      },

      {
        title: "Locations",

        slug: "locations",

        type: "Locations Gallery",

        description:
          "Locations, interiors, and visual references from the scenario.",

        rating: "sfw",

        images: [],
      },

      {
        title: "Story Moments",

        slug: "story-moments",

        type: "Story Gallery",

        description:
          "Illustrated scenes and memorable items from the scenario.",

        rating: "sfw",

        images: [],
      },
    ],
  },
];