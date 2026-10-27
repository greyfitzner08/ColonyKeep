import type { MetadataRoute } from "next";
import { APP_PUBLIC_URL } from "@/lib/org";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    host: APP_PUBLIC_URL,
  };
}
