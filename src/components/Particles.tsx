"use client";

import { useEffect, useRef, useCallback } from "react";
import { useTheme } from "./ThemeProvider";

interface Particle {
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  char?: string;
}

const KANJI_CHARS = ["鍛", "力", "魂", "道", "気", "心", "武", "志"];

export function Particles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const { theme } = useTheme();

  const createParticle = useCallback(
    (width: number, height: number, isDark: boolean): Particle => {
      if (isDark) {
        return {
          x: Math.random() * width,
          y: height + 20,
          size: 14 + Math.random() * 10,
          speedX: (Math.random() - 0.5) * 0.3,
          speedY: -(0.2 + Math.random() * 0.4),
          rotation: 0,
          rotationSpeed: 0,
          opacity: 0.04 + Math.random() * 0.06,
          char: KANJI_CHARS[Math.floor(Math.random() * KANJI_CHARS.length)],
        };
      }
      // Cherry blossom petal
      return {
        x: Math.random() * width,
        y: -10,
        size: 6 + Math.random() * 8,
        speedX: 0.3 + Math.random() * 0.5,
        speedY: 0.5 + Math.random() * 1,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        opacity: 0.15 + Math.random() * 0.2,
      };
    },
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const isDark = theme === "dark";

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize particles
    particlesRef.current = [];
    const maxParticles = isDark ? 8 : 15;

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Add new particles
      if (particlesRef.current.length < maxParticles && Math.random() < 0.02) {
        particlesRef.current.push(
          createParticle(canvas.width, canvas.height, isDark),
        );
      }

      particlesRef.current = particlesRef.current.filter((p) => {
        p.x += p.speedX;
        p.y += p.speedY;
        p.rotation += p.rotationSpeed;

        if (isDark) {
          // Floating kanji
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.font = `${p.size}px 'Noto Sans JP'`;
          ctx.fillStyle = `rgba(255, 107, 157, ${p.opacity})`;
          ctx.textAlign = "center";
          ctx.fillText(p.char || "鍛", 0, 0);
          ctx.restore();
          return p.y > -30;
        } else {
          // Cherry blossom petal
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.globalAlpha = p.opacity;
          ctx.fillStyle = "#FFB7C5";
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#FF9EB5";
          ctx.beginPath();
          ctx.ellipse(
            p.size * 0.2,
            0,
            p.size * 0.5,
            p.size * 0.3,
            0.4,
            0,
            Math.PI * 2,
          );
          ctx.fill();
          ctx.restore();

          // Gentle wave motion
          p.speedX += Math.sin(p.y * 0.01) * 0.005;

          return p.y < canvas.height + 20 && p.x < canvas.width + 20;
        }
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [theme, createParticle]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.8 }}
    />
  );
}
