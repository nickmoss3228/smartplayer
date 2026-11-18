import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyMeta, resolveMeta, storyMeta } from "./meta";
import { fetchPublishedStoriesList, type PublishedStoryListItem } from "../services/storyServices";

// One list request per difficulty for the whole session.
const lists = new Map<string, Promise<PublishedStoryListItem[]>>();

const loadList = (difficulty: string) => {
  let p = lists.get(difficulty);
  if (!p) {
    p = fetchPublishedStoriesList(difficulty).then((r) => r.stories);
    lists.set(difficulty, p);
  }
  return p;
};

// Renders nothing; keeps <head> (title, description, canonical, og:*) in step
// with the route. Mounted before <Routes> so pages that set their own title
// still run their effects after this one and win.
const RouteMeta = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    applyMeta(resolveMeta(pathname));

    const seg = pathname.replace(/\/+$/, "").split("/").filter(Boolean);
    if (seg[0] !== "levels" || (seg.length !== 3 && seg.length !== 4)) return;
    const [, difficulty, storyId] = seg;

    let current = true;
    const run = async () => {
      try {
        const stories = await loadList(difficulty);
        if (!current) return;
        const s = stories.find((x) => x.storyId === storyId);
        if (!s) return;
        applyMeta(
          storyMeta(pathname, {
            title: s.localized?.title?.ru || s.storyName,
            description: s.localized?.description?.ru || s.description,
            coverUrl: s.coverUrl,
          })
        );
      } catch {
        // meta stays generic
      }
    };
    void run();
    return () => {
      current = false;
    };
  }, [pathname]);

  return null;
};

export default RouteMeta;
