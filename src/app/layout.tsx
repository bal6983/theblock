import type { ReactNode } from "react";
import Link from "next/link";
import Script from "next/script";
import Image from "next/image";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="el">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <Link className="site-brand" href="/">
              <span className="brand-logo">
                <Image
                  src="/logo.png"
                  alt="theBlockchain logo"
                  width={44}
                  height={44}
                  priority
                  className="brand-logo-img"
                />
              </span>
              <span className="brand-text">theBlockchain 2.0</span>
            </Link>
          </div>
        </header>
        <div className="site-main">
          <div className="container">{children}</div>
        </div>
        <footer className="site-footer">
          <div className="container footer-inner">
            <span>(c) {new Date().getFullYear()} The Blockchain Update</span>
            <span className="footer-line">Black / Gold / White</span>
          </div>
        </footer>
        <Script id="button-hover-glow" strategy="afterInteractive">
          {`(() => {
  const root = document.documentElement;
  const body = document.body;
  let targetX = 50;
  let targetY = 20;
  let currentX = 50;
  let currentY = 20;
  let rafId = 0;

  const setCursorVars = (x, y) => {
    root.style.setProperty("--cursor-x", x + "%");
    root.style.setProperty("--cursor-y", y + "%");
    if (body) {
      body.style.setProperty("--cursor-x", x + "%");
      body.style.setProperty("--cursor-y", y + "%");
    }
  };

  const animate = () => {
    currentX += (targetX - currentX) * 0.08;
    currentY += (targetY - currentY) * 0.08;
    setCursorVars(currentX, currentY);
    if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
      rafId = requestAnimationFrame(animate);
    } else {
      rafId = 0;
    }
  };

  const handleMove = (event) => {
    targetX = (event.clientX / window.innerWidth) * 100;
    targetY = (event.clientY / window.innerHeight) * 100;
    if (!rafId) {
      rafId = requestAnimationFrame(animate);
    }
    const target = event.target instanceof Element
      ? event.target.closest(".button")
      : null;
    if (!target) return;
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    target.style.setProperty("--hover-x", x + "%");
    target.style.setProperty("--hover-y", y + "%");
  };

  document.addEventListener("pointermove", handleMove, { passive: true });
})();`}
        </Script>
      </body>
    </html>
  );
}
