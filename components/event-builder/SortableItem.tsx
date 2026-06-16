"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SortableItem({
  block,
  blocks,
  setBlocks,
  deleteBlock
}: any) {

  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  };

  function updateContent(newContent: any) {
    setBlocks(blocks.map((b: any) =>
      b.id === block.id
        ? { ...b, content: { ...b.content, ...newContent } }
        : b
    ));
  }

  function addPlanningItem() {
    const newItems = [...(block.content.items || []), { time: "", label: "" }];
    updateContent({ items: newItems });
  }

  function updatePlanningItem(index: number, field: string, value: string) {
    const items = [...block.content.items];
    items[index][field] = value;
    updateContent({ items });
  }

  async function uploadImage(e: any) {
    const file = e.target.files[0];
    const filePath = `events/${Date.now()}-${file.name}`;

    await supabase.storage
      .from("photos")
      .upload(filePath, file);

    const { data } = supabase.storage
      .from("photos")
      .getPublicUrl(filePath);

    const images = [...(block.content.images || []), data.publicUrl];
    updateContent({ images });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white p-6 rounded-xl shadow mb-6 border"
    >

      <div className="flex justify-between items-center mb-4">
        <div {...attributes} {...listeners} className="cursor-move">
          ☰
        </div>

        <button
          onClick={() => deleteBlock(block.id)}
          className="text-red-500"
        >
          Supprimer
        </button>
      </div>

      <div className="text-sm text-gray-500 mb-4">
        {block.type}
      </div>

      {/* PLANNING */}
      {block.type === "planning" && (
        <>
          {block.content?.items?.map((item: any, i: number) => (
            <div key={i} className="flex gap-2 mb-2">
              <input
                placeholder="Heure"
                className="border px-2 py-1 w-24"
                value={item.time}
                onChange={(e) =>
                  updatePlanningItem(i, "time", e.target.value)
                }
              />
              <input
                placeholder="Description"
                className="border px-2 py-1 flex-1"
                value={item.label}
                onChange={(e) =>
                  updatePlanningItem(i, "label", e.target.value)
                }
              />
            </div>
          ))}

          <button
            onClick={addPlanningItem}
            className="text-blue-600 mt-2"
          >
            + Ajouter ligne
          </button>
        </>
      )}

      {/* GALERIE */}
      {block.type === "gallery" && (
        <>
          <input type="file" onChange={uploadImage} />
          <div className="grid grid-cols-3 gap-2 mt-4">
            {block.content?.images?.map((img: string, i: number) => (
              <img key={i} src={img} className="h-20 object-cover rounded" />
            ))}
          </div>
        </>
      )}

    </div>
  );
}