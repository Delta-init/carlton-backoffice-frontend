import { useEffect, useState, useRef, useCallback } from 'react';
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
  Hash, MessageCircle, ChevronRight, Video, ZoomIn, PanelRightOpen,
} from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Messages() {
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
  const [activeSection, setActiveSection] = useState('dm');
  const [channelMsg, setChannelMsg] = useState('');
  const [channelFiles, setChannelFiles] = useState([]);
  const [sendingChannel, setSendingChannel] = useState(false);
  const channelFileInputRef = useRef(null);

  // Thread state
  const [threadMsg, setThreadMsg] = useState(null);
  const [threadReplies, setThreadReplies] = useState([]);
  const [threadText, setThreadText] = useState('');
  const [threadFiles, setThreadFiles] = useState([]);
  const [sendingThread, setSendingThread] = useState(false);
  const threadFileInputRef = useRef(null);

  // Channel dialog
  const [newChannelDialog, setNewChannelDialog] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [channelMembers, setChannelMembers] = useState([]);
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Scroll refs
  const dmScrollRef = useRef(null);
  const channelScrollRef = useRef(null);
  const threadScrollRef = useRef(null);
  const atDmBottomRef = useRef(true);
  const atChannelBottomRef = useRef(true);

  // Stable refs for WS handler (avoid stale closures)
  const selectedConvRef = useRef(null);
  const selectedChannelRef = useRef(null);
  const threadMsgRef = useRef(null);
  const wsHandlerRef = useRef(null);

  useEffect(() => { selectedConvRef.current = selectedConversation; }, [selectedConversation]);
  useEffect(() => { selectedChannelRef.current = selectedChannel; }, [selectedChannel]);
  useEffect(() => { threadMsgRef.current = threadMsg; }, [threadMsg]);

  const isAdmin = user?.role === 'admin';

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatTime = (d) => {
    if (!d) return '';
    const dt = new Date(d);
    const now = new Date();
    const diff = Math.floor((now - dt) / 86400000);
    if (diff === 0) return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (diff === 1) return 'Yesterday';
    if (diff < 7) return dt.toLocaleDateString('en-US', { weekday: 'short' });
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatFullTime = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const getDateLabel = (d) => {
    const dt = new Date(d);
    const today = new Date();
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    if (dt.toDateString() === today.toDateString()) return 'Today';
    if (dt.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return dt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
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
    return <File className="w-4 h-4 text-muted-foreground" />;
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
            className={`flex items-center gap-2 p-2 rounded-lg ${isSelf ? 'bg-primary/10 hover:bg-primary/15' : 'bg-muted hover:bg-muted'}`}>
            {getFileIcon(f.filename, f.content_type)}
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{f.filename}</p>
              <p className={`text-xs ${isSelf ? 'text-primary/50' : 'text-muted-foreground'}`}>{formatFileSize(f.size)}</p>
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

  // ── WebSocket ──────────────────────────────────────────────────────────────
  // The handler ref is reassigned every render so it always captures latest state
  wsHandlerRef.current = (data) => {
    switch (data.type) {
      case 'dm_message': {
        const msg = data.message;
        const otherId = msg.sender_id === user?.user_id ? msg.recipient_id : msg.sender_id;
        if (selectedConvRef.current?.user_id === otherId) {
          setMessages(prev => prev.some(m => m.message_id === msg.message_id) ? prev : [...prev, msg]);
        }
        setConversations(prev => {
          const exists = prev.some(c => c.user_id === otherId);
          const preview = msg.content || (msg.attachment ? '📎 Attachment' : '');
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
        break;
      }
      default: break;
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    if (!token) return;
    let ws;
    let reconnectTimer;
    let pingInterval;
    let destroyed = false;

    const connect = () => {
      if (destroyed) return;
      const wsBase = API_URL.replace(/^http/, 'ws');
      ws = new WebSocket(`${wsBase}/api/ws?token=${encodeURIComponent(token)}`);
      ws.onmessage = (e) => {
        if (e.data === 'pong') return;
        try { wsHandlerRef.current?.(JSON.parse(e.data)); } catch (err) { /* ignore */ }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        setThreadReplies(prev => prev.some(m => m.msg_id === reply.msg_id) ? prev : [...prev, reply]);
        setChannelMessages(prev => prev.map(m => m.msg_id === threadMsg.msg_id
          ? { ...m, reply_count: (m.reply_count || 0) + 1 } : m));
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
      <div className="flex-1 h-px bg-muted" />
      <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">{getDateLabel(date)}</span>
      <div className="flex-1 h-px bg-muted" />
    </div>
  );

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Direct messages &amp; group channels</p>
        </div>
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

      {/* Admin all-comms view */}
      {isAdmin && viewMode === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
          <Card className="md:col-span-1 flex flex-col">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2"><Users className="w-4 h-4" /> All Conversations</CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {loadingAll ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
                ) : filteredAllConversations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground"><MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No conversations</p></div>
                ) : filteredAllConversations.map((conv, idx) => (
                  <div key={idx} onClick={() => setSelectedAllConversation(conv)}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${selectedAllConversation?.user1_id === conv.user1_id && selectedAllConversation?.user2_id === conv.user2_id ? 'bg-primary/10 border-l-4 border-l-blue-500' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <Avatar className="w-8 h-8 border-2 border-white"><AvatarFallback className="bg-blue-100 text-primary text-xs">{getInitials(conv.user1_name)}</AvatarFallback></Avatar>
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
                    <Avatar className="w-10 h-10 border-2 border-white"><AvatarFallback className="bg-blue-100 text-primary">{getInitials(selectedAllConversation.user1_name)}</AvatarFallback></Avatar>
                    <Avatar className="w-10 h-10 border-2 border-white"><AvatarFallback className="bg-purple-100 text-purple-700">{getInitials(selectedAllConversation.user2_name)}</AvatarFallback></Avatar>
                  </div>
                  <div>
                    <CardTitle className="text-base">{selectedAllConversation.user1_name} &amp; {selectedAllConversation.user2_name}</CardTitle>
                    <p className="text-xs text-muted-foreground">Admin view – read only</p>
                  </div>
                </div>
              ) : <CardTitle className="text-muted-foreground">Select a conversation</CardTitle>}
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {selectedAllConversation ? (
                <ScrollArea className="h-full p-4">
                  <div className="space-y-3">
                    {allMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.sender_id === selectedAllConversation.user1_id ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${msg.sender_id === selectedAllConversation.user1_id ? 'bg-muted' : 'bg-purple-100'}`}>
                          <p className="text-xs font-medium text-foreground/80 mb-0.5">{msg.sender_name}</p>
                          <p className="text-sm text-foreground">{msg.content}</p>
                          <span className="text-xs text-muted-foreground">{formatDate(msg.created_at)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <div className="text-center"><Users className="w-16 h-16 mx-auto mb-4 opacity-30" /><p>Select a conversation</p></div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (

        /* ── My Messages / Channels ─────────────────────────────────────────── */
        <div className="flex gap-3 flex-1 min-h-0">

          {/* Sidebar */}
          <Card className="w-64 shrink-0 flex flex-col min-h-0">
            {/* Search */}
            <div className="p-2.5 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-8 h-8 text-xs" />
              </div>
            </div>

            {/* DM list */}
            <div className="overflow-y-auto flex-1">
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Direct Messages</span>
                  <button onClick={() => setNewChatDialog(true)} className="flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 font-semibold">
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>
                {filteredConversations.length === 0 && (
                  <button onClick={() => setNewChatDialog(true)} className="w-full text-left px-2 py-2 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors">
                    + Start a conversation
                  </button>
                )}
                {filteredConversations.map(conv => {
                  const active = activeSection === 'dm' && selectedConversation?.user_id === conv.user_id;
                  return (
                    <div key={conv.user_id}
                      onClick={() => { setSelectedConversation(conv); setActiveSection('dm'); setSelectedChannel(null); setThreadMsg(null); }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors mb-0.5 ${active ? 'bg-primary text-white' : 'text-foreground hover:bg-muted'}`}>
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarFallback className={`text-xs font-medium ${active ? 'bg-primary/100 text-white' : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white'}`}>
                          {getInitials(conv.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate leading-tight ${conv.unread_count > 0 ? 'font-bold' : 'font-medium'}`}>{conv.name}</p>
                        {conv.last_message && <p className={`text-xs truncate leading-tight ${active ? 'text-primary/30' : 'text-muted-foreground'}`}>{conv.last_message}</p>}
                      </div>
                      {conv.unread_count > 0 && (
                        <Badge className={`text-xs h-4 px-1.5 shrink-0 ${active ? 'bg-white text-primary' : 'bg-primary text-white'}`}>{conv.unread_count}</Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Channels list */}
              <div className="p-2 border-t">
                <div className="flex items-center justify-between px-2 py-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Channels</span>
                  <button onClick={() => setNewChannelDialog(true)} className="flex items-center gap-0.5 text-xs text-primary hover:text-primary/80 font-semibold">
                    <Plus className="w-3 h-3" /> New
                  </button>
                </div>
                {filteredChannels.length === 0 && (
                  <button onClick={() => setNewChannelDialog(true)} className="w-full text-left px-2 py-2 text-xs text-primary hover:bg-primary/10 rounded-md transition-colors">
                    + Create a channel
                  </button>
                )}
                {filteredChannels.map(ch => {
                  const active = activeSection === 'channels' && selectedChannel?.channel_id === ch.channel_id;
                  return (
                    <div key={ch.channel_id}
                      onClick={() => { setSelectedChannel(ch); setActiveSection('channels'); setSelectedConversation(null); }}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors mb-0.5 ${active ? 'bg-primary text-white' : 'text-foreground hover:bg-muted'}`}>
                      <Hash className={`w-4 h-4 shrink-0 ${active ? 'text-primary/30' : 'text-muted-foreground'}`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate leading-tight ${ch.unread_count > 0 ? 'font-bold' : 'font-medium'}`}>{ch.name}</p>
                        {ch.last_message && <p className={`text-xs truncate leading-tight ${active ? 'text-primary/30' : 'text-muted-foreground'}`}>{ch.last_message}</p>}
                      </div>
                      {ch.unread_count > 0 && (
                        <Badge className={`text-xs h-4 px-1.5 shrink-0 ${active ? 'bg-white text-primary' : 'bg-primary text-white'}`}>{ch.unread_count}</Badge>
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
                    <Hash className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground leading-tight">{selectedChannel.name}</h3>
                      {selectedChannel.description && <p className="text-xs text-muted-foreground truncate">{selectedChannel.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                      <Users className="w-4 h-4" />
                      <span className="text-xs font-medium">{selectedChannel.members?.length || 0}</span>
                      {threadMsg && (
                        <button className="ml-1 p-1 hover:bg-muted rounded" onClick={() => { setThreadMsg(null); setThreadReplies([]); }}>
                          <PanelRightOpen className="w-4 h-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Channel messages */}
                  <div ref={channelScrollRef} onScroll={handleChannelScroll} className="flex-1 overflow-y-auto py-2">
                    {channelMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Hash className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-medium text-foreground/80">No messages yet</p>
                        <p className="text-sm mt-1">Be the first to say something in #{selectedChannel.name}</p>
                      </div>
                    ) : (
                      groupedChannelMessages.map(msg => (
                        <div key={msg.msg_id}>
                          {msg.showDateDivider && <DateDivider date={msg.created_at} />}
                          <div className="group flex gap-3 px-4 hover:bg-muted/50/80 py-0.5 transition-colors">
                            {/* Avatar or spacer */}
                            <div className="w-9 shrink-0 mt-0.5">
                              {!msg.isGrouped ? (
                                <Avatar className="w-9 h-9">
                                  <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs font-medium">
                                    {getInitials(msg.sender_name)}
                                  </AvatarFallback>
                                </Avatar>
                              ) : (
                                <span className="text-[10px] text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pt-1 block text-center leading-none">
                                  {formatFullTime(msg.created_at)}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pb-0.5">
                              {!msg.isGrouped && (
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <span className="text-sm font-bold text-foreground">{msg.sender_id === user?.user_id ? 'You' : msg.sender_name}</span>
                                  <span className="text-xs text-muted-foreground">{formatFullTime(msg.created_at)}</span>
                                  <button
                                    onClick={() => { setThreadMsg(msg); if (selectedChannel) fetchThreadReplies(selectedChannel.channel_id, msg.msg_id); }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 flex items-center gap-1 text-xs text-muted-foreground hover:text-primary bg-white hover:bg-primary/10 rounded px-2 py-0.5 border border-border hover:border-primary/50 shadow-sm"
                                  >
                                    <MessageCircle className="w-3 h-3" /> Reply
                                  </button>
                                </div>
                              )}
                              {msg.isGrouped && (
                                <button
                                  onClick={() => { setThreadMsg(msg); if (selectedChannel) fetchThreadReplies(selectedChannel.channel_id, msg.msg_id); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity float-right flex items-center gap-1 text-xs text-muted-foreground hover:text-primary bg-white hover:bg-primary/10 rounded px-2 py-0.5 border border-border hover:border-primary/50 shadow-sm -mt-0.5"
                                >
                                  <MessageCircle className="w-3 h-3" /> Reply
                                </button>
                              )}
                              {msg.content && <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                              {renderAttachments(msg.attachments, msg.sender_id === user?.user_id)}
                              {msg.reply_count > 0 && (
                                <button
                                  onClick={() => { setThreadMsg(msg); if (selectedChannel) fetchThreadReplies(selectedChannel.channel_id, msg.msg_id); }}
                                  className="flex items-center gap-1.5 mt-1.5 text-xs text-primary hover:underline font-medium">
                                  <MessageCircle className="w-3.5 h-3.5" />
                                  {msg.reply_count} {msg.reply_count === 1 ? 'reply' : 'replies'}
                                  <ChevronRight className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Channel compose */}
                  <div className="px-4 py-3 border-t shrink-0">
                    <FilePreviewStrip files={channelFiles} onRemove={i => setChannelFiles(prev => prev.filter((_, idx) => idx !== i))} />
                    <div className="flex items-end gap-2 border border-border rounded-xl px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/10 transition-all bg-white">
                      <input ref={channelFileInputRef} type="file" className="hidden" multiple accept="image/*,video/*,.pdf,.xlsx,.xls,.csv,.doc,.docx" onChange={handleChannelFileSelect} />
                      <button className="text-muted-foreground hover:text-primary transition-colors shrink-0" onClick={() => channelFileInputRef.current?.click()} title="Attach files">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <Textarea
                        value={channelMsg}
                        onChange={e => setChannelMsg(e.target.value)}
                        onPaste={handleChannelPaste}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChannelMessage(); } }}
                        placeholder={`Message #${selectedChannel.name}`}
                        className="flex-1 resize-none text-sm border-0 p-0 focus-visible:ring-0 shadow-none min-h-[22px] max-h-32"
                        rows={1}
                      />
                      <button
                        onClick={handleSendChannelMessage}
                        disabled={(!channelMsg.trim() && !channelFiles.length) || sendingChannel}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                      >
                        {sendingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 ml-1">Enter to send · Shift+Enter for new line · Paste images</p>
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
                      <p className="text-xs text-muted-foreground">{selectedConversation.email}</p>
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">{selectedConversation.role}</Badge>
                  </div>

                  {/* DM messages */}
                  <div ref={dmScrollRef} onScroll={handleDmScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
                        <p className="font-medium text-foreground/80">No messages yet</p>
                        <p className="text-sm mt-1">Start the conversation</p>
                      </div>
                    ) : messages.map((msg, i) => {
                      const isSelf = msg.sender_id === user?.user_id;
                      const prev = messages[i - 1];
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
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 ${isSelf ? 'bg-primary text-white rounded-br-sm' : 'bg-muted text-foreground rounded-bl-sm'}`}>
                              {msg.content && <p className="text-sm leading-relaxed">{msg.content}</p>}
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
                                  }} className={`flex items-center gap-2 mt-1 p-2 rounded-lg cursor-pointer ${isSelf ? 'bg-primary/15 hover:bg-primary/25' : 'bg-muted hover:bg-muted'}`}>
                                    {getFileIcon(msg.attachment.filename, msg.attachment.content_type)}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium truncate">{msg.attachment.filename}</p>
                                      <p className={`text-xs ${isSelf ? 'text-primary/30' : 'text-muted-foreground'}`}>{formatFileSize(msg.attachment.size)}</p>
                                    </div>
                                  </a>
                                )
                              )}
                              <div className={`flex items-center justify-end gap-1 mt-0.5 ${isSelf ? 'text-primary/30' : 'text-muted-foreground'}`}>
                                <span className="text-xs">{formatTime(msg.created_at)}</span>
                                {isSelf && (
                                  msg.read
                                    ? <CheckCheck className="w-3.5 h-3.5 text-primary/20" />
                                    : <Check className="w-3.5 h-3.5 text-primary/50 opacity-70" />
                                )}
                              </div>
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
                          <p className="text-sm font-medium text-foreground truncate">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                        </div>
                        <button onClick={() => setAttachment(null)} className="text-muted-foreground hover:text-red-500 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-end gap-2 border border-border rounded-xl px-3 py-2 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/10 transition-all bg-white">
                      <input ref={fileInputRef} type="file" className="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv,.doc,.docx"
                        onChange={handleDmFileSelect} />
                      <button className="text-muted-foreground hover:text-primary transition-colors shrink-0" onClick={() => fileInputRef.current?.click()} title="Attach file">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <Input
                        value={newMessage}
                        onChange={e => setNewMessage(e.target.value)}
                        placeholder={`Message ${selectedConversation.name}`}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        className="flex-1 border-0 p-0 focus-visible:ring-0 shadow-none text-sm"
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && !attachment) || sending}
                        className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
                      >
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </>

              ) : (
                /* ── Empty state ─────────────────────────────────────────── */
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-medium text-foreground/80">Select a conversation or channel</h3>
                    <p className="text-sm mt-1">Choose from the sidebar to start messaging</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Thread panel */}
            {threadMsg && selectedChannel && (
              <Card className="w-80 shrink-0 flex flex-col min-h-0">
                <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
                  <div>
                    <h3 className="font-semibold text-foreground text-sm">Thread</h3>
                    <p className="text-xs text-muted-foreground">#{selectedChannel.name}</p>
                  </div>
                  <button onClick={() => { setThreadMsg(null); setThreadReplies([]); }} className="p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div ref={threadScrollRef} className="flex-1 overflow-y-auto p-4">
                  {/* Root message */}
                  <div className="mb-4 pb-4 border-b">
                    <div className="flex gap-2.5">
                      <Avatar className="w-8 h-8 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                          {getInitials(threadMsg.sender_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-bold text-foreground">{threadMsg.sender_id === user?.user_id ? 'You' : threadMsg.sender_name}</span>
                          <span className="text-xs text-muted-foreground">{formatFullTime(threadMsg.created_at)}</span>
                        </div>
                        {threadMsg.content && <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">{threadMsg.content}</p>}
                        {renderAttachments(threadMsg.attachments, threadMsg.sender_id === user?.user_id)}
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  <p className="text-xs text-muted-foreground font-semibold mb-3">
                    {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
                  </p>
                  {threadReplies.map(r => (
                    <div key={r.msg_id} className="flex gap-2.5 mb-3">
                      <Avatar className="w-7 h-7 shrink-0">
                        <AvatarFallback className="bg-gradient-to-br from-blue-400 to-cyan-500 text-white text-xs">
                          {getInitials(r.sender_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-bold text-foreground">{r.sender_id === user?.user_id ? 'You' : r.sender_name}</span>
                          <span className="text-xs text-muted-foreground">{formatFullTime(r.created_at)}</span>
                        </div>
                        {r.content && <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap leading-relaxed">{r.content}</p>}
                        {renderAttachments(r.attachments, r.sender_id === user?.user_id)}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Thread compose */}
                <div className="px-3 py-3 border-t shrink-0">
                  <FilePreviewStrip files={threadFiles} onRemove={i => setThreadFiles(prev => prev.filter((_, idx) => idx !== i))} />
                  <div className="flex items-end gap-2 border border-border rounded-xl px-2.5 py-1.5 focus-within:border-primary transition-all bg-white">
                    <input ref={threadFileInputRef} type="file" className="hidden" multiple accept="image/*,video/*,.pdf,.xlsx,.xls,.csv,.doc,.docx" onChange={handleThreadFileSelect} />
                    <button className="text-muted-foreground hover:text-primary shrink-0" onClick={() => threadFileInputRef.current?.click()}>
                      <Paperclip className="w-4 h-4" />
                    </button>
                    <Textarea
                      value={threadText}
                      onChange={e => setThreadText(e.target.value)}
                      onPaste={handleThreadPaste}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendThreadReply(); } }}
                      placeholder="Reply in thread…"
                      className="flex-1 resize-none text-sm border-0 p-0 focus-visible:ring-0 shadow-none min-h-[20px] max-h-24"
                      rows={1}
                    />
                    <button onClick={handleSendThreadReply} disabled={(!threadText.trim() && !threadFiles.length) || sendingThread}
                      className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-40 text-white transition-colors">
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
              <p className="text-xs text-muted-foreground mt-1">You are automatically added as a member.</p>
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
