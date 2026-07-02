import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';

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
      default: break;
    }
  }, [fireNotification, navigate]);

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
    </ChatNotificationContext.Provider>
  );
}

export function useChatNotification() {
  return useContext(ChatNotificationContext);
}
