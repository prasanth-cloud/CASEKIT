import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CaseKit",
    short_name: "CaseKit",
    description: "Evidence workspace for purchase complaint and refund preparation.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f7f5",
    theme_color: "#345b4b",
  };
}
