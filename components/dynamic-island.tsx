import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Platform, Image, PanResponder, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '@/providers/app-provider';
import { useTheme, ThemeName, GlassMode } from '@/providers/theme-provider';
import { RobotLogo } from './robot-logo';
import { SignalLog } from '@/services/signals-monitor';
import type { EA } from '@/providers/app-provider';
import { cardSurface } from '@/constants/neon';

// ===== AUDIO ENGINE =====
let audioCtx: AudioContext | null = null;
function getAC() { if (!audioCtx && typeof window !== 'undefined') audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)(); return audioCtx; }
function beep(freq: number, dur: number) { const c = getAC(); if (!c) return; const o = c.createOscillator(), g = c.createGain(), fl = c.createBiquadFilter(); o.type = 'sine'; o.frequency.value = freq; fl.type = 'bandpass'; fl.frequency.value = freq; fl.Q.value = 10; g.gain.setValueAtTime(0.06, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur); o.connect(fl); fl.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + dur); }
function commOpen() { beep(1800, 0.08); setTimeout(() => beep(2200, 0.08), 100); }
function commClose() { beep(2200, 0.05); setTimeout(() => beep(1600, 0.08), 80); }
function chime() { [800, 1000, 1200].forEach((f, i) => setTimeout(() => beep(f, 0.1), i * 70)); }
function reactorOn() { const c = getAC(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(50, c.currentTime); o.frequency.exponentialRampToValueAtTime(600, c.currentTime + 0.6); g.gain.setValueAtTime(0.1, c.currentTime); g.gain.exponentialRampToValueAtTime(0.01, c.currentTime + 0.7); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.7); }
function reactorOff() { const c = getAC(); if (!c) return; const o = c.createOscillator(), g = c.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(500, c.currentTime); o.frequency.exponentialRampToValueAtTime(30, c.currentTime + 0.8); g.gain.setValueAtTime(0.1, c.currentTime); g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.9); o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.9); }

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined') return null;
  const voices = window.speechSynthesis.getVoices(); if (!voices.length) return null;
  const pri = ['Microsoft Zira', 'Zira', 'Google UK English Female', 'Samantha', 'Karen', 'Daniel', 'Google US English'];
  for (const name of pri) { const f = voices.find(v => v.name.includes(name)); if (f) return f; }
  const eng = voices.filter(v => v.lang?.startsWith('en'));
  return eng.filter(v => !v.localService)[0] || eng[0] || voices[0];
}

// ===== COMMAND PARSER =====
function parseCmd(raw: string): { action: string; param?: string } | null {
  const c = raw.toLowerCase().trim().replace(/[.,!?']/g, '');
  // Glass modes — check FIRST (very specific words)
  if (c.match(/\bneon\b/)) return { action: 'glass', param: 'neon' };
  if (c.match(/\bminimal\b/)) return { action: 'glass', param: 'minimal' };
  if (c.match(/\bliquid\b/)) return { action: 'glass', param: 'liquid' };
  if (c.match(/\bcommander\b/)) return { action: 'glass', param: 'commander' };
  if (c.match(/\bmech\b/)) return { action: 'glass', param: 'mech' };
  // Colors — check early (very specific)
  const cm = c.match(/\b(red|blue|green|purple|orange|cyan)\b/);
  if (cm) return { action: 'color', param: cm[1] };
  // Theme shuffle
  if (c.match(/theme|shuffle/)) return { action: 'theme' };
  // Identity/help — check before navigation (specific phrases)
  if (c.match(/who are you|your name|identify|what are you/)) return { action: 'identify' };
  if (c.match(/\bhelp\b|what can you/)) return { action: 'help' };
  // Status
  if (c.match(/\bstatus\b|how.*doing|report/)) return { action: 'status' };
  // Navigation — specific page names
  if (c.match(/\bquote|pairs?\b|symbols?\b/)) return { action: 'nav', param: 'quotes' };
  if (c.match(/\bsetting/)) return { action: 'nav', param: 'settings' };
  if (c.match(/\bmetatrader\b|\bmt[45]\b|\bbroker\b/)) return { action: 'nav', param: 'metatrader' };
  if (c.match(/\bhome\b|\bdashboard\b/)) return { action: 'nav', param: 'home' };
  // Trading — LAST priority, require trade-related context
  if (c.match(/\bstart\b|\bbegin\b|\bactivate\b|\btrade on\b|\benable\b|\blaunch\b|\bgo live\b|\btrade\b/)) return { action: 'trade_on' };
  if (c.match(/\bstop\b|\bend\b|\bdeactivate\b|\btrade off\b|\bdisable\b|\bhalt\b|\bpause\b/)) return { action: 'trade_off' };
  return null;
}

const CMD_CHIPS = [
  { emoji: '📊', label: 'Quotes', cmd: 'open quotes' },
  { emoji: '⚡', label: 'Trade', cmd: 'start trading' },
  { emoji: '⏹', label: 'Stop', cmd: 'stop trading' },
  { emoji: '🏠', label: 'Home', cmd: 'go home' },
  { emoji: '⚙️', label: 'Settings', cmd: 'open settings' },
  { emoji: '🎨', label: 'Theme', cmd: 'change theme' },
  { emoji: '📡', label: 'Status', cmd: 'status' },
  { emoji: '🤖', label: 'Identity', cmd: 'who are you' },
];

const COLORS: ThemeName[] = ['red', 'blue', 'green', 'purple', 'orange', 'cyan'];
const GLASSES: GlassMode[] = ['neon', 'sectioned'];

interface DynamicIslandProps { visible: boolean; newSignal?: SignalLog | null; onSignalDismiss?: () => void; }

export function DynamicIsland({ visible, newSignal, onSignalDismiss }: DynamicIslandProps) {
  const { eas, isBotActive, setBotActive, removeEA, signalLogs, isSignalsMonitoring, activeSymbols, mt4Symbols, mt5Symbols, setTradingSignal, setShowTradingWebView } = useApp();
  const { theme, themeName, glassMode, setThemeName, setGlassMode } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [voiceOn, setVoiceOn] = useState(false);
  const [vLabel, setVLabel] = useState('VOICE ASSISTANT');
  const [vSub, setVSub] = useState('Tap to activate');
  const expandAnim = useRef(new Animated.Value(0)).current;
  const barAnims = useRef(Array.from({ length: 5 }, () => new Animated.Value(3))).current;
  const barLoopRef = useRef<any>(null);
  const voiceRef = useRef(false);
  const recogRef = useRef<any>(null);
  const execCmdRef = useRef<(raw: string) => void>(() => {});
  const ac = theme.accent, ar = theme.accentRgb;
  const isWeb = Platform.OS === 'web';
  const isNeon = glassMode === 'neon' || glassMode === 'sectioned', isLiquid = false, isCmd = false, isPill = false;

  // Draggable position
  const screenW = Dimensions.get('window').width;
  const screenH = Dimensions.get('window').height;
  const panX = useRef(new Animated.Value(Math.max(0, (screenW - 160) / 2))).current;
  const panY = useRef(new Animated.Value(12)).current;
  const isDragging = useRef(false);

  const panResponder = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5 || Math.abs(gs.dy) > 5,
    onPanResponderGrant: () => {
      isDragging.current = true;
      panX.setOffset((panX as any)._value);
      panY.setOffset((panY as any)._value);
    },
    onPanResponderMove: Animated.event([null, { dx: panX, dy: panY }], { useNativeDriver: false }),
    onPanResponderRelease: (_, gs) => {
      panX.flattenOffset();
      panY.flattenOffset();
      const curX = (panX as any)._value;
      const curY = (panY as any)._value;
      const maxX = screenW - 170;
      const maxY = screenH - 60;
      Animated.parallel([
        Animated.spring(panX, { toValue: Math.max(4, Math.min(maxX, curX)), useNativeDriver: false, tension: 100, friction: 8 }),
        Animated.spring(panY, { toValue: Math.max(4, Math.min(maxY, curY)), useNativeDriver: false, tension: 100, friction: 8 }),
      ]).start(() => { isDragging.current = false; });
    },
  })).current;

  const primaryEA = Array.isArray(eas) && eas.length > 0 ? eas[0] : null;
  const getImgUrl = useCallback((ea: EA | null): string | null => {
    if (!ea?.userData?.owner) return null;
    const raw = (ea.userData.owner.logo || '').toString().trim();
    if (!raw) return null;
    if (/^https?:\/\//i.test(raw)) return raw;
    return 'https://tradeportea.com/admin/uploads/' + raw.replace(/^\/+/, '');
  }, []);
  const eaImage = useMemo(() => getImgUrl(primaryEA), [getImgUrl, primaryEA]);
  const [logoErr, setLogoErr] = useState(false);
  const robotName = primaryEA?.name || 'Royd';

  // Keep voice ref in sync
  useEffect(() => { voiceRef.current = voiceOn; }, [voiceOn]);

  // Signal handling (preserved from original)
  const isSignalForActiveSymbol = useCallback((signal: SignalLog) => {
    const sym = signal.asset;
    return activeSymbols.some(s => s.symbol === sym) || mt4Symbols.some(s => s.symbol === sym) || mt5Symbols.some(s => s.symbol === sym);
  }, [activeSymbols, mt4Symbols, mt5Symbols]);

  useEffect(() => {
    if (newSignal) {
      const isActive = isSignalForActiveSymbol(newSignal);
      if (!isActive) { onSignalDismiss?.(); }
      else { setTradingSignal(newSignal); setShowTradingWebView(true); setTimeout(() => onSignalDismiss?.(), 500); }
    }
  }, [newSignal, onSignalDismiss, isSignalForActiveSymbol, setTradingSignal, setShowTradingWebView]);

  // Expand/collapse
  const toggle = useCallback(() => {
    if (isDragging.current) return;
    const next = !expanded;
    setExpanded(next);
    Animated.timing(expandAnim, { toValue: next ? 1 : 0, duration: 300, useNativeDriver: !isWeb }).start();
  }, [expanded, expandAnim]);

  // Bar anims
  const startBars = useCallback(() => {
    if (barLoopRef.current) cancelAnimationFrame(barLoopRef.current);
    const go = () => { Animated.parallel(barAnims.map(a => Animated.timing(a, { toValue: Math.random() * 12 + 3, duration: 100, useNativeDriver: false }))).start(() => { barLoopRef.current = requestAnimationFrame(go); }); }; go();
  }, [barAnims]);
  const stopBars = useCallback(() => {
    if (barLoopRef.current) { cancelAnimationFrame(barLoopRef.current); barLoopRef.current = null; }
    barAnims.forEach(a => a.setValue(3));
  }, [barAnims]);

  // Speak — simple direct approach, no stale closures
  const speakText = (text: string, cb?: () => void) => {
    if (!isWeb) {
      // On native, skip speech but still show state transitions
      startBars(); setVLabel(robotName.toUpperCase() + ' PROCESSING...'); setVSub('');
      setTimeout(() => { stopBars(); if (voiceRef.current) { setVLabel('LISTENING...'); setVSub('Tap a command below'); } cb?.(); }, 1500);
      return;
    }
    const synth = window.speechSynthesis;
    if (!synth) { cb?.(); return; }

    synth.cancel();
    startBars();
    setVLabel(robotName.toUpperCase() + ' SPEAKING...');
    setVSub('');
    commOpen();

    setTimeout(() => {
      const m = new SpeechSynthesisUtterance(text);
      m.rate = 0.88; m.pitch = 0.45; m.volume = 1;
      const v = pickVoice(); if (v) m.voice = v;

      let done = false;
      const finish = () => {
        if (done) return; done = true;
        commClose(); stopBars();
        if (voiceRef.current) {
          setVLabel('LISTENING...'); setVSub('Tap a command or speak');
        }
        if (cb) setTimeout(cb, 300);
      };

      m.onend = finish;
      m.onerror = () => finish();

      synth.speak(m);

      // Chrome bug: force resume if paused
      const keepAlive = setInterval(() => {
        if (done) { clearInterval(keepAlive); return; }
        if (synth.paused) synth.resume();
      }, 3000);

      // Fallback timer — continue even if speech events don't fire
      setTimeout(() => { finish(); clearInterval(keepAlive); }, Math.max(4000, text.length * 90));
    }, 250);
  };

  // Execute command — direct function, always fresh state via refs
  const executeCommand = (raw: string) => {
    const p = parseCmd(raw); chime();
    if (!p) { speakText('Try a command below.'); return; }
    switch (p.action) {
      case 'nav':
        speakText('Opening ' + p.param + '.');
        try { if (p.param === 'home') router.push('/(tabs)/'); else router.push('/(tabs)/' + p.param); } catch (e) {}
        break;
      case 'trade_on':
        if (isBotActive) { speakText('Already active.'); } else { reactorOn(); speakText('Trading activated.'); try { setBotActive(true); } catch (e) {} }
        break;
      case 'trade_off':
        if (!isBotActive) { speakText('Already stopped.'); } else { reactorOff(); speakText('Trading deactivated.'); try { setBotActive(false); } catch (e) {} }
        break;
      case 'theme':
        setThemeName(COLORS[Math.floor(Math.random() * COLORS.length)]); setGlassMode(GLASSES[Math.floor(Math.random() * GLASSES.length)]);
        speakText('Theme updated.'); break;
      case 'color':
        if (COLORS.includes(p.param as any)) setThemeName(p.param as ThemeName);
        speakText(p.param + '.'); break;
      case 'glass':
        if (GLASSES.includes(p.param as any)) setGlassMode(p.param as GlassMode);
        speakText(p.param + ' mode.'); break;
      case 'status': speakText(isBotActive ? 'Trading active.' : 'Trading idle.'); break;
      case 'identify': speakText('I am ' + robotName + '. Your shadow soldier.'); break;
      case 'help': speakText('Say: open quotes, trade, stop, color purple, neon, go home, status.'); break;
    }
  };
  execCmdRef.current = executeCommand;

  // Start listening with SpeechRecognition
  const startListening = useCallback(() => {
    if (!isWeb) return;
    try {
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) { console.log('SpeechRecognition not available'); return; }
      if (recogRef.current) try { recogRef.current.abort(); } catch (e) {}
      const r = new SR();
      r.continuous = true;
      r.interimResults = false;
      r.lang = 'en-US';
      r.onresult = (e: any) => {
        const transcript = e.results[e.results.length - 1][0].transcript;
        console.log('Voice heard:', transcript);
        if (voiceRef.current) execCmdRef.current(transcript);
      };
      r.onerror = (e: any) => { console.log('Recognition error:', e.error); };
      r.onend = () => { if (voiceRef.current) { setTimeout(() => { try { r.start(); } catch (e) {} }, 300); } };
      r.start();
      recogRef.current = r;
      console.log('SpeechRecognition started — mic active');
    } catch (e) { console.log('SpeechRecognition init error:', e); }
  }, []);

  const stopListening = useCallback(() => {
    if (recogRef.current) { try { recogRef.current.abort(); } catch (e) {} recogRef.current = null; }
  }, []);

  // Voice toggle
  const toggleVoice = () => {
    if (voiceOn) {
      setVoiceOn(false); stopBars(); stopListening(); commClose();
      setVLabel('VOICE ASSISTANT'); setVSub('Tap 🎤 to activate');
      if (isWeb && window.speechSynthesis) window.speechSynthesis.cancel();
      return;
    }
    setVoiceOn(true);
    speakText(robotName + ' online. How can I assist you today?');
    // Start mic listening after greeting
    setTimeout(() => { if (voiceRef.current) startListening(); }, 3000);
  };

  // Expose toggleVoice to window so Mech mic can trigger it
  useEffect(() => { if (isWeb) (window as any).__ea_naptune_toggleVoice = toggleVoice; }, [toggleVoice]);

  // Run chip command — always works, auto-activates voice
  const runChip = (cmd: string) => {
    if (!voiceOn) { setVoiceOn(true); startListening(); }
    executeCommand(cmd);
  };

  if (!visible || !primaryEA) return null;

  // The pill and the expanded sheet are the same opaque near-black face as the
  // cards on the screen behind them — the island was the last surface still
  // mixing its own translucent grey, which read as a different app when it
  // floated over home.
  const pillGlow = isNeon ? { ...cardSurface(ar), border: '1px solid rgba(' + ar + ',0.35)' }
    : isLiquid ? { border: '1.5px solid rgba(' + ar + ',0.35)', boxShadow: '0 0 10px rgba(' + ar + ',0.4),0 0 25px rgba(' + ar + ',0.25)', background: 'linear-gradient(135deg,rgba(255,255,255,0.06),rgba(0,0,0,0.3))' }
    : isCmd ? { border: '1.5px solid ' + ac, boxShadow: '0 0 12px rgba(' + ar + ',0.4),0 0 24px rgba(' + ar + ',0.2)', background: 'rgba(6,6,8,0.92)' }
    : isPill ? { border: '1.5px solid rgba(' + ar + ',0.25)', boxShadow: '0 0 15px rgba(' + ar + ',0.2),0 0 40px rgba(' + ar + ',0.08)', background: 'linear-gradient(135deg,rgba(' + ar + ',0.06),rgba(255,255,255,0.04) 30%,rgba(0,0,0,0.5))', borderRadius: '30px' }
    : { border: '0.5px solid rgba(255,255,255,0.04)', boxShadow: '0 0 25px rgba(' + ar + ',0.3),0 0 50px rgba(' + ar + ',0.12)', background: 'rgba(12,12,14,0.97)' };

  const expGlow = isNeon ? { ...cardSurface(ar), border: '1px solid rgba(' + ar + ',0.35)', boxShadow: cardSurface(ar).boxShadow + ',0 12px 48px rgba(0,0,0,0.7)' }
    : isLiquid ? { border: '1.5px solid rgba(' + ar + ',0.3)', boxShadow: '0 0 12px rgba(' + ar + ',0.4),0 0 30px rgba(' + ar + ',0.2),0 12px 48px rgba(0,0,0,0.7)', background: 'linear-gradient(135deg,rgba(255,255,255,0.06),rgba(0,0,0,0.3)),rgba(6,6,8,0.92)' }
    : isCmd ? { border: '2px solid ' + ac, boxShadow: '0 0 15px rgba(' + ar + ',0.4),0 0 30px rgba(' + ar + ',0.2),0 12px 48px rgba(0,0,0,0.7)', background: 'rgba(6,6,8,0.94)' }
    : isPill ? { border: '1.5px solid rgba(' + ar + ',0.25)', boxShadow: '0 0 15px rgba(' + ar + ',0.2),0 0 40px rgba(' + ar + ',0.08),0 12px 48px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.08)', background: 'linear-gradient(135deg,rgba(' + ar + ',0.06),rgba(255,255,255,0.04) 30%,rgba(0,0,0,0.5))', borderRadius: '30px' }
    : { border: '0.5px solid rgba(255,255,255,0.04)', boxShadow: '0 0 30px rgba(' + ar + ',0.25),0 0 60px rgba(' + ar + ',0.1),0 12px 48px rgba(0,0,0,0.7)', background: 'rgba(10,10,12,0.97)' };

  const ringBg = 'conic-gradient(from 0deg,transparent,' + ac + ' 90deg,transparent 180deg,' + ac + ' 270deg,transparent)';

  return (
    <Animated.View {...panResponder.panHandlers} style={[styles.wrap, { left: panX, top: panY }]} pointerEvents="box-none">
      {/* COLLAPSED PILL */}
      {!expanded && (
        <TouchableOpacity style={[styles.pill, isWeb && { backdropFilter: 'blur(30px)', ...pillGlow } as any]} onPress={toggle} activeOpacity={0.8}>
          <View style={styles.pillAv}>
            {eaImage && !logoErr ? <Image source={{ uri: eaImage }} style={styles.pillAvImg} onError={() => setLogoErr(true)} resizeMode="cover" /> : <RobotLogo size={12} />}
            <View style={[styles.pillRing, isWeb && { background: ringBg } as any]} />
            <View style={[styles.pillDot, { backgroundColor: isBotActive ? ac : 'rgba(255,255,255,0.3)' }]} />
          </View>
          <View>
            <Text style={styles.pillName}>{robotName.toUpperCase()}</Text>
            <Text style={[styles.pillStat, { color: isBotActive ? ac : 'rgba(255,255,255,0.3)' }]}>{isBotActive ? 'TRADING' : 'IDLE'}</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* EXPANDED PANEL */}
      {expanded && (
        <Animated.View style={[styles.expPanel, isWeb && { backdropFilter: 'blur(40px)', ...expGlow } as any]}>
          {/* Header */}
          <TouchableOpacity style={styles.expHead} onPress={toggle} activeOpacity={0.8}>
            <View style={styles.expHeadAv}>
              {eaImage && !logoErr ? <Image source={{ uri: eaImage }} style={styles.expHeadAvImg} onError={() => setLogoErr(true)} resizeMode="cover" /> : <RobotLogo size={14} />}
              <View style={[styles.expHeadRing, isWeb && { background: ringBg } as any]} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.expHeadName}>{robotName.toUpperCase()}</Text>
              <Text style={[styles.expHeadSub, { color: isBotActive ? ac : 'rgba(255,255,255,0.3)' }]}>{isBotActive ? 'TRADING · ACTIVE' : 'IDLE'}</Text>
            </View>
            <TouchableOpacity style={styles.expX} onPress={toggle}><Text style={styles.expXTxt}>✕</Text></TouchableOpacity>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actRow}>
            <TouchableOpacity style={[styles.actBtn, isWeb && { borderColor: 'rgba(' + ar + ',0.1)' } as any]} onPress={() => { try { setBotActive(!isBotActive); } catch (e) {} if (!isBotActive) reactorOn(); else reactorOff(); }} activeOpacity={0.7}>
              <View style={[styles.actIc, isWeb && { background: 'rgba(' + ar + ',0.12)', color: ac } as any]}>
                <Text style={{ color: ac, fontSize: 14 }}>{isBotActive ? '⏸' : '▶'}</Text>
              </View>
              <Text style={styles.actLb}>{isBotActive ? 'STOP' : 'TRADE'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actBtn, isWeb && { borderColor: 'rgba(' + ar + ',0.1)' } as any]} onPress={() => { router.push('/(tabs)/quotes'); toggle(); }} activeOpacity={0.7}>
              <View style={[styles.actIc, isWeb && { background: 'rgba(' + ar + ',0.12)', color: ac } as any]}><Text style={{ color: ac, fontSize: 12 }}>📊</Text></View>
              <Text style={styles.actLb}>QUOTES</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actBtn, isWeb && { borderColor: 'rgba(' + ar + ',0.1)' } as any]} onPress={() => { if (primaryEA?.id) removeEA(primaryEA.id).then(() => setBotActive(false)); toggle(); }} activeOpacity={0.7}>
              <View style={[styles.actIc, isWeb && { background: 'rgba(' + ar + ',0.12)', color: ac } as any]}><Text style={{ color: ac, fontSize: 12 }}>🗑</Text></View>
              <Text style={styles.actLb}>REMOVE</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {/* COLORS */}
          <View style={styles.sec}>
            <Text style={styles.secLbl}>COLOR</Text>
            <View style={styles.colorRow}>
              {COLORS.map(c => (
                <TouchableOpacity key={c} style={[styles.colorDot, { borderColor: themeName === c ? theme.accent : 'transparent' }]} onPress={() => setThemeName(c)} activeOpacity={0.7}>
                  <View style={[styles.colorIn, { backgroundColor: c === 'red' ? '#FF1A1A' : c === 'blue' ? '#1A8FFF' : c === 'green' ? '#1AFF5E' : c === 'purple' ? '#A855F7' : c === 'orange' ? '#FF8C1A' : '#06D6E0' }]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* GLASS */}
          <View style={styles.sec}>
            <Text style={styles.secLbl}>GLASS</Text>
            <View style={styles.glassRow}>
              {GLASSES.map(g => (
                <TouchableOpacity key={g} style={[styles.glassBtn, glassMode === g && { borderColor: ac + '55', backgroundColor: 'rgba(' + ar + ',0.08)' }]} onPress={() => setGlassMode(g)} activeOpacity={0.7}>
                  <Text style={[styles.glassTxt, glassMode === g && { color: ac }]}>{g.charAt(0).toUpperCase() + g.slice(1)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.divider} />

          {/* VOICE */}
          <View style={styles.voiceRow}>
            <TouchableOpacity style={[styles.micBtn, voiceOn && isWeb && { border: '1.5px solid ' + (vLabel === 'LISTENING...' ? '#1AFF5E' : ac), background: vLabel === 'LISTENING...' ? 'rgba(26,255,94,0.08)' : 'rgba(' + ar + ',0.12)', boxShadow: '0 0 10px ' + (vLabel === 'LISTENING...' ? 'rgba(26,255,94,0.3)' : 'rgba(' + ar + ',0.3)') } as any]} onPress={toggleVoice} activeOpacity={0.7}>
              <Text style={{ fontSize: 14 }}>🎤</Text>
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={[styles.vLblTxt, voiceOn && { color: vLabel === 'LISTENING...' ? '#1AFF5E' : ac }]}>{vLabel}</Text>
              <Text style={styles.vSubTxt}>{vSub}</Text>
            </View>
            {voiceOn && (
              <View style={styles.barsRow}>
                {barAnims.map((a, i) => <Animated.View key={i} style={[styles.bar, { height: a, backgroundColor: vLabel.includes('SPEAKING') ? ac : '#1AFF5E' }]} />)}
              </View>
            )}
          </View>

          {/* VOICE COMMAND CHIPS — always visible when expanded */}
          <View style={styles.cmdsWrap}>
            <Text style={[styles.secLbl, { marginBottom: 4, width: '100%' }]}>VOICE COMMANDS</Text>
            {CMD_CHIPS.map(ch => (
              <TouchableOpacity key={ch.cmd} style={[styles.cmdChip, isWeb && { borderColor: 'rgba(' + ar + ',0.08)' } as any]} onPress={() => runChip(ch.cmd)} activeOpacity={0.7}>
                <Text style={styles.cmdE}>{ch.emoji}</Text>
                <Text style={[styles.cmdL, voiceOn && { color: 'rgba(255,255,255,0.5)' }]}>{ch.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* SIGNALS */}
          <View style={styles.sigBar}>
            <View style={styles.sigDot} />
            <Text style={styles.sigTxt}>{isSignalsMonitoring ? 'MONITORING SIGNALS' : 'SIGNALS IDLE'}</Text>
            <Text style={styles.sigCnt}>{signalLogs.length} ACTIVE</Text>
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', zIndex: 9999 },
  // Pill
  pill: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingVertical: 5, paddingLeft: 5, paddingRight: 14, borderRadius: 24, backgroundColor: 'rgba(6,6,8,0.92)' },
  pillAv: { width: 30, height: 30, borderRadius: 15, overflow: 'hidden', position: 'relative' },
  pillAvImg: { width: 30, height: 30, borderRadius: 15 },
  pillRing: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 17 },
  pillDot: { position: 'absolute', bottom: -1, right: -1, width: 9, height: 9, borderRadius: 5, borderWidth: 2, borderColor: 'rgba(6,6,8,0.92)' },
  pillName: { fontSize: 10, fontWeight: '800', color: '#fff', letterSpacing: 0.4 },
  pillStat: { fontSize: 7, fontWeight: '600', letterSpacing: 0.8 },
  // Expanded
  expPanel: { width: 330, borderRadius: 24, overflow: 'hidden', backgroundColor: 'rgba(6,6,8,0.94)' },
  expHead: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12 },
  expHeadAv: { width: 34, height: 34, borderRadius: 17, overflow: 'hidden', position: 'relative' },
  expHeadAvImg: { width: 34, height: 34, borderRadius: 17 },
  expHeadRing: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 19 },
  expHeadName: { fontSize: 12, fontWeight: '800', color: '#fff' },
  expHeadSub: { fontSize: 7.5, fontWeight: '600', letterSpacing: 0.6, marginTop: 1 },
  expX: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  expXTxt: { fontSize: 10, color: 'rgba(255,255,255,0.35)' },
  // Actions
  actRow: { flexDirection: 'row', gap: 4, paddingHorizontal: 10, paddingBottom: 6 },
  actBtn: { flex: 1, alignItems: 'center', gap: 2, paddingVertical: 7, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.04)' },
  actIc: { width: 28, height: 28, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  actLb: { fontSize: 6.5, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5 },
  divider: { height: 0.5, backgroundColor: 'rgba(255,255,255,0.04)', marginHorizontal: 10, marginVertical: 2 },
  // Theme
  sec: { paddingVertical: 6, paddingHorizontal: 10 },
  secLbl: { fontSize: 6.5, fontWeight: '600', color: 'rgba(255,255,255,0.2)', letterSpacing: 0.8, marginBottom: 5 },
  colorRow: { flexDirection: 'row', gap: 5 },
  colorDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  colorIn: { width: 12, height: 12, borderRadius: 6 },
  glassRow: { flexDirection: 'row', gap: 3 },
  glassBtn: { flex: 1, paddingVertical: 5, borderRadius: 9, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.04)' },
  glassTxt: { fontSize: 7, fontWeight: '700', color: 'rgba(255,255,255,0.3)', letterSpacing: 0.2 },
  // Voice
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingHorizontal: 10 },
  micBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.03)' },
  vLblTxt: { fontSize: 8, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.3 },
  vSubTxt: { fontSize: 7, color: 'rgba(255,255,255,0.2)', marginTop: 1 },
  barsRow: { flexDirection: 'row', gap: 1.5, alignItems: 'center', height: 14 },
  bar: { width: 2, borderRadius: 1 },
  // Commands
  cmdsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, paddingHorizontal: 10, paddingBottom: 6 },
  cmdChip: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.04)' },
  cmdE: { fontSize: 8, marginRight: 3 },
  cmdL: { fontSize: 7.5, fontWeight: '600', color: 'rgba(255,255,255,0.3)' },
  // Signals
  sigBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 10, borderTopWidth: 0.5, borderTopColor: 'rgba(16,185,129,0.12)', backgroundColor: 'rgba(16,185,129,0.03)' },
  sigDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#10B981' },
  sigTxt: { fontSize: 7.5, fontWeight: '600', color: '#10B981', letterSpacing: 0.4 },
  sigCnt: { fontSize: 7, color: 'rgba(255,255,255,0.2)', marginLeft: 'auto' as any },
});
