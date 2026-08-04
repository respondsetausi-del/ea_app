import React, { useEffect, useRef, useState } from 'react';
import { View, Platform } from 'react-native';
import { useTheme } from '@/providers/theme-provider';

const VIDEO_MAP: Record<string, string> = {
  video1: '/videos/bg-1.mp4',
  video2: '/videos/bg-2.mp4',
  video3: '/videos/bg-3.mp4',
  video4: '/videos/bg-4.mp4',
};

interface PageBackgroundProps {
  eaImage?: string | null;
}

export function PageBackground({ eaImage }: PageBackgroundProps) {
  const { theme, glassMode, bgType } = useTheme();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [customVideoUrl, setCustomVideoUrl] = useState<string>('');
  const isNeon = glassMode === 'neon';
  const isLiquid = false;
  const isCmd = false;

  // Listen for custom video upload event (dispatched from settings upload handler)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: any) => {
      const url = e.detail?.url;
      if (url) {
        console.log('PageBackground: received custom video event:', url);
        setCustomVideoUrl(url);
      }
    };
    window.addEventListener('ea_naptune-custom-video', handler);
    return () => window.removeEventListener('ea_naptune-custom-video', handler);
  }, []);

  // Load custom video from memory or IndexedDB when bgType is 'custom'
  useEffect(() => {
    if (Platform.OS !== 'web' || bgType !== 'custom') return;
    const memUrl = (window as any).__ea_naptune_custom_video_url;
    if (memUrl) { console.log('PageBackground: video from memory'); setCustomVideoUrl(memUrl); return; }
    console.log('PageBackground: loading from IndexedDB...');
    try {
      const req = indexedDB.open('ea_naptune_videos', 2);
      req.onupgradeneeded = (ev: any) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains('videos')) db.createObjectStore('videos');
      };
      req.onsuccess = (ev: any) => {
        try {
          const db = ev.target.result;
          if (!db.objectStoreNames.contains('videos')) { console.log('PageBackground: no videos store'); return; }
          const tx = db.transaction('videos', 'readonly');
          const get = tx.objectStore('videos').get('custom_bg');
          get.onsuccess = () => {
            if (get.result) {
              console.log('PageBackground: loaded from IndexedDB');
              const url = URL.createObjectURL(get.result);
              (window as any).__ea_naptune_custom_video_url = url;
              setCustomVideoUrl(url);
            } else { console.log('PageBackground: nothing in IndexedDB'); }
          };
        } catch (err) { console.log('PageBackground: read error:', err); }
      };
      req.onerror = () => console.log('PageBackground: open error');
    } catch (err) { console.log('PageBackground: init error:', err); }
  }, [bgType]);

  // Manage video playback + fix freeze/loop
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const isVideo = bgType === 'video1' || bgType === 'video2' || bgType === 'video3' || bgType === 'video4' || (bgType === 'custom' && customVideoUrl);
    if (!isVideo) return;
    const setup = () => {
      const el = document.getElementById('ea_naptune-bg-video') as HTMLVideoElement;
      if (!el) return;
      videoRef.current = el;
      el.muted = true; el.loop = true; el.playsInline = true;
      el.setAttribute('playsinline', ''); el.setAttribute('webkit-playsinline', '');
      const onEnded = () => { el.currentTime = 0; el.play().catch(() => {}); };
      const onPause = () => { if (document.visibilityState !== 'hidden') el.play().catch(() => {}); };
      const onVisible = () => { if (document.visibilityState === 'visible' && el.paused) el.play().catch(() => {}); };
      el.removeEventListener('ended', onEnded); el.removeEventListener('pause', onPause);
      el.addEventListener('ended', onEnded); el.addEventListener('pause', onPause);
      document.removeEventListener('visibilitychange', onVisible);
      document.addEventListener('visibilitychange', onVisible);
      el.play().catch(() => {
        const playOnClick = () => { el.play().catch(() => {}); document.removeEventListener('click', playOnClick); };
        document.addEventListener('click', playOnClick, { once: true });
      });
    };
    setup();
    const t1 = setTimeout(setup, 300);
    const t2 = setTimeout(setup, 1000);
    const t3 = setTimeout(setup, 2000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [bgType, customVideoUrl]);

  if (Platform.OS !== 'web') return null;
  if (bgType === 'off') return null;

  const isMech = false;

  const filter = isMech ? 'brightness(0.4) saturate(0.7)' : isNeon ? 'brightness(0.15) saturate(0.5) blur(2px)' : isLiquid ? 'brightness(0.18) saturate(0.45) blur(1px)' : isCmd ? 'brightness(0.35) saturate(0.8)' : 'brightness(0.2) saturate(0.4) blur(1px)';

  // CUSTOM VIDEO — check FIRST
  if (bgType === 'custom') {
    const src = customVideoUrl || (typeof window !== 'undefined' ? (window as any).__ea_naptune_custom_video_url || '' : '');
    if (src) {
      return (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' } as any}>
          <video id="ea_naptune-bg-video" key={'custom-' + src.slice(-8)} src={src} autoPlay muted loop playsInline
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter } as any} />
        </View>
      );
    }
    if (eaImage) return <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, backgroundImage: 'url(' + eaImage + ')', backgroundSize: 'cover', backgroundPosition: 'center top', filter } as any} />;
    return null;
  }

  // REGULAR VIDEO (V1-V4)
  const videoSrc = VIDEO_MAP[bgType];
  if (videoSrc) {
    return (
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, overflow: 'hidden' } as any}>
        <video id="ea_naptune-bg-video" key={bgType} src={videoSrc} autoPlay muted loop playsInline
          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', filter } as any} />
      </View>
    );
  }

  // ROBOT IMAGE (default)
  if (!eaImage) return null;
  return <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0, backgroundImage: 'url(' + eaImage + ')', backgroundSize: 'cover', backgroundPosition: 'center top', filter } as any} />;
}
