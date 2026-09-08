"use client";

import { useEffect, useRef, useState } from "react";

export function HeroVideo({ src, poster }: { src: string; poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    const start = async () => {
      try {
        await video.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
      }
    };

    if (video.readyState >= 2) start();
    else video.addEventListener("loadeddata", start, { once: true });

    return () => video.removeEventListener("loadeddata", start);
  }, []);

  const playFilm = async () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = true;
    try {
      await video.play();
      setPlaying(true);
    } catch {
      setPlaying(false);
    }
  };

  return (
    <>
      <video
        ref={videoRef}
        className="campaign-hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        poster={poster}
        onPlaying={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        aria-hidden="true"
      >
        <source src={src} type="video/mp4" />
      </video>
      {!playing && (
        <button type="button" className="campaign-video-play" onClick={playFilm}>
          PLAY FILM <span>↗</span>
        </button>
      )}
    </>
  );
}
