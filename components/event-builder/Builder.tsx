"use client";

import { useState } from "react";
import { Block } from "./types";
import BlockToolbar from "./BlockToolbar";
import LivePreview from "./LivePreview";

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

export default function Builder({ event, onSave }: any) {
  const [blocks, setBlocks] = useState<Block[]>(
    event.layout_blocks?.blocks || []
  );

  function addBlock(type: any) {
    const newBlock: Block = {
      id: generateId(),
      type,
      content: {}
    };

    setBlocks([...blocks, newBlock]);
  }

  function updateBlock(id: string, content: any) {
    setBlocks(blocks.map(b => b.id === id ? { ...b, content } : b));
  }

  function removeBlock(id: string) {
    setBlocks(blocks.filter(b => b.id !== id));
  }

  async function save() {
    await onSave({ blocks });
    alert("Sauvegardé ✔");
  }

  return (
    <div className="grid grid-cols-[350px_1fr] h-screen">
      <div className="border-r p-6 overflow-y-auto">
        <BlockToolbar addBlock={addBlock} />
        <button
          onClick={save}
          className="mt-6 w-full bg-black text-white py-3 rounded-xl"
        >
          Sauvegarder
        </button>
      </div>

      <div className="overflow-y-auto bg-gray-50">
        <LivePreview
          hero={event.hero_image}
          blocks={blocks}
          updateBlock={updateBlock}
          removeBlock={removeBlock}
        />
      </div>
    </div>
  );
}