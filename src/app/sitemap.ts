import type { MetadataRoute } from "next";
import { getAllLessonIds, getCourses } from "@/lib/content/server";
import { absoluteUrl } from "@/lib/site";

/** Public pages only: never /dev, /account, /auth, /login or /feedback. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/courses", "/privacy", "/terms"];
  const courses = getCourses().map((c) => `/course/${c.id}`);
  const lessons = getAllLessonIds().map((id) => `/lesson/${id}`);
  return [...pages, ...courses, ...lessons].map((path) => ({
    url: absoluteUrl(path),
    changeFrequency: path.startsWith("/lesson/") ? "monthly" : "weekly",
    priority: path === "/" ? 1 : path.startsWith("/course/") ? 0.8 : 0.5,
  }));
}
