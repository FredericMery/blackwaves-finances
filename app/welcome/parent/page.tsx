"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function WelcomeParentRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.push("/adherent");
  }, [router]);

  return null;
}
