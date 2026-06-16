"use client";

import QRCode from "react-qr-code";
import ScrollReveal from "./ScrollReveal";

export default function EventBlocksRenderer({ blocks }: { blocks: any[] }) {

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">

      {blocks.map((block: any, i: number) => {

        const sizeMap: any = {
          small: "md:col-span-1",
          medium: "md:col-span-2",
          full: "md:col-span-3",
        };

        const colClass = sizeMap[block.size] || "md:col-span-3";

        return (
          <ScrollReveal key={block.id} delay={i * 0.1}>
            <div className={colClass}>

              {block.type === "mot_bureau" && (
                <div className="bg-gray-50 p-16 rounded-3xl shadow-xl">
                  <h2 className="text-4xl font-bold mb-8 text-center">
                    {block.content?.title}
                  </h2>
                  <p className="text-xl text-gray-600 text-center max-w-4xl mx-auto leading-relaxed">
                    {block.content?.text}
                  </p>
                </div>
              )}

              {block.type === "planning" && (
                <div className="bg-white border border-gray-100 p-16 rounded-3xl shadow-lg">
                  <h2 className="text-4xl font-bold mb-12 text-center">
                    Planning
                  </h2>
                  <div className="space-y-8">
                    {block.content?.items?.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between border-b pb-4">
                        <span className="font-bold text-xl">{item.time}</span>
                        <span className="text-lg text-gray-600">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {block.type === "gallery" && (
                <div className="rounded-3xl overflow-hidden">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {block.content?.images?.map((img: string, idx: number) => (
                      <img
                        key={idx}
                        src={img}
                        className="h-72 w-full object-cover hover:scale-105 transition duration-500 rounded-xl"
                      />
                    ))}
                  </div>
                </div>
              )}

              {block.type === "qr_code" && (
                <div className="bg-black text-white p-16 rounded-3xl text-center">
                  <QRCode value={block.content?.url || ""} size={200} />
                  <p className="mt-6 text-gray-400">
                    Scannez pour partager
                  </p>
                </div>
              )}

              {block.type === "inscription" && (
                <div className="text-center">
                  <a
                    href={block.content?.url}
                    target="_blank"
                    className="inline-block px-14 py-6 bg-black text-white text-xl rounded-full hover:bg-gray-800 transition shadow-xl"
                  >
                    {block.content?.label}
                  </a>
                </div>
              )}

            </div>
          </ScrollReveal>
        );
      })}

    </div>
  );
}