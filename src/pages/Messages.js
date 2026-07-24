import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Textarea } from '../components/ui/textarea';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';
import { getApiError } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import {
  MessageSquare, Send, Users, User, Search, Plus, Check, CheckCheck,
  Loader2, Paperclip, X, FileText, Image as ImageIcon, FileSpreadsheet, File,
  Hash, MessageCircle, ChevronRight, Video, ZoomIn, PanelRightOpen, Settings, Trash2,
  Bell, BellOff, BellRing, Maximize2, Pencil, Search as SearchIcon, PhoneCall,
} from 'lucide-react';
import { useChatNotification } from '../context/ChatNotificationContext';
import { usePermissions } from '../context/usePermissions';
import EmojiPicker from 'emoji-picker-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Status badge for auto-posted transaction cards — reflects the furthest state reached.
function TxBadge({ msg }) {
  const st = msg.tx_status;
  let label = '⏳ Pending', cls = 'bg-amber-100 text-amber-700';
  if (st === 'rejected') { label = '❌ Rejected'; cls = 'bg-red-100 text-red-700'; }
  else if (st === 'completed' || msg.tx_completed_by) { label = '✅ Completed'; cls = 'bg-emerald-100 text-emerald-700'; }
  else if (st === 'approved') { label = '✅ Approved'; cls = 'bg-green-100 text-green-700'; }
  else if (msg.tx_processed_by) { label = '⚙️ Processing'; cls = 'bg-blue-100 text-blue-700'; }
  return <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${cls}`}>{label}</span>;
}

// Reaction chips — shown ABOVE the message; click a chip to toggle your reaction.
function ReactionChips({ reactions, onReact, currentUserId }) {
  const entries = Object.entries(reactions || {}).filter(([, arr]) => (arr || []).length);
  if (!entries.length) return null;
  return (
    <div className="flex items-center gap-1 mb-1 flex-wrap">
      {entries.map(([emoji, arr]) => {
        const mine = (arr || []).some(r => r.user_id === currentUserId);
        return (
          <button key={emoji} type="button" onClick={() => onReact(emoji)}
            title={(arr || []).map(r => r.name).filter(Boolean).join(', ')}
            className={`text-[11px] px-1.5 py-0.5 rounded-full border transition-colors ${mine
              ? 'bg-primary/20 border-primary/40 text-primary'
              : 'bg-muted border-border text-muted-foreground hover:bg-muted/70'}`}>
            {emoji} {(arr || []).length}
          </button>
        );
      })}
    </div>
  );
}

// Single "add reaction" button — shown BELOW the message; opens the full emoji picker.
function ReactionAdder({ onReact }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="relative mt-0.5 clear-both">
      <button type="button" title="Add reaction" onClick={() => setPickerOpen(o => !o)}
        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border border-border hover:bg-muted rounded-full px-2 py-0.5">
        <span className="text-[13px] leading-none">🙂</span> React
      </button>
      {pickerOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPickerOpen(false)} />
          <div className="absolute bottom-8 left-0 z-50">
            <EmojiPicker onEmojiClick={(ed) => { onReact(ed.emoji); setPickerOpen(false); }}
              theme="auto" lazyLoadEmojis width={300} height={380}
              previewConfig={{ showPreview: false }} skinTonesDisabled />
          </div>
        </>
      )}
    </div>
  );
}

// Status tags for workflow channels (e.g. #scalping-check). Rendered as colored
// pills like TxBadge; multiple can be active at once.
const TAG_CHANNELS = ['scalping-check'];
const TAG_META = [
  { key: 'Approved',  icon: '✅', cls: 'bg-emerald-100 text-emerald-700' },
  { key: 'Processed', icon: '⚙️', cls: 'bg-blue-100 text-blue-700' },
  { key: 'Hold',      icon: '✋', cls: 'bg-amber-100 text-amber-700' },
  { key: 'Rejected',  icon: '❌', cls: 'bg-red-100 text-red-700' },
  { key: 'Pending',   icon: '⏳', cls: 'bg-slate-100 text-slate-600' },
  { key: 'Query',     icon: '❓', cls: 'bg-purple-100 text-purple-700' },
];

// Active tag pills — shown ABOVE the message (styled like the status badge). Only the
// user who ADDED a tag can remove it; for everyone else the pill is read-only (locked).
function TagChips({ tags, onTag, currentUserId }) {
  const active = TAG_META.filter(t => tags && tags[t.key]);
  if (!active.length) return null;
  return (
    <div className="flex items-center gap-1 mb-1 flex-wrap">
      {active.map(t => {
        const meta = tags[t.key] || {};
        const by = meta.by;
        const mine = !meta.by_id || meta.by_id === currentUserId; // legacy tags stay editable
        if (!mine) {
          return (
            <span key={t.key}
              title={`${t.key}${by ? ' — by ' + by : ''} · only ${by || 'the tagger'} can change this`}
              className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${t.cls} opacity-90 cursor-default inline-flex items-center gap-0.5`}>
              {t.icon} {t.key} <span className="text-[9px] opacity-70">🔒</span>
            </span>
          );
        }
        return (
          <button key={t.key} type="button" onClick={() => onTag(t.key)}
            title={`${t.key}${by ? ' — by ' + by : ''} · click to remove`}
            className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${t.cls} hover:opacity-75 transition-opacity`}>
            {t.icon} {t.key}
          </button>
        );
      })}
    </div>
  );
}

// "Tag" button — shown BELOW the message; opens a menu of all status tags (multi-select
// toggle). A tag set by someone else is locked (can't be toggled off by others).
function TagBar({ tags, onTag, currentUserId }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative mt-0.5 inline-block clear-both align-top">
      <button type="button" title="Set status tags" onClick={() => setOpen(o => !o)}
        className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground border border-border hover:bg-muted rounded-full px-2 py-0.5">
        <span className="text-[13px] leading-none">🏷</span> Tag
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-8 left-0 z-50 bg-card border border-border rounded-lg shadow-lg p-1.5 flex flex-col gap-1 w-40">
            {TAG_META.map(t => {
              const meta = (tags && tags[t.key]) || null;
              const on = !!meta;
              const lockedByOther = on && meta.by_id && meta.by_id !== currentUserId;
              return (
                <button key={t.key} type="button" disabled={lockedByOther}
                  onClick={() => { if (!lockedByOther) onTag(t.key); }}
                  title={lockedByOther ? `Set by ${meta.by || 'someone else'} — only they can change it` : undefined}
                  className={`flex items-center justify-between text-[12px] font-semibold px-2 py-1 rounded-md transition-colors ${on ? t.cls : 'text-muted-foreground hover:bg-muted'} ${lockedByOther ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <span>{t.icon} {t.key}</span>
                  {on && <span className="text-[11px] leading-none">{lockedByOther ? '🔒' : '✓'}</span>}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// Nudge shown inside Messages when browser notifications aren't enabled yet.
function NotifyBanner({ onEnable }) {
  const [perm, setPerm] = useState(() => ('Notification' in window) ? Notification.permission : 'unsupported');
  useEffect(() => {
    const check = () => { if ('Notification' in window) setPerm(Notification.permission); };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => { window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, []);
  if (perm === 'granted' || perm === 'unsupported') return null;
  const blocked = perm === 'denied';
  const enable = async () => {
    if (perm === 'default') { try { setPerm(await Notification.requestPermission()); } catch { /* */ } }
    onEnable?.();
  };
  return (
    <div className={`shrink-0 mb-3 flex items-center gap-3 rounded-lg border px-3 py-2 text-sm ${blocked ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
      <span className="text-lg leading-none">🔔</span>
      <span className="flex-1">
        {blocked
          ? 'Notifications are blocked. Enable them for this site in your browser settings (address-bar 🔒/ⓘ → Notifications → Allow) to get message alerts.'
          : 'Turn on browser notifications so you never miss a new message.'}
      </span>
      {!blocked && (
        <button onClick={enable} className="shrink-0 rounded-md bg-amber-600 text-white text-xs font-semibold px-3 py-1.5 hover:bg-amber-700">
          Turn on
        </button>
      )}
    </div>
  );
}

export default function Messages({ fullscreen = false }) {
  const { user, getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);

  // DM state
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);
  const [newChatDialog, setNewChatDialog] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState('');

  // Admin state
  const [viewMode, setViewMode] = useState('my');
  const [allConversations, setAllConversations] = useState([]);
  const [selectedAllConversation, setSelectedAllConversation] = useState(null);
  const [allMessages, setAllMessages] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Channel state
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelMessages, setChannelMessages] = useState([]);
  // Message edit / in-chat search + filter
  const [editingId, setEditingId] = useState(null);   // message_id (DM) or msg_id (channel)
  const [editText, setEditText] = useState('');
  const [msgSearch, setMsgSearch] = useState('');
  const [msgFilter, setMsgFilter] = useState('all');  // all | media | links
  const [msgDateFrom, setMsgDateFrom] = useState('');  // YYYY-MM-DD (IST)
  const [msgDateTo, setMsgDateTo] = useState('');
  const [activeSection, setActiveSection] = useState('dm');
  const [channelMsg, setChannelMsg] = useState('');
  const [channelFiles, setChannelFiles] = useState([]);
  const [sendingChannel, setSendingChannel] = useState(false);
  const channelFileInputRef = useRef(null);
  const channelTextareaRef = useRef(null);

  // Thread state
  const [threadMsg, setThreadMsg] = useState(null);
  const [threadReplies, setThreadReplies] = useState([]);
  const [threadText, setThreadText] = useState('');
  const [threadFiles, setThreadFiles] = useState([]);
  const [sendingThread, setSendingThread] = useState(false);
  const threadFileInputRef = useRef(null);
  const threadTextareaRef = useRef(null);

  // Channel dialog
  const [newChannelDialog, setNewChannelDialog] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [channelMembers, setChannelMembers] = useState([]);
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Edit channel dialog
  const [editChannelDialog, setEditChannelDialog] = useState(false);
  const [editChannelName, setEditChannelName] = useState('');
  const [editChannelDesc, setEditChannelDesc] = useState('');
  const [editChannelMembers, setEditChannelMembers] = useState([]);
  const [savingChannel, setSavingChannel] = useState(false);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Scroll refs
  const dmScrollRef = useRef(null);
  const channelScrollRef = useRef(null);
  const [highlightMsgId, setHighlightMsgId] = useState(null);  // briefly flash a message when its thread is opened
  const threadScrollRef = useRef(null);
  const atDmBottomRef = useRef(true);
  const atChannelBottomRef = useRef(true);

  // Stable refs so WS handlers always see fresh selected state
  const selectedConvRef = useRef(null);
  const selectedChannelRef = useRef(null);
  const threadMsgRef = useRef(null);

  useEffect(() => { selectedConvRef.current = selectedConversation; }, [selectedConversation]);
  useEffect(() => { selectedChannelRef.current = selectedChannel; }, [selectedChannel]);
  useEffect(() => { threadMsgRef.current = threadMsg; }, [threadMsg]);

  // Send a buzz ("missed-call" ring) to a channel's members or a DM peer
  const sendBuzz = async (scope, id, label) => {
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const url = scope === 'channel'
        ? `${API_URL}/api/channels/${id}/buzz`
        : `${API_URL}/api/messages/${id}/buzz`;
      const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify({}) });
      if (r.ok) toast.success(`📞 Buzzing ${label}…`);
      else if (r.status === 429) toast.error((await r.json().catch(() => ({})))?.detail || 'Please wait before buzzing again');
      else toast.error('Could not send buzz');
    } catch { toast.error('Could not send buzz'); }
  };

  // Deep-link from a buzz "Answer": ?open=channel:<id> or ?open=dm:<peerId>
  const consumedOpenRef = useRef(false);
  // Message a notification click asked us to land on, applied once it has rendered.
  const pendingJumpRef = useRef(null);
  useEffect(() => {
    if (consumedOpenRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const open = params.get('open');
    if (!open) return;
    // `open` is kind:id[:msg_id] — the optional third part is the message a
    // notification click wants us to land on.
    const [kind, id, targetMsgId] = open.split(':');
    const wantThread = params.get('thread') === '1';
    let done = false;
    if (kind === 'channel') {
      const ch = channels.find(c => c.channel_id === id);
      if (ch) { setSelectedChannel(ch); setActiveSection('channels'); setSelectedConversation(null); setThreadMsg(null); done = true; }
    } else if (kind === 'dm') {
      const conv = conversations.find(c => c.user_id === id) || users.find(u => u.user_id === id);
      if (conv) { setSelectedConversation({ user_id: conv.user_id, name: conv.name, email: conv.email, role: conv.role }); setActiveSection('dm'); setSelectedChannel(null); setThreadMsg(null); done = true; }
    }
    if (done) {
      consumedOpenRef.current = true;
      // Messages load right after the channel/DM is selected, so defer the jump
      // until the target row actually exists in the DOM.
      if (targetMsgId && kind === 'channel') {
        pendingJumpRef.current = { msgId: targetMsgId, thread: wantThread, tries: 0 };
      }
      params.delete('open');
      params.delete('thread');
      const qs = params.toString();
      window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channels, conversations, users]);

  const { registerHandler, soundEnabled, toggleSound, testNotification, trackThreadParticipation, hasParticipated, resetUnread } = useChatNotification();

  // Clear handler on unmount so context doesn't call into a dead component
  useEffect(() => () => registerHandler(null), [registerHandler]);

  const isAdmin = user?.role === 'admin';
  // The Process button follows the permission the backend actually enforces
  // (transaction_requests:approve), not the raw admin role — otherwise everyone
  // else who is allowed to process withdrawals never sees the button.
  const { canApprove } = usePermissions();
  const navigate = useNavigate();

  // ── Helpers ────────────────────────────────────────────────────────────────
  // All chat times are shown in IST (Asia/Kolkata)
  const IST = 'Asia/Kolkata';
  const formatTime = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const now = new Date();
    const diff = Math.floor((now - dt) / 86400000);
    if (diff === 0) return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: IST });
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return dt.toLocaleDateString('en-US', { weekday: 'short', timeZone: IST });
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: IST });
  };

  const formatFullTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: IST });
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: IST });
  };

  // Compact IST date for the narrow grouped-message gutter: "17 Jul"
  const formatShortDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: IST });
  };

  // Full IST date + time (for tooltips): "11 Jul 2026, 08:46 PM IST"
  const formatISTFull = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true, timeZone: IST,
    }) + ' IST';
  };

  const getDateLabel = (d) => {
    const dt = new Date(d);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (dt.toDateString() === today.toDateString()) return 'Today';
    if (dt.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  // ── Edit / delete message handlers ─────────────────────────────────────────
  const startEdit = (id, content) => { setEditingId(id); setEditText(content || ''); };
  const cancelEdit = () => { setEditingId(null); setEditText(''); };

  const saveEditDM = async (message_id) => {
    const content = editText.trim();
    try {
      const r = await fetch(`${API_URL}/api/messages/${message_id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (r.ok) {
        const u = await r.json();
        setMessages(prev => prev.map(m => m.message_id === message_id ? u : m));
        cancelEdit();
      } else { toast.error((await r.json().catch(() => ({})))?.detail || 'Edit failed'); }
    } catch { toast.error('Edit failed'); }
  };

  const deleteDM = async (message_id) => {
    if (!window.confirm('Delete this message?')) return;
    try {
      const r = await fetch(`${API_URL}/api/messages/${message_id}`, {
        method: 'DELETE', headers: getAuthHeaders(), credentials: 'include',
      });
      if (r.ok) setMessages(prev => prev.map(m => m.message_id === message_id ? { ...m, deleted: true, content: '', attachment: null } : m));
      else toast.error('Delete failed');
    } catch { toast.error('Delete failed'); }
  };

  const saveEditChannel = async (msg_id) => {
    const content = editText.trim();
    if (!selectedChannel) return;
    try {
      const r = await fetch(`${API_URL}/api/channels/${selectedChannel.channel_id}/messages/${msg_id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (r.ok) {
        const u = await r.json();
        setChannelMessages(prev => prev.map(m => m.msg_id === msg_id ? { ...m, ...u } : m));
        cancelEdit();
      } else { toast.error((await r.json().catch(() => ({})))?.detail || 'Edit failed'); }
    } catch { toast.error('Edit failed'); }
  };

  const deleteChannelMsg = async (msg_id) => {
    if (!selectedChannel || !window.confirm('Delete this message?')) return;
    try {
      const r = await fetch(`${API_URL}/api/channels/${selectedChannel.channel_id}/messages/${msg_id}`, {
        method: 'DELETE', headers: getAuthHeaders(), credentials: 'include',
      });
      if (r.ok) setChannelMessages(prev => prev.map(m => m.msg_id === msg_id ? { ...m, deleted: true, content: '', attachments: [] } : m));
      else toast.error('Delete failed');
    } catch { toast.error('Delete failed'); }
  };

  const saveEditReply = async (msg_id) => {
    const content = editText.trim();
    if (!selectedChannel) return;
    try {
      const r = await fetch(`${API_URL}/api/channels/${selectedChannel.channel_id}/messages/${msg_id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ content }),
      });
      if (r.ok) {
        const u = await r.json();
        setThreadReplies(prev => prev.map(m => m.msg_id === msg_id ? { ...m, ...u } : m));
        cancelEdit();
      } else { toast.error((await r.json().catch(() => ({})))?.detail || 'Edit failed'); }
    } catch { toast.error('Edit failed'); }
  };

  const deleteReply = async (msg_id) => {
    if (!selectedChannel || !window.confirm('Delete this reply?')) return;
    try {
      const r = await fetch(`${API_URL}/api/channels/${selectedChannel.channel_id}/messages/${msg_id}`, {
        method: 'DELETE', headers: getAuthHeaders(), credentials: 'include',
      });
      if (r.ok) setThreadReplies(prev => prev.map(m => m.msg_id === msg_id ? { ...m, deleted: true, content: '', attachments: [] } : m));
      else toast.error('Delete failed');
    } catch { toast.error('Delete failed'); }
  };

  // In-chat search + filter predicate
  const msgMatches = (m) => {
    if (msgFilter === 'media' && !(m.attachment || (m.attachments && m.attachments.length))) return false;
    if (msgFilter === 'links' && !/https?:\/\//i.test(m.content || '')) return false;
    if (msgSearch && !((m.content || '').toLowerCase().includes(msgSearch.toLowerCase()))) return false;
    if (msgDateFrom || msgDateTo) {
      // Compare on the IST calendar day so it matches the timestamps shown in chat
      const day = m.created_at ? new Date(m.created_at).toLocaleDateString('en-CA', { timeZone: IST }) : '';
      if (msgDateFrom && day < msgDateFrom) return false;
      if (msgDateTo && day > msgDateTo) return false;
    }
    return true;
  };

  const getInitials = (n) => !n ? '?' : n.split(' ').map(s => s[0]).join('').toUpperCase().slice(0, 2);

  const formatFileSize = (b) => {
    if (!b) return '';
    if (b < 1024) return `${b} B`;
    if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / 1048576).toFixed(1)} MB`;
  };

  const isImage = (fn, ct) => {
    const ext = (fn || '').split('.').pop().toLowerCase();
    return (ct || '').startsWith('image/') || ['jpg','jpeg','png','gif','webp'].includes(ext);
  };
  const isVideo = (fn, ct) => {
    const ext = (fn || '').split('.').pop().toLowerCase();
    return (ct || '').startsWith('video/') || ['mp4','mov','webm','avi'].includes(ext);
  };
  const getFileIcon = (fn, ct) => {
    const ext = (fn || '').split('.').pop().toLowerCase();
    if (isImage(fn, ct)) return <ImageIcon className="w-4 h-4 text-green-500" />;
    if (isVideo(fn, ct)) return <Video className="w-4 h-4 text-purple-500" />;
    if (ext === 'pdf' || ct === 'application/pdf') return <FileText className="w-4 h-4 text-red-400" />;
    if (['xlsx','xls','csv'].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    return <File className="w-4 h-4 text-muted-foreground/60" />;
  };

  // Approve / reject a pending transaction straight from its #deposite_only/#withdraw_only card
  const handleTxComplete = async (msg) => {
    const note = window.prompt('Add a completion note (optional):');
    if (note === null) return;
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const r = await fetch(`${API_URL}/api/chat/tx-complete`, {
        method: 'POST', headers,
        body: JSON.stringify({ request_id: msg.tx_request_id, note: note || '' }),
      });
      if (r.ok) toast.success('✅ Marked complete');
      else toast.error((await r.json().catch(() => ({})))?.detail || 'Could not complete');
    } catch { toast.error('Could not complete'); }
  };

  // Toggle an emoji reaction on a message (channel or DM); the server bumps it to the latest.
  const handleReact = async (msg, emoji, scope) => {
    try {
      const url = scope === 'channel'
        ? `${API_URL}/api/channels/${selectedChannel?.channel_id}/messages/${msg.msg_id}/react`
        : `${API_URL}/api/messages/${msg.message_id}/react`;
      const r = await fetch(url, {
        method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });
      if (!r.ok) return;
      const data = await r.json();
      if (scope === 'channel') {
        setChannelMessages(prev => prev.map(m =>
          m.msg_id === msg.msg_id ? { ...m, reactions: data.reactions } : m));
        setThreadReplies(prev => prev.map(m =>
          m.msg_id === msg.msg_id ? { ...m, reactions: data.reactions } : m));
      } else {
        setMessages(prev => prev.map(m =>
          m.message_id === msg.message_id ? { ...m, reactions: data.reactions } : m));
      }
    } catch { /* */ }
  };

  // Toggle a status tag on a channel message (scalping-check workflow); syncs live to all viewers.
  const handleTag = async (msg, tag) => {
    try {
      const r = await fetch(`${API_URL}/api/channels/${selectedChannel?.channel_id}/messages/${msg.msg_id}/tag`, {
        method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag }),
      });
      if (!r.ok) return;
      const data = await r.json();
      setChannelMessages(prev => prev.map(m => m.msg_id === msg.msg_id ? { ...m, tags: data.tags } : m));
      setThreadReplies(prev => prev.map(m => m.msg_id === msg.msg_id ? { ...m, tags: data.tags } : m));
      setThreadMsg(prev => (prev && prev.msg_id === msg.msg_id) ? { ...prev, tags: data.tags } : prev);
    } catch { /* */ }
  };

  // Scroll the main channel list to a message and briefly flash it (used when opening its thread).
  const scrollToChannelMessage = (msgId) => {
    setHighlightMsgId(msgId);
    setTimeout(() => {
      document.getElementById(`chmsg-${msgId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 60);
    setTimeout(() => setHighlightMsgId(cur => (cur === msgId ? null : cur)), 2400);
  };

  // Open a channel message from elsewhere (e.g. clicking a reply-DM bubble): switch to
  // the channel, scroll to the message and open its thread. Reuses pendingJumpRef so the
  // jump waits for the channel's messages to load.
  const jumpToChannelMessage = (channelId, msgId, thread) => {
    const ch = channels.find(c => c.channel_id === channelId);
    if (!ch) { toast.error('Channel not found'); return; }
    setActiveSection('channels');
    setSelectedConversation(null);
    setThreadMsg(null);
    if (selectedChannel?.channel_id === channelId) {
      // Already on this channel — messages are loaded, so jump straight away.
      scrollToChannelMessage(msgId);
      if (thread) {
        const target = channelMessages.find(m => m.msg_id === msgId);
        if (target) { setThreadMsg(target); fetchThreadReplies(channelId, msgId); }
      }
    } else {
      setSelectedChannel(ch);
      pendingJumpRef.current = { msgId, thread: !!thread, tries: 0 };
    }
  };

  // Land on the message a notification click targeted. The channel's messages arrive
  // asynchronously, so retry briefly until the row exists rather than firing blindly.
  useEffect(() => {
    const jump = pendingJumpRef.current;
    if (!jump || !channelMessages.length) return;
    const target = channelMessages.find(m => m.msg_id === jump.msgId);
    if (!target) {
      // Not in the loaded window (older message) — give up quietly after a few tries.
      jump.tries += 1;
      if (jump.tries > 5) pendingJumpRef.current = null;
      return;
    }
    pendingJumpRef.current = null;
    scrollToChannelMessage(jump.msgId);
    if (jump.thread && selectedChannel) {
      setThreadMsg(target);
      fetchThreadReplies(selectedChannel.channel_id, jump.msgId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelMessages, selectedChannel]);

  // Process a withdrawal request from its #withdraw_only card (captcha-gated, really processes it)
  const handleTxProcess = async (msg) => {
    const a = Math.floor(Math.random() * 8) + 2, b = Math.floor(Math.random() * 8) + 2;
    const ans = window.prompt(`Confirm processing — what is ${a} + ${b}?`);
    if (ans === null) return;
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const r = await fetch(`${API_URL}/api/transaction-requests/${msg.tx_request_id}/process`, {
        method: 'POST', headers,
        body: JSON.stringify({ captcha_answer: ans, captcha_expected: String(a + b) }),
      });
      if (r.ok) toast.success('🟢 Request processed');
      else toast.error((await r.json().catch(() => ({})))?.detail || 'Could not process');
    } catch { toast.error('Could not process'); }
  };

  const renderAttachments = (attachments, isSelf) => {
    if (!attachments?.length) return null;
    const imgs = attachments.filter(a => isImage(a.filename, a.content_type));
    const vids = attachments.filter(a => !isImage(a.filename, a.content_type) && isVideo(a.filename, a.content_type));
    const others = attachments.filter(a => !isImage(a.filename, a.content_type) && !isVideo(a.filename, a.content_type));
    return (
      <div className="mt-1.5 space-y-1.5">
        {imgs.length > 0 && (
          <div className={`grid gap-1 ${imgs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`} style={{ maxWidth: 280 }}>
            {imgs.map((img, i) => (
              <div key={i} className="relative group cursor-pointer rounded-lg overflow-hidden" onClick={() => setLightboxUrl(img.url)}>
                <img src={img.url} alt={img.filename} className="w-full object-cover" style={{ maxHeight: 180 }} />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <ZoomIn className="w-6 h-6 text-white drop-shadow" />
                </div>
              </div>
            ))}
          </div>
        )}
        {vids.map((v, i) => (
          <video key={i} src={v.url} controls className="rounded-lg w-full" style={{ maxWidth: 280, maxHeight: 180 }} />
        ))}
        {others.map((f, i) => (
          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-2 p-2 rounded-lg ${isSelf ? 'bg-primary/20 hover:bg-primary/30' : 'bg-muted hover:bg-muted/80'}`}>
            {getFileIcon(f.filename, f.content_type)}
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{f.filename}</p>
              <p className={`text-xs ${isSelf ? 'text-primary/60' : 'text-muted-foreground/60'}`}>{formatFileSize(f.size)}</p>
            </div>
          </a>
        ))}
      </div>
    );
  };

  // Scroll helpers
  const scrollToBottom = (ref, instant = false) => {
    const el = ref.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const handleDmScroll = () => {
    const el = dmScrollRef.current;
    if (!el) return;
    atDmBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };
  const handleChannelScroll = () => {
    const el = channelScrollRef.current;
    if (!el) return;
    atChannelBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // ── Register WS handler with global context (reassigned each render for fresh closure) ──
  registerHandler((data) => {
    switch (data.type) {
      case 'dm_message': {
        const msg = data.message;
        const otherId = msg.sender_id === user?.user_id ? msg.recipient_id : msg.sender_id;
        if (selectedConvRef.current?.user_id === otherId) {
          setMessages(prev => prev.some(m => m.message_id === msg.message_id) ? prev : [...prev, msg]);
        } else if (msg.sender_id !== user?.user_id) {
          // In-page toast when on Messages page but viewing a different conversation
          const preview = msg.content || (msg.attachments?.length ? '📎 Attachment' : '');
          toast(`💬 ${msg.sender_name}`, {
            description: preview,
            action: {
              label: 'View',
              onClick: () => {
                const conv = conversations.find(c => c.user_id === otherId)
                  || { user_id: otherId, name: msg.sender_name, email: '', role: '' };
                setSelectedConversation(conv);
                setActiveSection('dm');
                setSelectedChannel(null);
                setThreadMsg(null);
              },
            },
            duration: 6000,
          });
        }
        setConversations(prev => {
          const exists = prev.some(c => c.user_id === otherId);
          const preview = msg.content || (msg.attachments?.length ? '📎 Attachment' : '');
          if (exists) {
            return prev.map(c => c.user_id === otherId ? {
              ...c,
              last_message: preview,
              unread_count: selectedConvRef.current?.user_id === otherId ? 0
                : (c.unread_count || 0) + (msg.sender_id === user?.user_id ? 0 : 1),
            } : c);
          }
          if (msg.sender_id !== user?.user_id) {
            return [{ user_id: msg.sender_id, name: msg.sender_name, email: '', role: '', last_message: preview, unread_count: 1 }, ...prev];
          }
          return prev;
        });
        break;
      }
      case 'dm_read': {
        if (selectedConvRef.current?.user_id === data.reader_id) {
          setMessages(prev => prev.map(m => ({ ...m, read: true })));
        }
        break;
      }
      case 'channel_message': {
        const msg = data.message;
        if (selectedChannelRef.current?.channel_id === msg.channel_id) {
          setChannelMessages(prev => prev.some(m => m.msg_id === msg.msg_id) ? prev : [...prev, msg]);
        } else if (msg.sender_id !== user?.user_id) {
          // In-page toast for a different channel
          const chName = data.channel_name || channels.find(c => c.channel_id === msg.channel_id)?.name || 'Channel';
          toast(`# ${chName}`, {
            description: `${msg.sender_name}: ${msg.content || '📎'}`,
            action: {
              label: 'View',
              onClick: () => {
                const ch = channels.find(c => c.channel_id === msg.channel_id);
                if (ch) { setSelectedChannel(ch); setActiveSection('channels'); setSelectedConversation(null); setThreadMsg(null); }
              },
            },
            duration: 6000,
          });
        }
        setChannels(prev => prev.map(ch => ch.channel_id === msg.channel_id ? {
          ...ch,
          last_message: msg.content || '📎 Media',
          unread_count: selectedChannelRef.current?.channel_id === msg.channel_id
            ? ch.unread_count
            : (ch.unread_count || 0) + (msg.sender_id === user?.user_id ? 0 : 1),
        } : ch));
        break;
      }
      case 'thread_reply': {
        const reply = data.message;
        if (threadMsgRef.current?.msg_id === reply.thread_root_id) {
          setThreadReplies(prev => prev.some(m => m.msg_id === reply.msg_id) ? prev : [...prev, reply]);
        }
        if (selectedChannelRef.current?.channel_id === reply.channel_id) {
          setChannelMessages(prev => prev.map(m => m.msg_id === reply.thread_root_id
            ? { ...m, reply_count: (m.reply_count || 0) + (prev.some(x => x.msg_id === reply.msg_id) ? 0 : 1) }
            : m));
        }
        // In-page toast if user is author or participated in this thread but not currently viewing it
        if (reply.sender_id !== user?.user_id) {
          const isParent = data.parent_sender_id === user?.user_id;
          const participated = hasParticipated(reply.channel_id, reply.thread_root_id);
          const threadOpen = threadMsgRef.current?.msg_id === reply.thread_root_id;
          if ((isParent || participated) && !threadOpen) {
            toast(`↩ ${reply.sender_name} replied in thread`, {
              description: reply.content || '📎',
              duration: 6000,
            });
          }
        }
        break;
      }
      case 'dm_edit':
      case 'dm_delete': {
        const m = data.message;
        setMessages(prev => prev.map(x => x.message_id === m.message_id ? m : x));
        break;
      }
      case 'channel_edit':
      case 'channel_delete': {
        const m = data.message;
        setChannelMessages(prev => prev.map(x => x.msg_id === m.msg_id ? { ...x, ...m } : x));
        setThreadReplies(prev => prev.map(x => x.msg_id === m.msg_id ? { ...x, ...m } : x));
        break;
      }
      case 'reaction': {
        if (data.scope === 'channel') {
          setChannelMessages(prev => prev.map(x => x.msg_id === data.msg_id
            ? { ...x, reactions: data.reactions } : x));
          setThreadReplies(prev => prev.map(x => x.msg_id === data.msg_id
            ? { ...x, reactions: data.reactions } : x));
        } else {
          setMessages(prev => prev.map(x => x.message_id === data.message_id
            ? { ...x, reactions: data.reactions } : x));
        }
        break;
      }
      case 'tag': {
        setChannelMessages(prev => prev.map(x => x.msg_id === data.msg_id
          ? { ...x, tags: data.tags } : x));
        setThreadReplies(prev => prev.map(x => x.msg_id === data.msg_id
          ? { ...x, tags: data.tags } : x));
        setThreadMsg(prev => (prev && prev.msg_id === data.msg_id)
          ? { ...prev, tags: data.tags } : prev);
        break;
      }
      default: break;
    }
  });

  // Auto-scroll when new messages arrive
  useEffect(() => {
    if (atDmBottomRef.current) scrollToBottom(dmScrollRef);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages]);

  useEffect(() => {
    if (atChannelBottomRef.current) scrollToBottom(channelScrollRef);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelMessages]);

  useEffect(() => {
    scrollToBottom(threadScrollRef);
  }, [threadReplies]);

  // ── Fetchers ────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try { const r = await fetch(`${API_URL}/api/messages/users`, { headers: getAuthHeaders() }); if (r.ok) setUsers(await r.json()); } catch { /* */ }
  }, [getAuthHeaders]);

  const fetchConversations = useCallback(async () => {
    try { const r = await fetch(`${API_URL}/api/messages/conversations`, { headers: getAuthHeaders() }); if (r.ok) setConversations(await r.json()); } catch { /* */ }
  }, [getAuthHeaders]);

  const fetchMessages = useCallback(async (recipientId) => {
    if (!recipientId) return;
    try {
      const r = await fetch(`${API_URL}/api/messages/conversation/${recipientId}`, { headers: getAuthHeaders() });
      if (r.ok) { setMessages(await r.json()); atDmBottomRef.current = true; setTimeout(() => scrollToBottom(dmScrollRef), 60); }
    } catch { /* */ }
  }, [getAuthHeaders]);

  const fetchAllConversations = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAll(true);
    try { const r = await fetch(`${API_URL}/api/messages/admin/all-conversations`, { headers: getAuthHeaders() }); if (r.ok) setAllConversations(await r.json()); } catch { /* */ } finally { setLoadingAll(false); }
  }, [getAuthHeaders, isAdmin]);

  const fetchConversationMessages = useCallback(async (u1, u2) => {
    if (!isAdmin) return;
    try { const r = await fetch(`${API_URL}/api/messages/admin/conversation/${u1}/${u2}`, { headers: getAuthHeaders() }); if (r.ok) setAllMessages(await r.json()); } catch { /* */ }
  }, [getAuthHeaders, isAdmin]);

  const markAsRead = useCallback(async (recipientId) => {
    try { await fetch(`${API_URL}/api/messages/mark-read/${recipientId}`, { method: 'PUT', headers: getAuthHeaders() }); } catch { /* */ }
  }, [getAuthHeaders]);

  const fetchChannels = useCallback(async () => {
    try { const r = await fetch(`${API_URL}/api/channels`, { headers: getAuthHeaders() }); if (r.ok) setChannels(await r.json()); } catch { /* */ }
  }, [getAuthHeaders]);

  const fetchChannelMessages = useCallback(async (channelId) => {
    if (!channelId) return;
    try {
      const r = await fetch(`${API_URL}/api/channels/${channelId}/messages`, { headers: getAuthHeaders() });
      if (r.ok) { setChannelMessages(await r.json()); atChannelBottomRef.current = true; setTimeout(() => scrollToBottom(channelScrollRef), 60); }
    } catch { /* */ }
  }, [getAuthHeaders]);

  const fetchThreadReplies = useCallback(async (channelId, msgId) => {
    if (!channelId || !msgId) return;
    try {
      const r = await fetch(`${API_URL}/api/channels/${channelId}/messages/${msgId}/replies`, { headers: getAuthHeaders() });
      if (r.ok) { setThreadReplies(await r.json()); setTimeout(() => scrollToBottom(threadScrollRef), 60); }
    } catch { /* */ }
  }, [getAuthHeaders]);

  const markChannelRead = useCallback(async (channelId) => {
    try {
      await fetch(`${API_URL}/api/channels/${channelId}/mark-read`, { method: 'PUT', headers: getAuthHeaders() });
      setChannels(prev => prev.map(ch => ch.channel_id === channelId ? { ...ch, unread_count: 0 } : ch));
    } catch { /* */ }
  }, [getAuthHeaders]);

  // ── Send handlers ──────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !selectedConversation) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('recipient_id', selectedConversation.user_id);
      fd.append('content', newMessage);
      if (attachment) fd.append('attachment', attachment);
      const headers = { ...getAuthHeaders() }; delete headers['Content-Type'];
      const r = await fetch(`${API_URL}/api/messages/send`, { method: 'POST', headers, body: fd });
      if (r.ok) {
        const msg = await r.json();
        setNewMessage(''); setAttachment(null);
        setMessages(prev => prev.some(m => m.message_id === msg.message_id) ? prev : [...prev, msg]);
        setConversations(prev => prev.map(c => c.user_id === selectedConversation.user_id
          ? { ...c, last_message: msg.content || '📎 Attachment' } : c));
      } else toast.error(await getApiError(r));
    } catch (e) { toast.error(e?.message || 'Something went wrong'); } finally { setSending(false); }
  };

  const handleSendChannelMessage = async () => {
    if ((!channelMsg.trim() && !channelFiles.length) || !selectedChannel) return;
    setSendingChannel(true);
    try {
      const fd = new FormData();
      fd.append('content', channelMsg);
      channelFiles.forEach(f => fd.append('files', f));
      const headers = { ...getAuthHeaders() }; delete headers['Content-Type'];
      const r = await fetch(`${API_URL}/api/channels/${selectedChannel.channel_id}/messages`, { method: 'POST', headers, body: fd });
      if (r.ok) {
        const msg = await r.json();
        setChannelMsg(''); setChannelFiles([]);
        if (channelTextareaRef.current) channelTextareaRef.current.style.height = 'auto';
        setChannelMessages(prev => prev.some(m => m.msg_id === msg.msg_id) ? prev : [...prev, msg]);
        setChannels(prev => prev.map(ch => ch.channel_id === selectedChannel.channel_id
          ? { ...ch, last_message: msg.content || '📎 Media', last_message_at: msg.created_at } : ch));
      } else toast.error(await getApiError(r));
    } catch (e) { toast.error(e?.message || 'Something went wrong'); } finally { setSendingChannel(false); }
  };

  const handleSendThreadReply = async () => {
    if ((!threadText.trim() && !threadFiles.length) || !threadMsg) return;
    setSendingThread(true);
    try {
      const fd = new FormData();
      fd.append('content', threadText);
      threadFiles.forEach(f => fd.append('files', f));
      const headers = { ...getAuthHeaders() }; delete headers['Content-Type'];
      const r = await fetch(`${API_URL}/api/channels/${selectedChannel.channel_id}/messages/${threadMsg.msg_id}/replies`, { method: 'POST', headers, body: fd });
      if (r.ok) {
        const reply = await r.json();
        setThreadText(''); setThreadFiles([]);
        if (threadTextareaRef.current) threadTextareaRef.current.style.height = 'auto';
        setThreadReplies(prev => prev.some(m => m.msg_id === reply.msg_id) ? prev : [...prev, reply]);
        setChannelMessages(prev => prev.map(m => m.msg_id === threadMsg.msg_id
          ? { ...m, reply_count: (m.reply_count || 0) + 1 } : m));
        trackThreadParticipation(selectedChannel.channel_id, threadMsg.msg_id);
      } else toast.error(await getApiError(r));
    } catch (e) { toast.error(e?.message || 'Something went wrong'); } finally { setSendingThread(false); }
  };

  const handleCreateChannel = async () => {
    if (!channelName.trim()) { toast.error('Channel name is required'); return; }
    setCreatingChannel(true);
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const r = await fetch(`${API_URL}/api/channels`, { method: 'POST', headers, body: JSON.stringify({ name: channelName.trim(), description: channelDesc, members: channelMembers }) });
      if (r.ok) {
        const ch = await r.json();
        setNewChannelDialog(false); setChannelName(''); setChannelDesc(''); setChannelMembers([]);
        await fetchChannels();
        setSelectedChannel(ch); setActiveSection('channels');
      } else toast.error(await getApiError(r));
    } catch (e) { toast.error(e?.message || 'Something went wrong'); } finally { setCreatingChannel(false); }
  };

  const openEditDialog = () => {
    if (!selectedChannel) return;
    setEditChannelName(selectedChannel.name || '');
    setEditChannelDesc(selectedChannel.description || '');
    setEditChannelMembers(selectedChannel.members || []);
    setEditChannelDialog(true);
  };

  const handleEditChannel = async () => {
    if (!editChannelName.trim()) { toast.error('Channel name is required'); return; }
    setSavingChannel(true);
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const r = await fetch(`${API_URL}/api/channels/${selectedChannel.channel_id}`, {
        method: 'PATCH', headers,
        body: JSON.stringify({ name: editChannelName.trim(), description: editChannelDesc, members: editChannelMembers }),
      });
      if (r.ok) {
        const updated = await r.json();
        setEditChannelDialog(false);
        setSelectedChannel(updated);
        setChannels(prev => prev.map(ch => ch.channel_id === updated.channel_id ? { ...ch, ...updated } : ch));
        toast.success('Channel updated');
      } else toast.error(await getApiError(r));
    } catch (e) { toast.error(e?.message || 'Something went wrong'); } finally { setSavingChannel(false); }
  };

  const handleDeleteChannel = async () => {
    if (!selectedChannel) return;
    if (!window.confirm(`Delete #${selectedChannel.name}? This cannot be undone.`)) return;
    try {
      const r = await fetch(`${API_URL}/api/channels/${selectedChannel.channel_id}`, { method: 'DELETE', headers: getAuthHeaders() });
      if (r.ok) {
        setEditChannelDialog(false);
        setSelectedChannel(null);
        setChannelMessages([]);
        setActiveSection('dm');
        setChannels(prev => prev.filter(ch => ch.channel_id !== selectedChannel.channel_id));
        toast.success('Channel deleted');
      } else toast.error(await getApiError(r));
    } catch (e) { toast.error(e?.message || 'Something went wrong'); }
  };

  // ── File handlers ──────────────────────────────────────────────────────────
  const handleDmFileSelect = (e) => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 10485760) { toast.error('File size exceeds 10MB limit'); return; }
    setAttachment(f); e.target.value = '';
  };
  const validateChannelFile = (f) => {
    const max = f.type?.startsWith('video/') ? 104857600 : 20971520;
    if (f.size > max) { toast.error(`${f.name} exceeds ${f.type?.startsWith('video/') ? '100MB' : '20MB'} limit`); return false; }
    return true;
  };
  const handleChannelFileSelect = (e) => {
    const files = Array.from(e.target.files || []).filter(validateChannelFile);
    setChannelFiles(prev => [...prev, ...files]); e.target.value = '';
  };
  const handleThreadFileSelect = (e) => {
    const files = Array.from(e.target.files || []).filter(validateChannelFile);
    setThreadFiles(prev => [...prev, ...files]); e.target.value = '';
  };
  const handleChannelPaste = useCallback((e) => {
    const items = e.clipboardData?.items || []; const pasted = [];
    for (const item of items) { if (item.kind === 'file') { const f = item.getAsFile(); if (f && validateChannelFile(f)) pasted.push(f); } }
    if (pasted.length) setChannelFiles(prev => [...prev, ...pasted]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const handleThreadPaste = useCallback((e) => {
    const items = e.clipboardData?.items || []; const pasted = [];
    for (const item of items) { if (item.kind === 'file') { const f = item.getAsFile(); if (f && validateChannelFile(f)) pasted.push(f); } }
    if (pasted.length) setThreadFiles(prev => [...prev, ...pasted]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartNewChat = () => {
    if (!selectedRecipient) { toast.error('Please select a user'); return; }
    const u = users.find(u => u.user_id === selectedRecipient);
    if (u) {
      setSelectedConversation({ user_id: u.user_id, name: u.name, email: u.email, role: u.role });
      setActiveSection('dm'); setSelectedChannel(null); setThreadMsg(null);
      setNewChatDialog(false); setSelectedRecipient('');
    }
  };

  // ── Effects ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchConversations(), fetchChannels()]);
      setLoading(false);
    };
    init();
  }, [fetchUsers, fetchConversations, fetchChannels]);

  useEffect(() => { if (viewMode === 'all' && isAdmin) fetchAllConversations(); }, [viewMode, isAdmin, fetchAllConversations]);
  useEffect(() => { if (selectedAllConversation && isAdmin) fetchConversationMessages(selectedAllConversation.user1_id, selectedAllConversation.user2_id); }, [selectedAllConversation, isAdmin, fetchConversationMessages]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.user_id);
      markAsRead(selectedConversation.user_id);
      setConversations(prev => prev.map(c => c.user_id === selectedConversation.user_id ? { ...c, unread_count: 0 } : c));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    setThreadMsg(null); setThreadReplies([]);
    if (selectedChannel) {
      fetchChannelMessages(selectedChannel.channel_id);
      markChannelRead(selectedChannel.channel_id);
    }
  }, [selectedChannel, fetchChannelMessages, markChannelRead]);

  useEffect(() => {
    if (threadMsg && selectedChannel) fetchThreadReplies(selectedChannel.channel_id, threadMsg.msg_id);
  }, [threadMsg, selectedChannel, fetchThreadReplies]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const filteredConversations = conversations.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAllConversations = allConversations.filter(c =>
    c.user1_name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.user2_name?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredChannels = channels.filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const groupedChannelMessages = channelMessages.map((msg, i) => {
    const prev = channelMessages[i - 1];
    const sameDay = prev && new Date(msg.created_at).toDateString() === new Date(prev.created_at).toDateString();
    const grouped = prev && prev.sender_id === msg.sender_id && sameDay
      && new Date(msg.created_at) - new Date(prev.created_at) < 300000;
    return { ...msg, isGrouped: !!grouped, showDateDivider: !sameDay };
  });

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // ── Sub-components ─────────────────────────────────────────────────────────
  const FilePreviewStrip = ({ files, onRemove }) => {
    if (!files.length) return null;
    return (
      <div className="flex flex-wrap gap-2 mb-2 p-2 bg-muted/50 rounded-lg border">
        {files.map((f, i) => (
          <div key={i} className="relative group">
            {isImage(f.name, f.type) ? (
              <div className="w-12 h-12 rounded overflow-hidden border">
                <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
              </div>
            ) : isVideo(f.name, f.type) ? (
              <div className="w-12 h-12 rounded bg-purple-50 border border-purple-200 flex items-center justify-center">
                <Video className="w-5 h-5 text-purple-500" />
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1.5 bg-white border rounded-lg max-w-[100px]">
                {getFileIcon(f.name, f.type)}
                <p className="text-xs truncate">{f.name}</p>
              </div>
            )}
            <button onClick={() => onRemove(i)}
              className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const DateDivider = ({ date }) => (
    <div className="flex items-center gap-3 my-4 px-4">
      <div className="flex-1 h-px bg-slate-200" />
      <span className="text-xs text-muted-foreground/60 font-medium whitespace-nowrap">{getDateLabel(date)}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
  );

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className={fullscreen ? "h-screen flex flex-col p-3 bg-background" : "h-[calc(100vh-120px)] flex flex-col"}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Direct messages &amp; group channels</p>
        </div>
        <div className="flex items-center gap-2">
          {!fullscreen && (
            <button
              onClick={() => window.open('/messages/full', '_blank')}
              title="Open full-screen in a new tab"
              className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground/80 transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={testNotification}
            title="Test notification (sound + browser alert)"
            className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground/80 transition-colors"
          >
            <BellRing className="w-4 h-4" /> Test
          </button>
          <button
            onClick={toggleSound}
            title={soundEnabled ? 'Mute notifications' : 'Unmute notifications'}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground/80 transition-colors"
          >
            {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
        {isAdmin && (
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button variant={viewMode === 'my' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('my')} className="rounded-md">
              <User className="w-4 h-4 mr-1" /> My Messages
            </Button>
            <Button variant={viewMode === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('all')} className="rounded-md">
              <Users className="w-4 h-4 mr-1" /> All Communications
            </Button>
          </div>
        )}
        </div>
      </div>

      <NotifyBanner onEnable={testNotification} />

      {/* Admin all-comms view */}
      {isAdmin && viewMode === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
          <Card className="md:col-span-1 flex flex-col">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="w-4 h-4" /> All Conversations</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60" />
                <Input placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {loadingAll ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : filteredAllConversations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground/60"><MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No conversations</p></div>
                ) : filteredAllConversations.map((conv, idx) => (
                  <div key={idx} onClick={() => setSelectedAllConversation(conv)}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedAllConversation?.user1_id === conv.user1_id && selectedAllConversation?.user2_id === conv.user2_id ? 'bg-primary/5 border-l-4 border-l-blue-500' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <Avatar className="w-8 h-8 border-2 border-white"><AvatarFallback className="bg-blue-100 text-blue-700 text-xs">{getInitials(conv.user1_name)}</AvatarFallback></Avatar>
                        <Avatar className="w-8 h-8 border-2 border-white"><AvatarFallback className="bg-purple-100 text-purple-700 text-xs">{getInitials(conv.user2_name)}</AvatarFallback></Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{conv.user1_name} &amp; {conv.user2_name}</p>
                        <p className="text-xs text-muted-foreground">{conv.message_count} msgs · {formatDate(conv.last_message_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
          <Card className="md:col-span-2 flex flex-col">
            <CardHeader className="border-b py-3">
              {selectedAllConversation ? (
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <Avatar className="w-10 h-10 border-2 border-white"><AvatarFallback className="bg-blue-100 text-blue-700">{getInitials(selectedAllConversation.user1_name)}</AvatarFallback></Avatar>
                    <Avatar className="w-10 h-10 border-2 border-white"><AvatarFallback className="bg-purple-100 text-purple-700">{getInitials(selectedAllConversation.user2_name)}</AvatarFallback></Avatar>
                  </div>
                  <div>
                    <CardTitle className="text-base">{selectedAllConversation.user1_name} &amp; {selectedAllConversation.user2_name}</CardTitle>
                    <p className="text-xs text-muted-foreground">Admin view – read only</p>
                  </div>
                </div>
              ) : <CardTitle className="text-muted-foreground/60">Select a conversation</CardTitle>}
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {selectedAllConversation ? (
                <ScrollArea className="h-full p-4">
                  <div className="space-y-3">
                    {allMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.sender_id === selectedAllConversation.user1_id ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender_id === selectedAllConversation.user1_id ? 'bg-muted' : 'bg-purple-100'}`}>
                          <p className="text-xs font-medium text-muted-foreground mb-0.5">{msg.sender_name}</p>
                          <p className="text-sm text-foreground">{msg.content}</p>
                          <span className="text-xs text-muted-foreground/60">{formatDate(msg.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground/60">
                  <div className="text-center"><Users className="w-16 h-16 mx-auto mb-4 opacity-30" /><p>Select a conversation</p></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (

        /* ── My Messages / Channels ─────────────────────────────────────────── */
        <div className="flex flex-col md:flex-row gap-3 flex-1 min-h-0">

          {/* Sidebar */}
          <Card className="w-full md:w-64 md:shrink-0 flex flex-col min-h-0 max-h-56 md:max-h-none">
            {/* Search */}
            <div className="p-2.5 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" />
              </div>
            </div>

            {/* Sidebar: Channels first, Direct Messages below */}
            <div className="overflow-y-auto flex-1">
              {/* Channels list */}
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Channels</span>
                  <button onClick={() => setNewChannelDialog(true)} className="flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 font-semibold">
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>
                {filteredChannels.length === 0 && (
                  <button onClick={() => setNewChannelDialog(true)} className="w-full text-left px-2 py-2 text-xs text-primary hover:bg-primary/5 rounded-md transition-colors">
                    + Create a channel
                  </button>
                )}
                {filteredChannels.map(ch => {
                  const active = activeSection === 'channels' && selectedChannel?.channel_id === ch.channel_id;
                  return (
                    <div key={ch.channel_id}
                      onClick={() => { setSelectedChannel(ch); setActiveSection('channels'); setSelectedConversation(null); }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors mb-0.5 ${active ? 'bg-primary text-white' : 'text-foreground/80 hover:bg-muted'}`}>
                      <Hash className={`w-4 h-4 shrink-0 ${active ? 'text-blue-200' : 'text-muted-foreground/60'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate leading-tight ${ch.unread_count > 0 ? 'font-bold' : 'font-medium'}`}>{ch.name}</p>
                        {ch.last_message && <p className={`text-xs truncate leading-tight ${active ? 'text-blue-200' : 'text-muted-foreground/60'}`}>{ch.last_message}</p>}
                      </div>
                      {ch.unread_count > 0 && (
                        <Badge className={`text-xs h-4 px-1.5 shrink-0 ${active ? 'bg-white text-primary' : 'bg-primary text-white'}`}>{ch.unread_count}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* DM list */}
              <div className="p-2 border-t">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">Direct Messages</span>
                  <button onClick={() => setNewChatDialog(true)} className="flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 font-semibold">
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>
                {filteredConversations.length === 0 && (
                  <button onClick={() => setNewChatDialog(true)} className="w-full text-left px-2 py-2 text-xs text-primary hover:bg-primary/5 rounded-md transition-colors">
                    + Start a conversation
                  </button>
                )}
                {filteredConversations.map(conv => {
                  const active = activeSection === 'dm' && selectedConversation?.user_id === conv.user_id;
                  return (
                    <div key={conv.user_id}
                      onClick={() => { setSelectedConversation(conv); setActiveSection('dm'); setSelectedChannel(null); setThreadMsg(null); }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors mb-0.5 ${active ? 'bg-primary text-white' : 'text-foreground/80 hover:bg-muted'}`}>
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarFallback className={`text-xs font-medium ${active ? 'bg-primary/50 text-white' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'}`}>
                          {getInitials(conv.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate leading-tight ${conv.unread_count > 0 ? 'font-bold' : 'font-medium'}`}>{conv.name}</p>
                        {conv.last_message && <p className={`text-xs truncate leading-tight ${active ? 'text-blue-200' : 'text-muted-foreground/60'}`}>{conv.last_message}</p>}
                      </div>
                      {conv.unread_count > 0 && (
                        <Badge className={`text-xs h-4 px-1.5 shrink-0 ${active ? 'bg-white text-primary' : 'bg-primary text-white'}`}>{conv.unread_count}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </Card>

          {/* Main content */}
          <div className="flex-1 flex gap-3 min-w-0">

            {/* Channel / DM area */}
            <Card className="flex-1 flex flex-col min-w-0">

              {/* ── CHANNELS ─────────────────────────────────────────────── */}
              {activeSection === 'channels' && selectedChannel ? (
                <>
                  {/* Channel header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
                    <Hash className="w-5 h-5 text-muted-foreground/60 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground leading-tight">{selectedChannel.name}</h3>
                      {selectedChannel.description && <p className="text-xs text-muted-foreground truncate">{selectedChannel.description}</p>}
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground/60 shrink-0">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-medium mr-1">{selectedChannel.members?.length || 0}</span>
                      <button className="p-1 hover:bg-muted rounded transition-colors" onClick={() => sendBuzz('channel', selectedChannel.channel_id, `# ${selectedChannel.name}`)} title="Buzz everyone in this channel">
                        <PhoneCall className="w-4 h-4 text-muted-foreground hover:text-primary" />
                      </button>
                      <button className="p-1 hover:bg-muted rounded transition-colors" onClick={openEditDialog} title="Edit channel">
                        <Settings className="w-4 h-4 text-muted-foreground/60 hover:text-muted-foreground" />
                      </button>
                      {threadMsg && (
                        <button className="p-1 hover:bg-muted rounded" onClick={() => { setThreadMsg(null); setThreadReplies([]); }}>
                          <PanelRightOpen className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Channel search + filter */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/40 shrink-0">
                    <div className="relative flex-1 max-w-xs">
                      <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={msgSearch} onChange={e => setMsgSearch(e.target.value)} placeholder="Search messages…"
                        className="w-full pl-8 pr-2 h-8 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <select value={msgFilter} onChange={e => setMsgFilter(e.target.value)}
                      className="h-8 text-xs rounded-md border bg-card px-2 text-muted-foreground">
                      <option value="all">All</option>
                      <option value="media">Media</option>
                      <option value="links">Links</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <input type="date" value={msgDateFrom} onChange={e => setMsgDateFrom(e.target.value)} max={msgDateTo || undefined}
                        title="From date" className="h-8 text-xs rounded-md border bg-card px-2 text-muted-foreground" />
                      <span className="text-muted-foreground text-xs">–</span>
                      <input type="date" value={msgDateTo} onChange={e => setMsgDateTo(e.target.value)} min={msgDateFrom || undefined}
                        title="To date" className="h-8 text-xs rounded-md border bg-card px-2 text-muted-foreground" />
                    </div>
                    {(msgSearch || msgFilter !== 'all' || msgDateFrom || msgDateTo) && (
                      <button onClick={() => { setMsgSearch(''); setMsgFilter('all'); setMsgDateFrom(''); setMsgDateTo(''); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"><X className="w-3.5 h-3.5" />Clear</button>
                    )}
                  </div>

                  {/* Channel messages */}
                  <div ref={channelScrollRef} onScroll={handleChannelScroll} className="flex-1 overflow-y-auto py-2">
                    {channelMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60">
                        <Hash className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-medium text-muted-foreground">No messages yet</p>
                        <p className="text-sm mt-1">Be the first to say something in #{selectedChannel.name}</p>
                      </div>
                    ) : (
                      groupedChannelMessages.filter(msgMatches).map(msg => {
                        const isSelf = msg.sender_id === user?.user_id;
                        const openThread = () => {
                          setThreadMsg(msg);
                          if (selectedChannel) fetchThreadReplies(selectedChannel.channel_id, msg.msg_id);
                          scrollToChannelMessage(msg.msg_id);
                        };
                        return (
                          <div key={msg.msg_id} id={`chmsg-${msg.msg_id}`} className="scroll-mt-4">
                            {msg.showDateDivider && <DateDivider date={msg.created_at} />}
                            <div className={`group flex gap-3 px-4 py-0.5 transition-colors duration-700 ${highlightMsgId === msg.msg_id ? 'bg-primary/15' : 'hover:bg-muted/50/60'}`}>
                              {/* Avatar or grouped spacer */}
                              <div className="w-9 shrink-0 mt-1">
                                {!msg.isGrouped ? (
                                  <Avatar className="w-9 h-9">
                                    <AvatarFallback className={`text-xs font-medium text-white ${isSelf ? 'bg-gradient-to-br from-blue-500 to-blue-700' : 'bg-gradient-to-br from-indigo-500 to-purple-600'}`}>
                                      {getInitials(msg.sender_name)}
                                    </AvatarFallback>
                                  </Avatar>
                                ) : (
                                  <span title={formatISTFull(msg.created_at)}
                                    className="text-[9px] text-muted-foreground block text-right leading-tight pt-2 whitespace-nowrap -ml-3">
                                    {formatShortDate(msg.created_at)}<br />{formatFullTime(msg.created_at)}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0 pb-1">
                                {/* Name + time header (first in group only) */}
                                {!msg.isGrouped && (
                                  <div className="flex items-baseline gap-2 mb-1">
                                    <span className="text-sm font-bold text-foreground">{isSelf ? 'You' : msg.sender_name}</span>
                                    <span className="text-xs text-muted-foreground/60 whitespace-nowrap" title={formatISTFull(msg.created_at)}>{formatDate(msg.created_at)}</span>
                                    <button onClick={openThread}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-primary bg-white hover:bg-primary/5 rounded px-2 py-0.5 border border-border hover:border-primary/40 shadow-sm">
                                      <MessageCircle className="w-3 h-3" /> Reply
                                    </button>
                                  </div>
                                )}
                                {/* Grouped reply button on hover */}
                                {msg.isGrouped && (
                                  <button onClick={openThread}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity float-right flex items-center gap-1 text-xs text-muted-foreground/60 hover:text-primary bg-white hover:bg-primary/5 rounded px-2 py-0.5 border border-border hover:border-primary/40 shadow-sm">
                                    <MessageCircle className="w-3 h-3" /> Reply
                                  </button>
                                )}
                                {!msg.deleted && (
                                  <ReactionChips reactions={msg.reactions} currentUserId={user?.user_id}
                                    onReact={(emoji) => handleReact(msg, emoji, 'channel')} />
                                )}
                                {!msg.deleted && TAG_CHANNELS.includes(selectedChannel?.name) && (
                                  <TagChips tags={msg.tags} onTag={(tag) => handleTag(msg, tag)} currentUserId={user?.user_id} />
                                )}
                                {/* Bubble (text + attachments together) */}
                                {msg.deleted ? (
                                  <div className="inline-block rounded-2xl px-4 py-2 max-w-lg bg-muted text-muted-foreground italic text-sm">🚫 This message was deleted</div>
                                ) : editingId === msg.msg_id ? (
                                  <div className="flex flex-col gap-1 max-w-lg">
                                    <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2}
                                      className="w-full text-sm rounded-lg border border-primary/40 bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary" autoFocus />
                                    <div className="flex gap-2">
                                      <button onClick={() => saveEditChannel(msg.msg_id)} className="text-xs bg-primary text-white rounded px-2 py-0.5 hover:opacity-90">Save</button>
                                      <button onClick={cancelEdit} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                                    </div>
                                  </div>
                                ) : (msg.content || msg.attachments?.length > 0) && (
                                  <div className={`relative group/msg inline-block rounded-2xl px-4 py-2.5 max-w-lg ${
                                    isSelf
                                      ? 'bg-primary text-white rounded-tl-sm'
                                      : 'bg-muted text-foreground rounded-tl-sm'
                                  }`}>
                                    {(isSelf || isAdmin) && (
                                      <div className="absolute -top-2 -right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-0.5 bg-card border rounded-full shadow-sm px-1 z-10">
                                        {isSelf && <button title="Edit" onClick={() => startEdit(msg.msg_id, msg.content)} className="p-1 text-muted-foreground hover:text-primary"><Pencil className="w-3 h-3" /></button>}
                                        <button title="Delete" onClick={() => deleteChannelMsg(msg.msg_id)} className="p-1 text-muted-foreground hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                      </div>
                                    )}
                                    {msg.content && (
                                      <p className={`text-sm whitespace-pre-wrap leading-relaxed ${isSelf ? 'text-white' : 'text-foreground'}`}>
                                        {msg.content}
                                      </p>
                                    )}
                                    {msg.attachments?.length > 0 && renderAttachments(msg.attachments, isSelf)}
                                    {msg.is_tx_bot && (
                                      <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                        <TxBadge msg={msg} />
                                        {msg.tx_reference && (
                                          <button type="button" onClick={() => navigate(`/transactions?search=${encodeURIComponent(msg.tx_reference)}`)}
                                            className={`text-[11px] underline ${isSelf ? 'text-white/90' : 'text-primary'} hover:opacity-80`}>
                                            View transaction →
                                          </button>
                                        )}
                                        {msg.tx_type === 'withdrawal' && !msg.tx_processed_by && !msg.tx_direct && canApprove('transaction_requests') && (
                                          <button type="button" onClick={() => handleTxProcess(msg)}
                                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-600 text-white hover:bg-amber-700">Process</button>
                                        )}
                                        {msg.tx_processed_by && (
                                          <span className="text-[11px] text-emerald-600 font-medium">🟢 Processed{msg.tx_processed_by_name ? ` by ${msg.tx_processed_by_name}` : ''}</span>
                                        )}
                                        {msg.tx_owner_id === user?.user_id && !msg.tx_completed_by && (
                                          <button type="button" onClick={() => handleTxComplete(msg)}
                                            className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white hover:bg-blue-700">Complete</button>
                                        )}
                                        {msg.tx_completed_by && (
                                          <span className="text-[11px] text-green-600 font-medium">✅ Completed{msg.tx_completed_by_name ? ` by ${msg.tx_completed_by_name}` : ''}</span>
                                        )}
                                      </div>
                                    )}
                                    {msg.edited && <span className={`text-[10px] ml-1 ${isSelf ? 'text-white/70' : 'text-muted-foreground'}`}>(edited)</span>}
                                  </div>
                                )}
                                {!msg.deleted && (
                                  <div className="flex items-center gap-1.5 clear-both">
                                    <ReactionAdder onReact={(emoji) => handleReact(msg, emoji, 'channel')} />
                                    {TAG_CHANNELS.includes(selectedChannel?.name) && (
                                      <TagBar tags={msg.tags} onTag={(tag) => handleTag(msg, tag)} currentUserId={user?.user_id} />
                                    )}
                                  </div>
                                )}
                                {/* Thread reply count */}
                                {msg.reply_count > 0 && (
                                  <button onClick={openThread}
                                    className="flex items-center gap-1.5 mt-1.5 text-xs text-primary hover:underline font-medium clear-both">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    {msg.reply_count} {msg.reply_count === 1 ? 'reply' : 'replies'}
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Channel compose */}
                  <div className="px-4 py-3 border-t shrink-0">
                    <FilePreviewStrip files={channelFiles} onRemove={i => setChannelFiles(prev => prev.filter((_, idx) => idx !== i))} />
                    <div className="flex items-end gap-2 bg-muted/70 rounded-xl px-3 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/40 transition-all border border-transparent focus-within:border-primary/40">
                      <input ref={channelFileInputRef} type="file" className="hidden" multiple accept="image/*,video/*,.pdf,.xlsx,.xls,.csv,.doc,.docx" onChange={handleChannelFileSelect} />
                      <button className="text-muted-foreground/60 hover:text-primary transition-colors shrink-0" onClick={() => channelFileInputRef.current?.click()} title="Attach files">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <Textarea
                        ref={channelTextareaRef}
                        value={channelMsg}
                        onChange={e => {
                          setChannelMsg(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px';
                        }}
                        onPaste={handleChannelPaste}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChannelMessage(); } }}
                        placeholder={`Message #${selectedChannel.name}`}
                        className="flex-1 resize-none text-sm border-0 p-0 focus-visible:ring-0 shadow-none bg-transparent overflow-y-hidden"
                        rows={1}
                        style={{ minHeight: 22, maxHeight: 128 }}
                      />
                      <button
                        onClick={handleSendChannelMessage}
                        disabled={(!channelMsg.trim() && !channelFiles.length) || sendingChannel}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                      >
                        {sendingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground/60 mt-1 ml-1">Enter to send · Shift+Enter for new line · Paste images</p>
                  </div>
                </>

              ) : activeSection === 'dm' && selectedConversation ? (
                /* ── DM VIEW ───────────────────────────────────────────────── */
                <>
                  {/* DM header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
                    <Avatar className="w-9 h-9">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                        {getInitials(selectedConversation.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground leading-tight">{selectedConversation.name}</h3>
                      <p className="text-xs text-muted-foreground/60">{selectedConversation.email}</p>
                    </div>
                    <button className="p-1.5 hover:bg-muted rounded-full transition-colors shrink-0" onClick={() => sendBuzz('dm', selectedConversation.user_id, selectedConversation.name)} title={`Buzz ${selectedConversation.name}`}>
                      <PhoneCall className="w-4 h-4 text-muted-foreground hover:text-primary" />
                    </button>
                    <Badge variant="outline" className="text-xs shrink-0">{selectedConversation.role}</Badge>
                  </div>

                  {/* DM search + filter */}
                  <div className="flex items-center gap-2 px-4 py-2 border-b bg-muted/40 shrink-0">
                    <div className="relative flex-1 max-w-xs">
                      <SearchIcon className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <input value={msgSearch} onChange={e => setMsgSearch(e.target.value)} placeholder="Search messages…"
                        className="w-full pl-8 pr-2 h-8 text-sm rounded-md border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
                    </div>
                    <select value={msgFilter} onChange={e => setMsgFilter(e.target.value)}
                      className="h-8 text-xs rounded-md border bg-card px-2 text-muted-foreground">
                      <option value="all">All</option>
                      <option value="media">Media</option>
                      <option value="links">Links</option>
                    </select>
                    <div className="flex items-center gap-1">
                      <input type="date" value={msgDateFrom} onChange={e => setMsgDateFrom(e.target.value)} max={msgDateTo || undefined}
                        title="From date" className="h-8 text-xs rounded-md border bg-card px-2 text-muted-foreground" />
                      <span className="text-muted-foreground text-xs">–</span>
                      <input type="date" value={msgDateTo} onChange={e => setMsgDateTo(e.target.value)} min={msgDateFrom || undefined}
                        title="To date" className="h-8 text-xs rounded-md border bg-card px-2 text-muted-foreground" />
                    </div>
                    {(msgSearch || msgFilter !== 'all' || msgDateFrom || msgDateTo) && (
                      <button onClick={() => { setMsgSearch(''); setMsgFilter('all'); setMsgDateFrom(''); setMsgDateTo(''); }} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-0.5"><X className="w-3.5 h-3.5" />Clear</button>
                    )}
                  </div>

                  {/* DM messages */}
                  <div ref={dmScrollRef} onScroll={handleDmScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/60">
                        <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-medium text-muted-foreground">No messages yet</p>
                        <p className="text-sm mt-1">Start the conversation</p>
                      </div>
                    ) : messages.filter(msgMatches).map((msg, i, arr) => {
                      const isSelf = msg.sender_id === user?.user_id;
                      const prev = arr[i - 1];
                      const sameDay = prev && new Date(msg.created_at).toDateString() === new Date(prev.created_at).toDateString();
                      return (
                        <div key={msg.message_id}>
                          {!sameDay && prev && <DateDivider date={msg.created_at} />}
                          {!prev && <DateDivider date={msg.created_at} />}
                          <div className={`flex items-end gap-2 ${isSelf ? 'justify-end' : 'justify-start'}`}>
                            {!isSelf && (
                              <Avatar className="w-7 h-7 shrink-0 mb-1">
                                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs">
                                  {getInitials(msg.sender_name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className={`flex flex-col min-w-0 ${isSelf ? 'items-end' : 'items-start'}`}>
                            {!msg.deleted && (
                              <ReactionChips reactions={msg.reactions} currentUserId={user?.user_id}
                                onReact={(emoji) => handleReact(msg, emoji, 'dm')} />
                            )}
                            {msg.deleted ? (
                              <div className="max-w-[70%] rounded-2xl px-4 py-2 bg-muted text-muted-foreground italic text-sm">🚫 This message was deleted</div>
                            ) : editingId === msg.message_id ? (
                              <div className="max-w-[70%] w-full flex flex-col gap-1">
                                <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2}
                                  className="text-sm rounded-lg border border-primary/40 bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary" autoFocus />
                                <div className="flex gap-2 justify-end">
                                  <button onClick={() => saveEditDM(msg.message_id)} className="text-xs bg-primary text-white rounded px-2 py-0.5 hover:opacity-90">Save</button>
                                  <button onClick={cancelEdit} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                                </div>
                              </div>
                            ) : (
                            <div className={`relative group/msg max-w-[70%] rounded-2xl px-4 py-2.5 ${isSelf ? 'bg-primary text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}>
                              {(isSelf || isAdmin) && (
                                <div className="absolute -top-2 -right-2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex gap-0.5 bg-card border rounded-full shadow-sm px-1 z-10">
                                  {isSelf && <button title="Edit" onClick={() => startEdit(msg.message_id, msg.content)} className="p-1 text-muted-foreground hover:text-primary"><Pencil className="w-3 h-3" /></button>}
                                  <button title="Delete" onClick={() => deleteDM(msg.message_id)} className="p-1 text-muted-foreground hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                                </div>
                              )}
                              {msg.content && (msg.link_channel_id ? (
                                <p onClick={() => jumpToChannelMessage(msg.link_channel_id, msg.link_msg_id, msg.link_thread)}
                                  title="Open the thread" className="text-sm leading-relaxed cursor-pointer hover:underline underline-offset-2">
                                  {msg.content} <span className="opacity-70">↗</span>
                                </p>
                              ) : (
                                <p className="text-sm leading-relaxed">{msg.content}</p>
                              ))}
                              {msg.attachment && (
                                isImage(msg.attachment.filename, msg.attachment.content_type) ? (
                                  <div className="mt-1 cursor-pointer rounded-lg overflow-hidden" onClick={async () => {
                                    const token = localStorage.getItem('auth_token');
                                    const r = await fetch(`${API_URL}/api/messages/attachment/${msg.message_id}`, { headers: { Authorization: `Bearer ${token}` } });
                                    const b = await r.blob(); setLightboxUrl(URL.createObjectURL(b));
                                  }}>
                                    <img src={msg.attachment.url || `${API_URL}/api/messages/attachment/${msg.message_id}`}
                                      alt={msg.attachment.filename} className="rounded-lg max-h-48 object-cover" style={{ maxWidth: 240 }} />
                                  </div>
                                ) : (
                                  <a href="#" onClick={async e => {
                                    e.preventDefault();
                                    const token = localStorage.getItem('auth_token');
                                    const r = await fetch(`${API_URL}/api/messages/attachment/${msg.message_id}`, { headers: { Authorization: `Bearer ${token}` } });
                                    const blob = await r.blob(); const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a'); a.href = url; a.download = msg.attachment.filename; a.click(); URL.revokeObjectURL(url);
                                  }} className={`flex items-center gap-2 mt-1 p-2 rounded-lg cursor-pointer ${isSelf ? 'bg-primary/30 hover:bg-primary/50/50' : 'bg-slate-200 hover:bg-slate-300'}`}>
                                    {getFileIcon(msg.attachment.filename, msg.attachment.content_type)}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium truncate">{msg.attachment.filename}</p>
                                      <p className={`text-xs ${isSelf ? 'text-blue-200' : 'text-muted-foreground/60'}`}>{formatFileSize(msg.attachment.size)}</p>
                                    </div>
                                  </a>
                                )
                              )}
                              {msg.is_tx_bot && (
                                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                                  <TxBadge msg={msg} />
                                  {msg.tx_reference && (
                                    <button type="button" onClick={() => navigate(`/transactions?search=${encodeURIComponent(msg.tx_reference)}`)}
                                      className={`text-[11px] underline ${isSelf ? 'text-white/90' : 'text-primary'} hover:opacity-80`}>
                                      View transaction →
                                    </button>
                                  )}
                                  {msg.tx_processed_by && (
                                    <span className="text-[11px] text-emerald-600 font-medium">🟢 Processed{msg.tx_processed_by_name ? ` by ${msg.tx_processed_by_name}` : ''}</span>
                                  )}
                                  {msg.tx_owner_id === user?.user_id && !msg.tx_completed_by && (
                                    <button type="button" onClick={() => handleTxComplete(msg)}
                                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-600 text-white hover:bg-blue-700">Complete</button>
                                  )}
                                  {msg.tx_completed_by && (
                                    <span className="text-[11px] text-green-600 font-medium">✅ Completed{msg.tx_completed_by_name ? ` by ${msg.tx_completed_by_name}` : ''}</span>
                                  )}
                                </div>
                              )}
                              <div className={`flex items-center justify-end gap-1 mt-0.5 ${isSelf ? 'text-blue-200' : 'text-muted-foreground/60'}`}>
                                {msg.edited && <span className="text-[10px] opacity-80 mr-0.5">(edited)</span>}
                                <span className="text-xs" title={formatISTFull(msg.created_at)}>{formatTime(msg.created_at)}</span>
                                {isSelf && (
                                  msg.read
                                    ? <CheckCheck className="w-3.5 h-3.5 text-primary/30" />
                                    : <Check className="w-3.5 h-3.5 text-primary/60 opacity-70" />
                                )}
                              </div>
                            </div>
                            )}
                            {!msg.deleted && (
                              <ReactionAdder onReact={(emoji) => handleReact(msg, emoji, 'dm')} />
                            )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* DM compose */}
                  <div className="px-4 py-3 border-t shrink-0">
                    {attachment && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg border">
                        {getFileIcon(attachment.name, attachment.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground/80 truncate">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground/60">{formatFileSize(attachment.size)}</p>
                        </div>
                        <button onClick={() => setAttachment(null)} className="text-muted-foreground/60 hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-end gap-2 bg-muted/70 rounded-xl px-3 py-2 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/40 transition-all border border-transparent focus-within:border-primary/40">
                      <input ref={fileInputRef} type="file" className="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv,.doc,.docx"
                        onChange={handleDmFileSelect} />
                      <button className="text-muted-foreground/60 hover:text-primary transition-colors shrink-0" onClick={() => fileInputRef.current?.click()} title="Attach file">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <Input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder={`Message ${selectedConversation.name}`}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        className="flex-1 border-0 p-0 focus-visible:ring-0 shadow-none text-sm bg-transparent"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && !attachment) || sending}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>

              ) : (
                /* ── Empty state ─────────────────────────────────────────── */
                <div className="flex-1 flex items-center justify-center text-muted-foreground/60">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-medium text-muted-foreground">Select a conversation or channel</h3>
                    <p className="text-sm mt-1">Choose from the sidebar to start messaging</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Thread panel */}
            {threadMsg && selectedChannel && (
              <Card className="w-full md:w-80 md:shrink-0 flex flex-col min-h-0">
                <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Thread</h3>
                    <p className="text-xs text-muted-foreground/60">#{selectedChannel.name}</p>
                  </div>
                  <button onClick={() => { setThreadMsg(null); setThreadReplies([]); }} className="p-1 text-muted-foreground/60 hover:text-foreground/80 hover:bg-muted rounded transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div ref={threadScrollRef} className="flex-1 overflow-y-auto p-4">
                  {/* Root message */}
                  <div className="mb-4 pb-4 border-b">
                    <div className="group flex gap-2.5">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                          {getInitials(threadMsg.sender_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 cursor-pointer" title="Jump to this message in the channel"
                          onClick={() => scrollToChannelMessage(threadMsg.msg_id)}>
                          <span className="text-sm font-bold text-foreground">{threadMsg.sender_id === user?.user_id ? 'You' : threadMsg.sender_name}</span>
                          <span className="text-xs text-muted-foreground/60 whitespace-nowrap" title={formatISTFull(threadMsg.created_at)}>{formatDate(threadMsg.created_at)}</span>
                        </div>
                        {TAG_CHANNELS.includes(selectedChannel?.name) && (
                          <TagChips tags={threadMsg.tags} onTag={(tag) => handleTag(threadMsg, tag)} currentUserId={user?.user_id} />
                        )}
                        {threadMsg.content && (
                          <p title="Jump to this message in the channel" onClick={() => scrollToChannelMessage(threadMsg.msg_id)}
                            className="text-sm text-foreground mt-0.5 whitespace-pre-wrap leading-relaxed cursor-pointer rounded hover:bg-muted transition-colors">
                            {threadMsg.content}
                          </p>
                        )}
                        {renderAttachments(threadMsg.attachments, threadMsg.sender_id === user?.user_id)}
                        {TAG_CHANNELS.includes(selectedChannel?.name) && (
                          <TagBar tags={threadMsg.tags} onTag={(tag) => handleTag(threadMsg, tag)} currentUserId={user?.user_id} />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  <p className="text-xs text-muted-foreground/60 font-semibold mb-3">
                    {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
                  </p>
                  {threadReplies.map(r => (
                    <div key={r.msg_id} className="group flex gap-2.5 mb-3">
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-cyan-500 text-white text-xs">
                          {getInitials(r.sender_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 group/rep">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-bold text-foreground">{r.sender_id === user?.user_id ? 'You' : r.sender_name}</span>
                          <span className="text-xs text-muted-foreground/60 whitespace-nowrap" title={formatISTFull(r.created_at)}>{formatDate(r.created_at)}</span>
                          {r.edited && !r.deleted && <span className="text-[10px] text-muted-foreground/60">(edited)</span>}
                          {(r.sender_id === user?.user_id || isAdmin) && !r.deleted && (
                            <span className="opacity-0 group-hover/rep:opacity-100 transition-opacity flex gap-0.5">
                              {r.sender_id === user?.user_id && <button title="Edit" onClick={() => startEdit(r.msg_id, r.content)} className="p-0.5 text-muted-foreground hover:text-primary"><Pencil className="w-3 h-3" /></button>}
                              <button title="Delete" onClick={() => deleteReply(r.msg_id)} className="p-0.5 text-muted-foreground hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                            </span>
                          )}
                        </div>
                        {!r.deleted && (
                          <ReactionChips reactions={r.reactions} currentUserId={user?.user_id}
                            onReact={(emoji) => handleReact(r, emoji, 'channel')} />
                        )}
                        {!r.deleted && TAG_CHANNELS.includes(selectedChannel?.name) && (
                          <TagChips tags={r.tags} onTag={(tag) => handleTag(r, tag)} currentUserId={user?.user_id} />
                        )}
                        {r.deleted ? (
                          <p className="text-sm text-muted-foreground italic mt-0.5">🚫 This message was deleted</p>
                        ) : editingId === r.msg_id ? (
                          <div className="flex flex-col gap-1 mt-1">
                            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={2}
                              className="text-sm rounded-lg border border-primary/40 bg-card px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary" autoFocus />
                            <div className="flex gap-2">
                              <button onClick={() => saveEditReply(r.msg_id)} className="text-xs bg-primary text-white rounded px-2 py-0.5 hover:opacity-90">Save</button>
                              <button onClick={cancelEdit} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {r.content && <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">{r.content}</p>}
                            {renderAttachments(r.attachments, r.sender_id === user?.user_id)}
                          </>
                        )}
                        {!r.deleted && (
                          <div className="flex items-center gap-1.5 clear-both">
                            <ReactionAdder onReact={(emoji) => handleReact(r, emoji, 'channel')} />
                            {TAG_CHANNELS.includes(selectedChannel?.name) && (
                              <TagBar tags={r.tags} onTag={(tag) => handleTag(r, tag)} currentUserId={user?.user_id} />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Thread compose */}
                <div className="px-3 py-3 border-t shrink-0">
                  <FilePreviewStrip files={threadFiles} onRemove={i => setThreadFiles(prev => prev.filter((_, idx) => idx !== i))} />
                  <div className="flex items-end gap-2 bg-muted/70 rounded-xl px-2.5 py-1.5 focus-within:bg-white focus-within:ring-2 focus-within:ring-primary/40 transition-all border border-transparent focus-within:border-primary/40">
                    <input ref={threadFileInputRef} type="file" className="hidden" multiple accept="image/*,video/*,.pdf,.xlsx,.xls,.csv,.doc,.docx" onChange={handleThreadFileSelect} />
                    <button className="text-muted-foreground/60 hover:text-primary shrink-0" onClick={() => threadFileInputRef.current?.click()}>
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <Textarea
                      ref={threadTextareaRef}
                      value={threadText}
                      onChange={e => {
                        setThreadText(e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
                      }}
                      onPaste={handleThreadPaste}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendThreadReply(); } }}
                      placeholder="Reply in thread…"
                      className="flex-1 resize-none text-sm border-0 p-0 focus-visible:ring-0 shadow-none bg-transparent overflow-y-hidden"
                      rows={1}
                      style={{ minHeight: 20, maxHeight: 96 }}
                    />
                    <button onClick={handleSendThreadReply} disabled={(!threadText.trim() && !threadFiles.length) || sendingThread}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-primary hover:bg-blue-700 disabled:opacity-40 text-white transition-colors">
                      {sendingThread ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* New DM dialog */}
      <Dialog open={newChatDialog} onOpenChange={setNewChatDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Users className="w-5 h-5" /> New Direct Message</DialogTitle></DialogHeader>
          <div>
            <Label>Select User</Label>
            <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose a user to message..." />
              </SelectTrigger>
              <SelectContent>
                {users.map(u => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{u.name}</span>
                      <Badge variant="outline" className="ml-2 text-xs">{u.role}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChatDialog(false)}>Cancel</Button>
            <Button onClick={handleStartNewChat} disabled={!selectedRecipient}>
              <MessageSquare className="w-4 h-4 mr-2" /> Start Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Channel dialog */}
      <Dialog open={newChannelDialog} onOpenChange={v => { setNewChannelDialog(v); if (!v) { setChannelName(''); setChannelDesc(''); setChannelMembers([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Hash className="w-5 h-5" /> Create Channel</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Channel Name *</Label>
              <Input className="mt-1" placeholder="e.g. general, ops-team, finance"
                value={channelName}
                onChange={e => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))} />
            </div>
            <div>
              <Label>Description (optional)</Label>
              <Input className="mt-1" placeholder="What's this channel about?" value={channelDesc} onChange={e => setChannelDesc(e.target.value)} />
            </div>
            <div>
              <Label>Add Members</Label>
              <div className="mt-1 max-h-40 overflow-y-auto border rounded-md p-2 space-y-0.5">
                {users.map(u => (
                  <label key={u.user_id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-muted/50 rounded">
                    <input type="checkbox" className="rounded"
                      checked={channelMembers.includes(u.user_id)}
                      onChange={e => setChannelMembers(prev => e.target.checked ? [...prev, u.user_id] : prev.filter(id => id !== u.user_id))} />
                    <span className="text-sm">{u.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">{u.role}</Badge>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/60 mt-1">You are automatically added as a member.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChannelDialog(false)}>Cancel</Button>
            <Button onClick={handleCreateChannel} disabled={!channelName.trim() || creatingChannel}>
              {creatingChannel ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Hash className="w-4 h-4 mr-2" />}
              Create Channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Channel dialog */}
      <Dialog open={editChannelDialog} onOpenChange={v => { setEditChannelDialog(v); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings className="w-5 h-5" /> Edit Channel</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Channel Name *</Label>
              <Input className="mt-1" placeholder="e.g. general, ops-team"
                value={editChannelName}
                onChange={e => setEditChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))} />
            </div>
            <div>
              <Label>Description</Label>
              <Input className="mt-1" placeholder="What's this channel about?" value={editChannelDesc} onChange={e => setEditChannelDesc(e.target.value)} />
            </div>
            <div>
              <Label>Members</Label>
              <div className="mt-1 max-h-40 overflow-y-auto border rounded-md p-2 space-y-0.5">
                {users.map(u => (
                  <label key={u.user_id} className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-muted/50 rounded">
                    <input type="checkbox" className="rounded"
                      checked={editChannelMembers.includes(u.user_id)}
                      onChange={e => setEditChannelMembers(prev => e.target.checked ? [...prev, u.user_id] : prev.filter(id => id !== u.user_id))} />
                    <span className="text-sm">{u.name}</span>
                    <Badge variant="outline" className="text-xs ml-auto">{u.role}</Badge>
                  </label>
                ))}
              </div>
              <p className="text-xs text-muted-foreground/60 mt-1">Uncheck to remove members.</p>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <button
              onClick={handleDeleteChannel}
              className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-md transition-colors mr-auto"
            >
              <Trash2 className="w-4 h-4" /> Delete Channel
            </button>
            <Button variant="outline" onClick={() => setEditChannelDialog(false)}>Cancel</Button>
            <Button onClick={handleEditChannel} disabled={!editChannelName.trim() || savingChannel}>
              {savingChannel ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Settings className="w-4 h-4 mr-2" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-5xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Full size" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
            <button className="absolute -top-3 -right-3 w-8 h-8 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center" onClick={() => setLightboxUrl(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
