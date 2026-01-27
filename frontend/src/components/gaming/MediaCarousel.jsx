import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Volume2, VolumeX, X, Maximize2 } from 'lucide-react';
import Hls from 'hls.js';
import { createPortal } from 'react-dom';

// Convert local cache path to full URL
const toFullUrl = (localPath, fallback) => {
  if (localPath?.startsWith('/cache/')) {
    return localPath;
  }
  return fallback;
};

// HLS Video Player Component with autoplay
function HlsVideoPlayer({ src, poster, onEnded, fullscreen = false }) {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      hlsRef.current = hls;
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
      video.addEventListener('loadedmetadata', () => {
        video.play().catch(() => {});
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [src]);

  const toggleMute = (e) => {
    e.stopPropagation();
    setMuted(!muted);
    if (videoRef.current) {
      videoRef.current.muted = !muted;
    }
  };

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        className={`w-full h-full ${fullscreen ? 'object-contain' : 'object-cover'}`}
        poster={poster}
        muted={muted}
        loop
        playsInline
        onEnded={onEnded}
      />
      <button
        onClick={toggleMute}
        className="absolute bottom-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors z-10"
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>
    </div>
  );
}

// Lightbox Component for fullscreen media viewing
function Lightbox({ media, currentIndex, onClose, onNavigate, toFullUrl }) {
  const currentMedia = media[currentIndex];

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate(currentIndex - 1);
      if (e.key === 'ArrowRight') onNavigate(currentIndex + 1);
    };
    window.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [currentIndex, onClose, onNavigate]);

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors z-10"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-4 text-white/70 text-sm">
        {currentIndex + 1} / {media.length}
      </div>

      {/* Media Content */}
      <div
        className="w-full h-full flex items-center justify-center p-4 md:p-12"
        onClick={(e) => e.stopPropagation()}
      >
        {currentMedia.type === 'image' ? (
          <img
            src={toFullUrl(currentMedia.local_path, currentMedia.path_full)}
            alt={`Screenshot ${currentIndex + 1}`}
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="w-full max-w-5xl aspect-video">
            <HlsVideoPlayer
              src={currentMedia.hls_h264}
              poster={toFullUrl(currentMedia.local_thumbnail, currentMedia.thumbnail)}
              fullscreen
            />
          </div>
        )}
      </div>

      {/* Navigation Arrows */}
      {media.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex - 1); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onNavigate(currentIndex + 1); }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        </>
      )}
    </div>,
    document.body
  );
}

export default function MediaCarousel({ screenshots = [], movies = [] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const touchStartX = useRef(0);

  // Combine media: videos first, then screenshots
  const media = [
    ...movies.map(m => ({ type: 'video', ...m })),
    ...screenshots.map(s => ({ type: 'image', ...s }))
  ];

  if (media.length === 0) return null;

  const currentMedia = media[currentIndex];

  const goTo = (index) => {
    setCurrentIndex((index + media.length) % media.length);
  };

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      goTo(diff > 0 ? currentIndex + 1 : currentIndex - 1);
    }
  };

  return (
    <div className="relative w-full aspect-video bg-zinc-900 rounded-lg overflow-hidden group">
      {/* Media Display */}
      <div
        className="w-full h-full cursor-pointer"
        onClick={() => setLightboxOpen(true)}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {currentMedia.type === 'image' ? (
          <img
            src={toFullUrl(currentMedia.local_path, currentMedia.path_full)}
            alt={`Screenshot ${currentIndex + 1}`}
            className="w-full h-full object-cover"
          />
        ) : (
          <HlsVideoPlayer
            src={currentMedia.hls_h264}
            poster={toFullUrl(currentMedia.local_thumbnail, currentMedia.thumbnail)}
            onEnded={() => goTo(currentIndex + 1)}
          />
        )}
      </div>

      {/* Navigation Arrows */}
      {media.length > 1 && (
        <>
          <button
            onClick={() => goTo(currentIndex - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={() => goTo(currentIndex + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Indicators */}
      {media.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {media.map((m, idx) => (
            <button
              key={idx}
              onClick={() => goTo(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === currentIndex
                  ? 'bg-white w-4'
                  : 'bg-white/50 hover:bg-white/70 w-2'
              }`}
            />
          ))}
        </div>
      )}

      {/* Media Type Badge */}
      {currentMedia.type === 'video' && (
        <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-violet-600 text-white text-xs font-medium">
          Video
        </div>
      )}

      {/* Expand Button */}
      <button
        onClick={() => setLightboxOpen(true)}
        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
      >
        <Maximize2 className="h-4 w-4" />
      </button>

      {/* Lightbox */}
      {lightboxOpen && (
        <Lightbox
          media={media}
          currentIndex={currentIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={goTo}
          toFullUrl={toFullUrl}
        />
      )}
    </div>
  );
}
