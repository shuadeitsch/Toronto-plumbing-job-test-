import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ellison & Co. Job Book",
    short_name: "Job Book",
    start_url: "/",
    display: "standalone",
    background_color: "#f5f2ec",
    theme_color: "#f5f2ec",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
