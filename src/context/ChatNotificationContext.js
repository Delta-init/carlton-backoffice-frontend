import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

const API = process.env.REACT_APP_BACKEND_URL;

const defaultCtx = {
  totalUnread: 0,
  setTotalUnread: () => {},
  resetUnread: () => {},
  soundEnabled: true,
  toggleSound: () => {},
  registerHandler: () => {},
  trackThreadParticipation: () => {},
  hasParticipated: () => false,
};

const ChatNotificationContext = createContext(defaultCtx);

export function ChatNotificationProvider({ children }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [soundEnabled, setSoundEnabled] = useState(
    () => localStorage.getItem('msg_sound') !== 'false'
  );
  const [totalUnread, setTotalUnread] = useState(0);

  // Refs updated each render — avoids stale closures in memoised callbacks
  const soundEnabledRef = useRef(soundEnabled);
  const userRef = useRef(user);
  useEffect(() => { soundEnabledRef.current = soundEnabled; }, [soundEnabled]);
  useEffect(() => { userRef.current = user; }, [user]);

  // Messages.js registers its state-update handler here (reassigned each render)
  const messageHandlerRef = useRef(null);

  // Track which threads the current user has replied in: "channelId:parentMsgId"
  const threadParticipationsRef = useRef(new Set());

  // Incoming buzz ("missed-call" ring) — owned here so it rings on any page
  const [incomingBuzz, setIncomingBuzz] = useState(null);
  const ringCtxRef = useRef(null);
  const ringTimerRef = useRef(null);
  const buzzTimeoutRef = useRef(null);

  // ── Audio ──────────────────────────────────────────────────────────────────
  const playPing = useCallback(() => {
    if (!soundEnabledRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch { /* AudioContext unavailable */ }
  }, []);

  // ── Buzz ring ("missed-call") — loops until answered/declined; overrides mute ─
  const stopRing = useCallback(() => {
    if (ringTimerRef.current) { clearInterval(ringTimerRef.current); ringTimerRef.current = null; }
  }, []);

  const startRing = useCallback(() => {
    try {
      if (!ringCtxRef.current) ringCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      const ctx = ringCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      const tone = () => {
        const t0 = ctx.currentTime;
        [0, 0.4].forEach(off => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain); gain.connect(ctx.destination);
          osc.type = 'sine';
          osc.frequency.setValueAtTime(520, t0 + off);
          osc.frequency.setValueAtTime(660, t0 + off + 0.12);
          gain.gain.setValueAtTime(0.0001, t0 + off);
          gain.gain.exponentialRampToValueAtTime(0.4, t0 + off + 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, t0 + off + 0.34);
          osc.start(t0 + off);
          osc.stop(t0 + off + 0.36);
        });
      };
      stopRing();
      tone();
      ringTimerRef.current = setInterval(tone, 2400);
    } catch { /* AudioContext unavailable */ }
  }, [stopRing]);

  const ackBuzz = useCallback((b, action) => {
    try {
      const token = localStorage.getItem('auth_token');
      fetch(`${API}/api/buzz/ack`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ from_id: b.from_id, action, scope: b.scope, channel_name: b.channel_name || '' }),
      }).catch(() => {});
    } catch { /* ignore */ }
  }, []);

  const answerBuzz = useCallback(() => {
    setIncomingBuzz(b => {
      if (b) {
        ackBuzz(b, 'answered');
        const open = b.scope === 'channel' ? `channel:${b.channel_id}` : `dm:${b.dm_peer_id}`;
        navigate(`/messages?open=${encodeURIComponent(open)}`);
      }
      return null;
    });
    stopRing();
    if (buzzTimeoutRef.current) { clearTimeout(buzzTimeoutRef.current); buzzTimeoutRef.current = null; }
  }, [ackBuzz, navigate, stopRing]);

  const declineBuzz = useCallback(() => {
    setIncomingBuzz(b => { if (b) ackBuzz(b, 'declined'); return null; });
    stopRing();
    if (buzzTimeoutRef.current) { clearTimeout(buzzTimeoutRef.current); buzzTimeoutRef.current = null; }
  }, [ackBuzz, stopRing]);

  // ── Notification dispatcher ────────────────────────────────────────────────
  // Sound: always.
  // OS notification: when tab is hidden.
  // Toast: when tab is visible but user is NOT on /messages (Messages.js handles in-page toasts).
  const fireNotification = useCallback((title, body, onNavigate) => {
    playPing();
    if (document.visibilityState !== 'visible') {
      if (Notification.permission === 'granted') {
        const n = new Notification(title, { body, icon: '/logo192.png', tag: 'chat-msg' });
        n.onclick = () => { window.focus(); onNavigate?.(); n.close(); };
      }
    } else if (window.location.pathname !== '/messages') {
      toast(title, {
        description: body,
        action: { label: 'View', onClick: () => onNavigate?.() },
        duration: 6000,
      });
    }
  }, [playPing]);

  // ── Central WS message handler ─────────────────────────────────────────────
  const handleWsData = useCallback((data) => {
    const me = userRef.current;
    // Forward to Messages.js for state updates + in-page toasts
    messageHandlerRef.current?.(data);

    switch (data.type) {
      case 'dm_message': {
        const msg = data.message;
        if (msg.sender_id === me?.user_id) break;
        setTotalUnread(n => n + 1);
        const preview = msg.content || (msg.attachments?.length ? '📎 Attachment' : '');
        fireNotification(`💬 ${msg.sender_name}`, preview, () => navigate('/messages'));
        break;
      }
      case 'channel_message': {
        const msg = data.message;
        if (msg.sender_id === me?.user_id) break;
        setTotalUnread(n => n + 1);
        const chName = data.channel_name || 'Channel';
        fireNotification(`# ${chName}`, `${msg.sender_name}: ${msg.content || '📎'}`, () => navigate('/messages'));
        break;
      }
      case 'thread_reply': {
        const reply = data.message;
        if (reply.sender_id === me?.user_id) break;
        const isParent = data.parent_sender_id === me?.user_id;
        const participated = threadParticipationsRef.current.has(`${reply.channel_id}:${reply.thread_root_id}`);
        if (!isParent && !participated) break;
        fireNotification(`↩ ${reply.sender_name} replied`, reply.content || '📎 Attachment', () => navigate('/messages'));
        break;
      }
      case 'buzz': {
        if (data.from_id === me?.user_id) break;
        stopRing();
        if (buzzTimeoutRef.current) clearTimeout(buzzTimeoutRef.current);
        setIncomingBuzz(data);
        startRing();
        const where = data.scope === 'channel' ? `# ${data.channel_name}` : 'Direct message';
        if (document.visibilityState !== 'visible' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const n = new Notification(`📞 ${data.from_name} is buzzing`, { body: where, icon: '/logo192.png', tag: 'chat-buzz', requireInteraction: true });
            n.onclick = () => { window.focus(); n.close(); };
          } catch { /* ignore */ }
        }
        buzzTimeoutRef.current = setTimeout(() => {
          stopRing();
          setIncomingBuzz(null);
          buzzTimeoutRef.current = null;
          toast(`📞 Missed buzz from ${data.from_name}`, { description: where, duration: 8000 });
        }, 30000);
        break;
      }
      case 'buzz_ack': {
        if (data.action === 'answered') toast(`✅ ${data.by_name} answered your buzz`, { duration: 5000 });
        else toast(`🚫 ${data.by_name} declined your buzz`, { duration: 5000 });
        break;
      }
      case 'reaction': {
        const n = data.notify;
        if (!n || n.by_id === me?.user_id) break; // only status reactions (✅/⏳/❌), not your own
        const isOwner = n.owner_id && n.owner_id === me?.user_id;
        setTotalUnread(x => x + 1);
        const label = n.state ? n.state.charAt(0).toUpperCase() + n.state.slice(1) : n.emoji;
        const title = isOwner
          ? `${n.emoji} Your transaction — ${label}`
          : (data.channel_name ? `# ${data.channel_name}` : '💬 Reaction');
        const body = `${n.by} marked ${n.ref ? n.ref + ' ' : ''}${label} ${n.emoji}`;
        fireNotification(title, body, () => navigate('/messages'));
        break;
      }
      default: break;
    }
  }, [fireNotification, navigate, startRing, stopRing]);

  // ── WebSocket (single global connection) ───────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    if (Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    let ws;
    let reconnectTimer;
    let pingInterval;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      const wsBase = (process.env.REACT_APP_BACKEND_URL || '').replace(/^http/, 'ws');
      ws = new WebSocket(`${wsBase}/api/ws?token=${encodeURIComponent(token)}`);
      ws.onmessage = (e) => {
        if (e.data === 'pong') return;
        try { handleWsData(JSON.parse(e.data)); } catch { /* malformed frame */ }
      };
      ws.onclose = () => { if (!destroyed) reconnectTimer = setTimeout(connect, 3000); };
      ws.onerror = () => ws.close();
    };

    connect();
    pingInterval = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) ws.send('ping');
    }, 25000);

    return () => {
      destroyed = true;
      clearTimeout(reconnectTimer);
      clearInterval(pingInterval);
      ws?.close();
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Public API ─────────────────────────────────────────────────────────────
  const toggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      localStorage.setItem('msg_sound', next ? 'true' : 'false');
      return next;
    });
  }, []);

  // Called by Messages.js in its render body (not inside useEffect) so the
  // registered handler always reflects the latest closure / state.
  const registerHandler = useCallback((fn) => {
    messageHandlerRef.current = fn;
  }, []);

  // Called after sending a thread reply so future replies to that thread notify us.
  const trackThreadParticipation = useCallback((channelId, parentMsgId) => {
    threadParticipationsRef.current.add(`${channelId}:${parentMsgId}`);
  }, []);

  const hasParticipated = useCallback((channelId, parentMsgId) => {
    return threadParticipationsRef.current.has(`${channelId}:${parentMsgId}`);
  }, []);

  const resetUnread = useCallback((count = 0) => setTotalUnread(count), []);

  return (
    <ChatNotificationContext.Provider value={{
      totalUnread, setTotalUnread, resetUnread,
      soundEnabled, toggleSound,
      registerHandler, trackThreadParticipation, hasParticipated,
    }}>
      {children}
      {incomingBuzz && (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-6 px-4 pointer-events-none">
          <div className="pointer-events-auto w-full max-w-sm rounded-2xl border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 pt-4">
              <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center animate-pulse shrink-0">
                <span className="text-xl">📞</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground leading-tight truncate">{incomingBuzz.from_name} is buzzing…</p>
                <p className="text-xs text-muted-foreground truncate">{incomingBuzz.scope === 'channel' ? `# ${incomingBuzz.channel_name}` : 'Direct message'}</p>
              </div>
            </div>
            {incomingBuzz.reason && <p className="px-4 pt-2 text-sm text-muted-foreground italic break-words">"{incomingBuzz.reason}"</p>}
            <div className="flex gap-2 p-4">
              <button onClick={declineBuzz} className="flex-1 h-9 rounded-lg bg-muted text-muted-foreground text-sm font-medium hover:bg-muted/80 transition-colors">Decline</button>
              <button onClick={answerBuzz} className="flex-1 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors">Answer</button>
            </div>
          </div>
        </div>
      )}
    </ChatNotificationContext.Provider>
  );
}

export function useChatNotification() {
  return useContext(ChatNotificationContext);
}
