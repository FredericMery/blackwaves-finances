import { useEffect, useState } from "react";

export function usePhotoThumbs(photoId: string) {
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);

  async function load() {
    const res = await fetch(`/api/photos/thumbs?photo_id=${photoId}`);
    const data = await res.json();
    setLikes(data.likes);
    setDislikes(data.dislikes);
  }

  async function vote(type: "like" | "dislike") {
    await fetch("/api/photos/thumbs/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ photo_id: photoId, vote: type })
    });
    load();
  }

  useEffect(() => {
    load();
  }, [photoId]);

  return { likes, dislikes, vote };
}
