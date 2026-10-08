"use client";

import { useEffect, useState } from "react";

/**
 * Bottom inset (px) occupied by the on-screen keyboard, via visualViewport.
 * 0 when the keyboard is closed or the API is unavailable.
 */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      // Ignore tiny jitter from the URL bar collapsing.
      setInset(covered > 48 ? Math.round(covered) : 0);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return inset;
}
