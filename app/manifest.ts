import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Black Waves Cheerleading",
    short_name: "Black Waves",
    description:
      "Site officiel du club Black Waves Cheerleading : équipes, compétitions, informations parents et gestion du club.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0f1c3f",
    icons: [
      {
        src: "/blackwaves-logo.png",
        sizes: "558x560",
        type: "image/png",
      },
    ],
  };
}
