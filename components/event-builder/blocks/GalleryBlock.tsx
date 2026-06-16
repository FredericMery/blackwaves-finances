"use client";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function GalleryBlock({ block, updateBlock }: any) {
  const images = block.content?.images || [];

  async function upload(e: any) {
    const file = e.target.files[0];
    const name = Date.now() + "-" + file.name;

    await supabase.storage.from("events").upload(name, file);

    const { data } = supabase.storage.from("events").getPublicUrl(name);

    updateBlock(block.id, {
      images: [...images, data.publicUrl]
    });
  }

  return (
    <div className="bg-white p-8 rounded-2xl shadow">
      <input type="file" onChange={upload} />

      <div className="grid grid-cols-3 gap-4 mt-4">
        {images.map((img: string) => (
          <img key={img} src={img} className="rounded-xl" />
        ))}
      </div>
    </div>
  );
}