"use client";

import Header from "./Header";

export default function LayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <div className="pt-20">
        {children}
      </div>
    </>
  );
}
