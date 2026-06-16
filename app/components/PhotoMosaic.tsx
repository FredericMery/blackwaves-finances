"use client";

import Image from "next/image";
import { useMemo } from "react";

function random(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

export default function PhotoMosaic() {
  // 5 photos
  const images = [
    { src: "/pelemele/p1.jpg", label: "Compétition" },
    { src: "/pelemele/p2.jpg", label: "Entraînement" },
    { src: "/pelemele/p3.jpg", label: "Team Spirit" },
    { src: "/pelemele/p4.jpg", label: "Stunt" },
    { src: "/pelemele/p5.jpg", label: "Black Waves" },
  ];

  // 5 slots en LIGNE, bien espacés pour limiter les chevauchements
  const slots = [
    { top: "8%", left: "0%", z: 2 },
    { top: "4%", left: "20%", z: 3 },
    { top: "10%", left: "40%", z: 4 },
    { top: "6%", left: "60%", z: 3 },
    { top: "12%", left: "80%", z: 2 },
  ];

  // On calcule une fois la position & orientation aléatoires
  const cards = useMemo(() => {
    return images.map((img, index) => {
      const slot = slots[index];

      return {
        ...img,
        slot,
        rotate: random(-6, 6),           // légère rotation
        scale: random(0.97, 1.05),       // taille quasi identique
        offsetX: random(-3, 3),          // max ±3% pour limiter les chevauchements
        offsetY: random(-3, 3),
      };
    });
  }, []);

  return (
    <div className="relative w-full max-w-xl aspect-[5/2]">
      {cards.map((card, index) => (
        <div
          key={index}
          style={{
            position: "absolute",
            top: `calc(${card.slot.top} + ${card.offsetY}%)`,
            left: `calc(${card.slot.left} + ${card.offsetX}%)`,
            transform: `rotate(${card.rotate}deg) scale(${card.scale})`,
            zIndex: card.slot.z,
          }}
          className="group transition-transform duration-300"
        >
          <div
            className="
              relative
              w-28 h-32 md:w-32 md:h-36
              bg-white rounded-xl border border-black/10
              shadow-lg shadow-black/30
              p-2
              flex flex-col
              transition-all duration-300
              group-hover:-translate-y-2 group-hover:shadow-2xl
            "
          >
            {/* Photo */}
            <div className="relative flex-1 w-full overflow-hidden rounded-md bg-neutral-200">
              <Image
                src={card.src}
                alt={card.label}
                fill
                className="object-cover"
              />
            </div>

            {/* Bandeau polaroïd écrit */}
            <div className="mt-1 text-[10px] text-neutral-800 text-center italic">
              {card.label}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
