import React, { useState, useRef, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, Animated } from 'react-native';
import { Mic } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme, ThemeName, GlassMode } from '@/providers/theme-provider';
import { useApp } from '@/providers/app-provider';

// ===== AUDIO =====
let audioCtx: AudioContext | null = null;
function getAC() { if (!audioCtx && typeof window !== 'undefined') audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); return audioCtx; }
function beep(f: number, d: number) { const c = getAC(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter(); o.type = 'sine'; o.frequency.value = f; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = 10; g.gain.setValueAtTime(0.07, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); o.connect(fl); fl.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d); }
function staticB(d: number) { const c = getAC(); if (!c) return; const buf = c.createBuffer(1, c.sampleRate * d, c.sampleRate); const da = buf.getChannelData(0); for (let i = 0; i < da.length; i++) da[i] = (Math.random() * 2 - 1) * 0.02; const src = c.createBufferSource(), g = c.createGain(), f = c.createBiquadFilter(); src.buffer = buf; f.type = 'bandpass'; f.frequency.value = 3000; f.Q.value = 0.5; g.gain.setValueAtTime(0.04, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + d); src.connect(f); f.connect(g); g.connect(c.destination); src.start(); src.stop(c.currentTime + d); }
function commOpen() { beep(1800, 0.08); setTimeout(() => beep(2200, 0.08), 100); setTimeout(() => staticB(0.2), 180); }
function commClose() { beep(2200, 0.06); setTimeout(() => beep(1600, 0.1), 80); setTimeout(() => staticB(0.1), 160); }
function chime() { [800, 1000, 1200].forEach((f, i) => setTimeout(() => beep(f, 0.12), i * 80)); }

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices(); if (!voices.length) return null;
  const pri = ['Microsoft Zira', 'Zira', 'Microsoft Zira Desktop', 'Google UK English Female', 'Microsoft Hazel', 'Samantha', 'Karen', 'Moira', 'Fiona', 'Google US English', 'Microsoft David', 'Daniel'];
  for (const name of pri) { const f = voices.find(v => v.name.includes(name)); if (f) return f; }
  const eng = voices.filter(v => v.lang?.startsWith('en'));
  return eng.filter(v => !v.localService)[0] || eng[0] || voices[0];
}

function parseCmd(raw: string): { action: string; param?: string } | null {
  const c = raw.toLowerCase().trim();
  if (c.match(/open quote|show quote|quote|symbol|pairs/)) return { action: 'nav', param: 'quotes' };
  if (c.match(/open setting|show setting|setting/)) return { action: 'nav', param: 'settings' };
  if (c.match(/open meta|metatrader|mt5|mt4|broker/)) return { action: 'nav', param: 'metatrader' };
  if (c.match(/go home|open home|home page|back home|back to home|home$/)) return { action: 'nav', param: 'home' };
  if (c.match(/start trad|begin trad|activate trad|trade on/)) return { action: 'trade_on' };
  if (c.match(/stop trad|end trad|deactivate|trade off/)) return { action: 'trade_off' };
  if (c.match(/change theme|switch theme|random theme|new theme/)) return { action: 'theme' };
  const cm = c.match(/colou?r(?:\s+to)?\s+(red|blue|green|purple|orange|cyan)/);
  if (cm) return { action: 'color', param: cm[1] };
  if (c.match(/change colou?r|random colou?r/)) return { action: 'random_color' };
  if (c.match(/neon/)) return { action: 'glass', param: 'neon' };
  if (c.match(/minimal/)) return { action: 'glass', param: 'minimal' };
  if (c.match(/liquid/)) return { action: 'glass', param: 'liquid' };
  if (c.match(/commander/)) return { action: 'glass', param: 'commander' };
  if (c.match(/change glow|change glass|random glow/)) return { action: 'random_glass' };
  if (c.match(/status|how.*trad|what.*status/)) return { action: 'status' };
  if (c.match(/who are you|your name|identify/)) return { action: 'identify' };
  if (c.match(/help|what can you do|commands/)) return { action: 'help' };
  return null;
}

const CHIPS = [
  { emoji: '📊', label: 'Quotes', cmd: 'open quotes' },
  { emoji: '⚡', label: 'Trade', cmd: 'start trading' },
  { emoji: '⏹', label: 'Stop', cmd: 'stop trading' },
  { emoji: '🎨', label: 'Theme', cmd: 'change theme' },
  { emoji: '⚙️', label: 'Settings', cmd: 'open settings' },
  { emoji: '🏠', label: 'Home', cmd: 'go home' },
];

export function VoiceOverlay() {
  const { theme, glassMode, setThemeName, setGlassMode } = useTheme();
  const { eas, isBotActive, setBotActive } = useApp();
  const [active, setActive] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [label, setLabel] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const barAnims = useRef(Array.from({ length: 5 }, () => new Animated.Value(3))).current;
  const expandAnim = useRef(new Animated.Value(0)).current;
  const barLoopRef = useRef<any>(null);
  const recogRef = useRef<any>(null);
  const activeRef = useRef(false);
  const ac = theme.accent, ar = theme.accentRgb;
  const robotName = eas.length > 0 ? eas[0].name : 'Royd';

  // Keep refs fresh
  const stateRef = useRef({ isBotActive, robotName });
  stateRef.current = { isBotActive, robotName };

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => () => {
    if (recogRef.current) try { recogRef.current.abort(); } catch (e) {}
    if (barLoopRef.current) cancelAnimationFrame(barLoopRef.current);
    if (Platform.OS === 'web' && window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  useEffect(() => {
    if (active) {
      const l = Animated.loop(Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: Platform.OS !== 'web' }),
      ])); l.start(); return () => l.stop();
    } else pulseAnim.setValue(1);
  }, [active]);

  const doExpand = useCallback((show: boolean) => {
    setExpanded(show);
    Animated.timing(expandAnim, { toValue: show ? 1 : 0, duration: 250, useNativeDriver: Platform.OS !== 'web' }).start();
  }, [expandAnim]);

  const startBars = useCallback(() => {
    if (barLoopRef.current) cancelAnimationFrame(barLoopRef.current);
    const go = () => { Animated.parallel(barAnims.map(a => Animated.timing(a, { toValue: Math.random() * 18 + 3, duration: 100, useNativeDriver: false }))).start(() => { barLoopRef.current = requestAnimationFrame(go); }); }; go();
  }, [barAnims]);

  const stopBars = useCallback(() => {
    if (barLoopRef.current) { cancelAnimationFrame(barLoopRef.current); barLoopRef.current = null; }
    barAnims.forEach(a => a.setValue(3));
  }, [barAnims]);

  // SPEAK
  const say = useCallback((text: string, done?: () => void) => {
    if (Platform.OS !== 'web' || !window.speechSynthesis) { done?.(); return; }
    startBars(); setLabel(stateRef.current.robotName.toUpperCase() + ' SPEAKING...');
    commOpen();
    setTimeout(() => {
      const m = new SpeechSynthesisUtterance(text);
      m.rate = 0.88; m.pitch = 0.45; m.volume = 1;
      const v = pickVoice(); if (v) m.voice = v;
      m.onend = () => { setTimeout(commClose, 200); setTimeout(() => { stopBars(); done?.(); }, 500); };
      m.onerror = () => { stopBars(); done?.(); };
      window.speechSynthesis.speak(m);
    }, 400);
  }, [startBars, stopBars]);

  // NAVIGATE — uses router directly, works from ANY page
  const navigate = useCallback((page: string) => {
    try {
      if (page === 'home') router.replace('/(tabs)/');
      else if (page === 'quotes') router.replace('/(tabs)/quotes');
      else if (page === 'metatrader') router.replace('/(tabs)/metatrader');
      else if (page === 'settings') router.replace('/(tabs)/settings');
    } catch (e) { console.log('Nav error:', e); }
  }, []);

  // LISTEN REF — always points to latest
  const listenRef = useRef<() => void>(() => {});

  const startListening = useCallback(() => {
    if (Platform.OS !== 'web' || !activeRef.current) return;
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setLabel('TAP COMMANDS'); return; }
    if (recogRef.current) try { recogRef.current.abort(); } catch (e) {}

    setLabel('LISTENING...'); stopBars();

    const r = new SR(); recogRef.current = r;
    r.continuous = true; // KEY: stay open continuously
    r.interimResults = true; r.lang = 'en-US';

    r.onresult = (e: any) => {
      let t = ''; for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
      setLabel('🎤 ' + t); startBars();
      if (e.results[e.results.length - 1].isFinal) {
        setLabel('...');
        setTimeout(() => execRef.current(t), 200);
      }
    };
    r.onerror = (e: any) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') { recogRef.current = null; setLabel('TAP COMMANDS'); return; }
      // Any other error: restart if active
      if (activeRef.current) setTimeout(() => listenRef.current(), 500);
    };
    r.onend = () => {
      // ALWAYS restart if still active — this is the KEY fix
      if (activeRef.current) setTimeout(() => listenRef.current(), 300);
    };
    try { r.start(); } catch (e) { setLabel('TAP COMMANDS'); }
  }, [startBars, stopBars]);

  listenRef.current = startListening;

  // EXEC REF
  const execRef = useRef<(raw: string) => void>(() => {});

  const execCommand = useCallback((raw: string) => {
    const p = parseCmd(raw); chime();
    const st = stateRef.current;
    const resume = () => {
      if (!activeRef.current) return;
      setLabel('LISTENING...');
      stopBars(); doExpand(true);
      // Restart listening after speaking
      setTimeout(() => { if (activeRef.current) listenRef.current(); }, 800);
    };

    if (!p) { say("Sorry, try again.", resume); return; }

    const colors: ThemeName[] = ['red', 'blue', 'green', 'purple', 'orange', 'cyan'];
    const glasses: GlassMode[] = ['neon', 'sectioned'];

    switch (p.action) {
      case 'nav': say('Opening ' + p.param + '.', resume); navigate(p.param!); break;
      case 'trade_on': if (st.isBotActive) say('Already active.', resume); else { say('Trading activated.', resume); try { setBotActive(true); } catch (e) {} } break;
      case 'trade_off': if (!st.isBotActive) say('Already stopped.', resume); else { say('Trading deactivated.', resume); try { setBotActive(false); } catch (e) {} } break;
      case 'theme': say('Theme updated.', resume); setThemeName(colors[Math.floor(Math.random() * colors.length)]); setGlassMode(glasses[Math.floor(Math.random() * glasses.length)]); break;
      case 'color': say(p.param + '.', resume); if (colors.includes(p.param as any)) setThemeName(p.param as ThemeName); break;
      case 'random_color': say('Done.', resume); setThemeName(colors[Math.floor(Math.random() * colors.length)]); break;
      case 'glass': say(p.param + ' mode.', resume); if (glasses.includes(p.param as any)) setGlassMode(p.param as GlassMode); break;
      case 'random_glass': say('Done.', resume); setGlassMode(glasses[Math.floor(Math.random() * glasses.length)]); break;
      case 'status': say(st.isBotActive ? 'Trading active.' : 'Trading idle.', resume); break;
      case 'identify': say('I am ' + st.robotName + '. Your shadow soldier.', resume); break;
      case 'help': say('Say: open quotes, start trading, stop, color purple, neon mode, go home, status.', resume); break;
    }
  }, [say, stopBars, doExpand, navigate, setThemeName, setGlassMode, setBotActive]);

  execRef.current = execCommand;

  // RUN CHIP
  const runChip = useCallback((cmd: string) => {
    if (!active) {
      setActive(true); startBars(); doExpand(false); setLabel('...');
      setTimeout(() => say(stateRef.current.robotName + ' online.', () => {
        if (!activeRef.current) return;
        setLabel('...'); startBars();
        setTimeout(() => execRef.current(cmd), 200);
      }), 200);
      return;
    }
    doExpand(false); setLabel('...'); startBars();
    setTimeout(() => execRef.current(cmd), 200);
  }, [active, say, startBars, doExpand]);

  // TOGGLE
  const toggle = useCallback(() => {
    if (active) {
      setActive(false); setLabel(''); stopBars(); doExpand(false);
      if (recogRef.current) try { recogRef.current.abort(); } catch (e) {} recogRef.current = null;
      if (Platform.OS === 'web' && window.speechSynthesis) window.speechSynthesis.cancel();
      commClose();
    } else {
      setActive(true); setLabel('...'); startBars(); doExpand(false);
      setTimeout(() => say(stateRef.current.robotName + ' online. How can I assist?', () => {
        if (!activeRef.current) return;
        stopBars(); setLabel('LISTENING...');
        doExpand(true); listenRef.current();
      }), 400);
    }
  }, [active, say, startBars, stopBars, doExpand]);

  if (Platform.OS !== 'web') return null;

  return (
    <View style={styles.overlay} pointerEvents="box-none">
      {/* Expanded panel with bubbles */}
      <Animated.View style={[styles.panel, { opacity: expandAnim, transform: [{ translateY: expandAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }] }]} pointerEvents={expanded ? 'auto' : 'none'}>
        {active && label ? <Text style={[styles.labelTxt, { color: ac }]}>{label}</Text> : null}
        <View style={styles.chipsRow}>
          {CHIPS.map(chip => (
            <TouchableOpacity key={chip.cmd} style={[styles.chip, { borderColor: 'rgba(' + ar + ', 0.15)' }]} onPress={() => runChip(chip.cmd)} activeOpacity={0.7}>
              <Text style={styles.chipE}>{chip.emoji}</Text>
              <Text style={styles.chipL}>{chip.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Bars */}
      {active && (
        <View style={styles.barsRow}>
          {barAnims.map((anim, i) => (
            <Animated.View key={i} style={[styles.bar, { height: anim, backgroundColor: ac }]} />
          ))}
        </View>
      )}

      {/* Floating mic button */}
      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <TouchableOpacity
          style={[styles.micBtn, { borderColor: active ? ac : 'rgba(255,255,255,0.1)', backgroundColor: active ? 'rgba(' + ar + ', 0.12)' : 'rgba(0,0,0,0.7)' }, Platform.OS === 'web' && { backdropFilter: 'blur(20px)', boxShadow: active ? '0 0 20px rgba(' + ar + ', 0.4), 0 0 40px rgba(' + ar + ', 0.2)' : '0 4px 20px rgba(0,0,0,0.5)' } as any]}
          onPress={toggle} activeOpacity={0.7}
        >
          <Mic color={active ? ac : 'rgba(255,255,255,0.5)'} size={22} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', bottom: 20, right: 16, zIndex: 9999, alignItems: 'flex-end', gap: 8 },
  panel: { backgroundColor: 'rgba(0,0,0,0.8)', borderRadius: 20, padding: 12, marginBottom: 4, maxWidth: 260, ...(Platform.OS === 'web' && { backdropFilter: 'blur(30px)', border: '0.5px solid rgba(255,255,255,0.08)' }) as any },
  labelTxt: { fontSize: 9, fontWeight: '600', letterSpacing: 0.4, textAlign: 'center', marginBottom: 8 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, justifyContent: 'center' },
  chip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, paddingHorizontal: 9, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 0.5 },
  chipE: { fontSize: 10, marginRight: 3 },
  chipL: { fontSize: 9, fontWeight: '600', color: 'rgba(255,255,255,0.4)' },
  barsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, height: 18, alignSelf: 'center', marginBottom: 2 },
  bar: { width: 2.5, borderRadius: 2 },
  micBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
});
