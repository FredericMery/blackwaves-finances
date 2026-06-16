"use client";

export default function TextBlock({ block, updateBlock, removeBlock }: any) {
  const content = block.content?.text || "";

  return (
    <div className="bg-white p-8 rounded-2xl shadow relative">
      <button
        onClick={() => removeBlock(block.id)}
        className="absolute top-4 right-4 text-red-500"
      >
        ✕
      </button>

      <textarea
        value={content}
        onChange={(e) =>
          updateBlock(block.id, { text: e.target.value })
        }
        placeholder="Votre texte..."
        className="w-full text-lg border-none outline-none resize-none"
      />
    </div>
  );
}