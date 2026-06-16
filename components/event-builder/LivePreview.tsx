"use client";

import GalleryBlock from "./blocks/GalleryBlock";
import TextBlock from "./blocks/TextBlock";

export default function LivePreview({
  hero,
  blocks,
  updateBlock,
  removeBlock
}: any) {
  return (
    <div>
      {hero && (
        <div
          className="h-72 bg-cover bg-center"
          style={{ backgroundImage: `url(${hero})` }}
        />
      )}

      <div className="p-12 space-y-16 max-w-5xl mx-auto">
        {blocks.map((block: any) => {
          switch (block.type) {
            case "gallery":
              return (
                <GalleryBlock
                  key={block.id}
                  block={block}
                  updateBlock={updateBlock}
                />
              );

            case "text":
              return (
                <TextBlock
                  key={block.id}
                  block={block}
                  updateBlock={updateBlock}
                  removeBlock={removeBlock}
                />
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}