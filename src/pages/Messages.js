import { useEffect, useState, useCallback, useRef } from 'react';
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
import { ScrollArea } from '../components/ui/scroll-area';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
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
  const messagesEndRef = useRef(null);

  // Admin state
  const [viewMode, setViewMode] = useState('my');
  const [allConversations, setAllConversations] = useState([]);
  const [selectedAllConversation, setSelectedAllConversation] = useState(null);
  const [allMessages, setAllMessages] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  // Channel state
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [channelMessages, setChannelMessages] = useState([]);
  const [activeSection, setActiveSection] = useState('dm');
  const [searchTerm, setSearchTerm] = useState('');
  const [channelMsg, setChannelMsg] = useState('');
  const [channelFiles, setChannelFiles] = useState([]);
  const [sendingChannel, setSendingChannel] = useState(false);
  const channelFileInputRef = useRef(null);
  const channelMessagesEndRef = useRef(null);

  // Thread state
  const [threadMsg, setThreadMsg] = useState(null);
  const [threadReplies, setThreadReplies] = useState([]);
  const [threadText, setThreadText] = useState('');
  const [threadFiles, setThreadFiles] = useState([]);
  const [sendingThread, setSendingThread] = useState(false);
  const threadFileInputRef = useRef(null);
  const threadEndRef = useRef(null);

  // Channel dialog state
  const [newChannelDialog, setNewChannelDialog] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [channelMembers, setChannelMembers] = useState([]);
  const [creatingChannel, setCreatingChannel] = useState(false);

  // Lightbox
  const [lightboxUrl, setLightboxUrl] = useState(null);

  const isAdmin = user?.role === 'admin';

  // ── Helpers ──────────────────────────────────────────────────────────────
  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return date.toLocaleDateString('en-US', { weekday: 'short' });
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (filename, ct) => {
    const ext = (filename || '').split('.').pop().toLowerCase();
    return (ct || '').startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  const isVideo = (filename, ct) => {
    const ext = (filename || '').split('.').pop().toLowerCase();
    return (ct || '').startsWith('video/') || ['mp4', 'mov', 'webm', 'avi'].includes(ext);
  };

  const getFileIcon = (filename, contentType) => {
    const ext = (filename || '').split('.').pop().toLowerCase();
    const type = contentType || '';
    if (isImage(filename, type)) return <ImageIcon className="w-4 h-4 text-green-500" />;
    if (isVideo(filename, type)) return <Video className="w-4 h-4 text-purple-500" />;
    if (ext === 'pdf' || type === 'application/pdf') return <FileText className="w-4 h-4 text-red-400" />;
    if (['xlsx', 'xls', 'csv'].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    return <File className="w-4 h-4 text-muted-foreground" />;
  };

  const renderAttachments = (attachments, isSelf) => {
    if (!attachments?.length) return null;
    const imgs = attachments.filter(a => isImage(a.filename, a.content_type));
    const vids = attachments.filter(a => !isImage(a.filename, a.content_type) && isVideo(a.filename, a.content_type));
    const others = attachments.filter(a => !isImage(a.filename, a.content_type) && !isVideo(a.filename, a.content_type));
    return (
      <div className="mt-1 space-y-1">
        {imgs.length > 0 && (
          <div className={`grid gap-1 ${imgs.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`} style={{ maxWidth: 280 }}>
            {imgs.map((img, i) => (
              <div key={i} className="relative group cursor-pointer" onClick={() => setLightboxUrl(img.url)}>
                <img src={img.url} alt={img.filename}
                  className="rounded-lg object-cover w-full"
                  style={{ maxHeight: 180 }}
                />
                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 rounded-lg flex items-center justify-center transition-opacity">
                  <ZoomIn className="w-5 h-5 text-white" />
                </div>
              </div>
            ))}
          </div>
        )}
        {vids.map((vid, i) => (
          <video key={i} src={vid.url} controls
            className="rounded-lg w-full"
            style={{ maxWidth: 280, maxHeight: 180 }}
          />
        ))}
        {others.map((f, i) => (
          <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
            className={`flex items-center gap-2 p-2 rounded-lg ${
              isSelf ? 'bg-primary/100/20 hover:bg-primary/100/30' : 'bg-muted hover:bg-muted'
            }`}
          >
            {getFileIcon(f.filename, f.content_type)}
            <div className="min-w-0">
              <p className="text-xs font-medium truncate">{f.filename}</p>
              <p className={`text-xs ${isSelf ? 'text-primary/40' : 'text-muted-foreground'}`}>{formatFileSize(f.size)}</p>
            </div>
          </a>
        ))}
      </div>
    );
  };

  // ── DM fetchers ───────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/messages/users`, { headers: getAuthHeaders() });
      if (r.ok) setUsers(await r.json());
    } catch (e) { console.error(e); }
  }, [getAuthHeaders]);

  const fetchConversations = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/messages/conversations`, { headers: getAuthHeaders() });
      if (r.ok) setConversations(await r.json());
    } catch (e) { console.error(e); }
  }, [getAuthHeaders]);

  const fetchMessages = useCallback(async (recipientId) => {
    if (!recipientId) return;
    try {
      const r = await fetch(`${API_URL}/api/messages/conversation/${recipientId}`, { headers: getAuthHeaders() });
      if (r.ok) {
        setMessages(await r.json());
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (e) { console.error(e); }
  }, [getAuthHeaders]);

  const fetchAllConversations = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAll(true);
    try {
      const r = await fetch(`${API_URL}/api/messages/admin/all-conversations`, { headers: getAuthHeaders() });
      if (r.ok) setAllConversations(await r.json());
    } catch (e) { console.error(e); } finally { setLoadingAll(false); }
  }, [getAuthHeaders, isAdmin]);

  const fetchConversationMessages = useCallback(async (user1Id, user2Id) => {
    if (!isAdmin) return;
    try {
      const r = await fetch(`${API_URL}/api/messages/admin/conversation/${user1Id}/${user2Id}`, { headers: getAuthHeaders() });
      if (r.ok) setAllMessages(await r.json());
    } catch (e) { console.error(e); }
  }, [getAuthHeaders, isAdmin]);

  const markAsRead = async (recipientId) => {
    try {
      await fetch(`${API_URL}/api/messages/mark-read/${recipientId}`, { method: 'PUT', headers: getAuthHeaders() });
      fetchConversations();
    } catch (e) { console.error(e); }
  };

  // ── Channel fetchers ──────────────────────────────────────────────────────
  const fetchChannels = useCallback(async () => {
    try {
      const r = await fetch(`${API_URL}/api/channels`, { headers: getAuthHeaders() });
      if (r.ok) setChannels(await r.json());
    } catch (e) { console.error(e); }
  }, [getAuthHeaders]);

  const fetchChannelMessages = useCallback(async (channelId) => {
    if (!channelId) return;
    try {
      const r = await fetch(`${API_URL}/api/channels/${channelId}/messages`, { headers: getAuthHeaders() });
      if (r.ok) {
        setChannelMessages(await r.json());
        setTimeout(() => channelMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (e) { console.error(e); }
  }, [getAuthHeaders]);

  const fetchThreadReplies = useCallback(async (channelId, msgId) => {
    if (!channelId || !msgId) return;
    try {
      const r = await fetch(`${API_URL}/api/channels/${channelId}/messages/${msgId}/replies`, { headers: getAuthHeaders() });
      if (r.ok) {
        setThreadReplies(await r.json());
        setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (e) { console.error(e); }
  }, [getAuthHeaders]);

  const markChannelRead = useCallback(async (channelId) => {
    try {
      await fetch(`${API_URL}/api/channels/${channelId}/mark-read`, { method: 'PUT', headers: getAuthHeaders() });
    } catch (e) { console.error(e); }
  }, [getAuthHeaders]);

  // ── Send handlers ─────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !selectedConversation) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append('recipient_id', selectedConversation.user_id);
      fd.append('content', newMessage);
      if (attachment) fd.append('attachment', attachment);
      const headers = { ...getAuthHeaders() };
      delete headers['Content-Type'];
      const r = await fetch(`${API_URL}/api/messages/send`, { method: 'POST', headers, body: fd });
      if (r.ok) {
        setNewMessage(''); setAttachment(null);
        fetchMessages(selectedConversation.user_id);
        fetchConversations();
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
      const headers = { ...getAuthHeaders() };
      delete headers['Content-Type'];
      const r = await fetch(`${API_URL}/api/channels/${selectedChannel.channel_id}/messages`, { method: 'POST', headers, body: fd });
      if (r.ok) {
        setChannelMsg(''); setChannelFiles([]);
        fetchChannelMessages(selectedChannel.channel_id);
        fetchChannels();
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
      const headers = { ...getAuthHeaders() };
      delete headers['Content-Type'];
      const r = await fetch(`${API_URL}/api/channels/${selectedChannel.channel_id}/messages/${threadMsg.msg_id}/replies`, { method: 'POST', headers, body: fd });
      if (r.ok) {
        setThreadText(''); setThreadFiles([]);
        fetchThreadReplies(selectedChannel.channel_id, threadMsg.msg_id);
        fetchChannelMessages(selectedChannel.channel_id);
      } else toast.error(await getApiError(r));
    } catch (e) { toast.error(e?.message || 'Something went wrong'); } finally { setSendingThread(false); }
  };

  const handleCreateChannel = async () => {
    if (!channelName.trim()) { toast.error('Channel name is required'); return; }
    setCreatingChannel(true);
    try {
      const headers = { ...getAuthHeaders(), 'Content-Type': 'application/json' };
      const r = await fetch(`${API_URL}/api/channels`, {
        method: 'POST', headers,
        body: JSON.stringify({ name: channelName.trim(), description: channelDesc, members: channelMembers }),
      });
      if (r.ok) {
        const ch = await r.json();
        setNewChannelDialog(false); setChannelName(''); setChannelDesc(''); setChannelMembers([]);
        await fetchChannels();
        setSelectedChannel(ch); setActiveSection('channels');
      } else toast.error(await getApiError(r));
    } catch (e) { toast.error(e?.message || 'Something went wrong'); } finally { setCreatingChannel(false); }
  };

  // ── File handlers ─────────────────────────────────────────────────────────
  const handleDmFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error('File size exceeds 10MB limit'); return; }
    setAttachment(file);
    e.target.value = '';
  };

  const validateChannelFile = (file) => {
    const ct = file.type || '';
    const maxSize = ct.startsWith('video/') ? 100 * 1024 * 1024 : 20 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error(`${file.name} exceeds ${ct.startsWith('video/') ? '100MB' : '20MB'} limit`);
      return false;
    }
    return true;
  };

  const handleChannelFileSelect = (e) => {
    const files = Array.from(e.target.files || []).filter(validateChannelFile);
    setChannelFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleThreadFileSelect = (e) => {
    const files = Array.from(e.target.files || []).filter(validateChannelFile);
    setThreadFiles(prev => [...prev, ...files]);
    e.target.value = '';
  };

  const handleChannelPaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pasted = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f && validateChannelFile(f)) pasted.push(f);
      }
    }
    if (pasted.length) setChannelFiles(prev => [...prev, ...pasted]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleThreadPaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const pasted = [];
    for (const item of items) {
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f && validateChannelFile(f)) pasted.push(f);
      }
    }
    if (pasted.length) setThreadFiles(prev => [...prev, ...pasted]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartNewChat = () => {
    if (!selectedRecipient) { toast.error('Please select a user'); return; }
    const recipient = users.find(u => u.user_id === selectedRecipient);
    if (recipient) {
      setSelectedConversation({ user_id: recipient.user_id, name: recipient.name, email: recipient.email, role: recipient.role });
      setActiveSection('dm'); setSelectedChannel(null); setThreadMsg(null);
      setNewChatDialog(false); setSelectedRecipient('');
    }
  };

  // ── Effects ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchConversations(), fetchChannels()]);
      setLoading(false);
    };
    init();
  }, [fetchUsers, fetchConversations, fetchChannels]);

  useEffect(() => {
    if (viewMode === 'all' && isAdmin) fetchAllConversations();
  }, [viewMode, isAdmin, fetchAllConversations]);

  useEffect(() => {
    if (selectedAllConversation && isAdmin)
      fetchConversationMessages(selectedAllConversation.user1_id, selectedAllConversation.user2_id);
  }, [selectedAllConversation, isAdmin, fetchConversationMessages]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.user_id);
      markAsRead(selectedConversation.user_id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    if (selectedChannel) {
      fetchChannelMessages(selectedChannel.channel_id);
      markChannelRead(selectedChannel.channel_id);
    }
    setThreadMsg(null); setThreadReplies([]);
  }, [selectedChannel, fetchChannelMessages, markChannelRead]);

  useEffect(() => {
    if (threadMsg && selectedChannel)
      fetchThreadReplies(selectedChannel.channel_id, threadMsg.msg_id);
  }, [threadMsg, selectedChannel, fetchThreadReplies]);

  // Polling
  useEffect(() => {
    if (!selectedConversation) return;
    const iv = setInterval(() => fetchMessages(selectedConversation.user_id), 10000);
    return () => clearInterval(iv);
  }, [selectedConversation, fetchMessages]);

  useEffect(() => {
    if (!selectedChannel) return;
    const iv = setInterval(() => {
      fetchChannelMessages(selectedChannel.channel_id);
      fetchChannels();
    }, 4000);
    return () => clearInterval(iv);
  }, [selectedChannel, fetchChannelMessages, fetchChannels]);

  useEffect(() => {
    if (!threadMsg || !selectedChannel) return;
    const iv = setInterval(() => fetchThreadReplies(selectedChannel.channel_id, threadMsg.msg_id), 4000);
    return () => clearInterval(iv);
  }, [threadMsg, selectedChannel, fetchThreadReplies]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filteredConversations = conversations.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredAllConversations = allConversations.filter(c =>
    c.user1_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.user2_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredChannels = channels.filter(c =>
    c.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Sub-components ────────────────────────────────────────────────────────
  const FilePreviewStrip = ({ files, onRemove }) => {
    if (!files.length) return null;
    return (
      <div className="flex flex-wrap gap-2 mb-2 p-2 bg-muted/50 rounded-lg border border">
        {files.map((f, i) => (
          <div key={i} className="relative group">
            {isImage(f.name, f.type) ? (
              <div className="w-14 h-14 rounded overflow-hidden border border">
                <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
              </div>
            ) : isVideo(f.name, f.type) ? (
              <div className="w-14 h-14 rounded bg-purple-50 border border-purple-200 flex flex-col items-center justify-center">
                <Video className="w-5 h-5 text-purple-600" />
                <p className="text-xs text-purple-500 mt-0.5">{f.name.split('.').pop().toUpperCase()}</p>
              </div>
            ) : (
              <div className="flex items-center gap-1 px-2 py-1.5 bg-white border rounded-lg max-w-[110px]">
                {getFileIcon(f.name, f.type)}
                <p className="text-xs truncate">{f.name}</p>
              </div>
            )}
            <button onClick={() => onRemove(i)}
              className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </div>
        ))}
      </div>
    );
  };

  const openThread = (msg) => {
    setThreadMsg(msg);
    if (selectedChannel) fetchThreadReplies(selectedChannel.channel_id, msg.msg_id);
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-muted-foreground mt-1">Direct messages &amp; group channels</p>
        </div>
        {isAdmin && (
          <div className="flex items-center bg-muted rounded-lg p-1">
            <Button variant={viewMode === 'my' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('my')} className="rounded-md" data-testid="view-my-messages">
              <User className="w-4 h-4 mr-1" /> My Messages
            </Button>
            <Button variant={viewMode === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setViewMode('all')} className="rounded-md" data-testid="view-all-messages">
              <Users className="w-4 h-4 mr-1" /> All Communications
            </Button>
          </div>
        )}
      </div>

      {/* Admin: All Communications */}
      {isAdmin && viewMode === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 min-h-0">
          <Card className="md:col-span-1 flex flex-col">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" /> All User Conversations
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search users..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full">
                {loadingAll ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : filteredAllConversations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" /><p>No conversations found</p>
                  </div>
                ) : filteredAllConversations.map((conv, idx) => (
                  <div key={idx} onClick={() => setSelectedAllConversation(conv)}
                    className={`p-4 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                      selectedAllConversation?.user1_id === conv.user1_id && selectedAllConversation?.user2_id === conv.user2_id
                        ? 'bg-primary/10 border-l-4 border-l-primary' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex -space-x-2">
                        <Avatar className="w-8 h-8 border-2 border-white"><AvatarFallback className="bg-primary/10 text-primary text-xs">{getInitials(conv.user1_name)}</AvatarFallback></Avatar>
                        <Avatar className="w-8 h-8 border-2 border-white"><AvatarFallback className="bg-purple-100 text-purple-700 text-xs">{getInitials(conv.user2_name)}</AvatarFallback></Avatar>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{conv.user1_name} &amp; {conv.user2_name}</p>
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
                    <Avatar className="w-10 h-10 border-2 border-white"><AvatarFallback className="bg-primary/10 text-primary">{getInitials(selectedAllConversation.user1_name)}</AvatarFallback></Avatar>
                    <Avatar className="w-10 h-10 border-2 border-white"><AvatarFallback className="bg-purple-100 text-purple-700">{getInitials(selectedAllConversation.user2_name)}</AvatarFallback></Avatar>
                  </div>
                  <div>
                    <CardTitle className="text-base">{selectedAllConversation.user1_name} &amp; {selectedAllConversation.user2_name}</CardTitle>
                    <p className="text-xs text-muted-foreground">Viewing conversation between users</p>
                  </div>
                </div>
              ) : <CardTitle className="text-muted-foreground">Select a conversation</CardTitle>}
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {selectedAllConversation ? (
                <ScrollArea className="h-full p-4">
                  <div className="space-y-4">
                    {allMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.sender_id === selectedAllConversation.user1_id ? 'justify-start' : 'justify-end'}`}>
                        <div className={`max-w-[70%] ${msg.sender_id === selectedAllConversation.user1_id ? 'bg-muted' : 'bg-purple-100'} rounded-lg px-4 py-2`}>
                          <p className="text-xs font-medium text-muted-foreground mb-1">{msg.sender_name}</p>
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
            {selectedAllConversation && <div className="p-3 border-t bg-muted/50"><p className="text-xs text-muted-foreground text-center">Admin view – Read only</p></div>}
          </Card>
        </div>
      ) : (
        /* My Messages / Channels */
        <div className="flex gap-3 flex-1 min-h-0">

          {/* Sidebar */}
          <Card className="w-64 shrink-0 flex flex-col">
            <div className="p-3 border-b shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 h-8 text-sm" />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {/* Direct Messages */}
              <div className="p-2">
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Direct Messages</span>
                  <button onClick={() => setNewChatDialog(true)} className="w-5 h-5 text-muted-foreground hover:text-foreground flex items-center justify-center rounded" title="New message">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {filteredConversations.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-1">No conversations yet</p>
                )}
                {filteredConversations.map(conv => (
                  <div key={conv.user_id}
                    onClick={() => { setSelectedConversation(conv); setActiveSection('dm'); setSelectedChannel(null); setThreadMsg(null); }}
                    className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors ${
                      activeSection === 'dm' && selectedConversation?.user_id === conv.user_id
                        ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                    }`}
                    data-testid={`conversation-${conv.user_id}`}
                  >
                    <Avatar className="w-7 h-7 shrink-0">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                        {getInitials(conv.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">{conv.name}</p>
                      {conv.last_message && <p className="text-xs text-muted-foreground truncate">{conv.last_message}</p>}
                    </div>
                    {conv.unread_count > 0 && (
                      <Badge className="bg-primary text-white text-xs h-5 px-1.5 shrink-0">{conv.unread_count}</Badge>
                    )}
                  </div>
                ))}
              </div>

              {/* Channels */}
              <div className="p-2 border-t">
                <div className="flex items-center justify-between px-2 py-1 mb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Channels</span>
                  <button onClick={() => setNewChannelDialog(true)} className="w-5 h-5 text-muted-foreground hover:text-foreground flex items-center justify-center rounded" title="New channel">
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {filteredChannels.length === 0 && (
                  <p className="text-xs text-muted-foreground px-2 py-1">No channels yet</p>
                )}
                {filteredChannels.map(ch => (
                  <div key={ch.channel_id}
                    onClick={() => { setSelectedChannel(ch); setActiveSection('channels'); setSelectedConversation(null); }}
                    className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors ${
                      activeSection === 'channels' && selectedChannel?.channel_id === ch.channel_id
                        ? 'bg-primary/10 text-primary' : 'text-foreground hover:bg-muted'
                    }`}
                  >
                    <Hash className="w-4 h-4 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate leading-tight">{ch.name}</p>
                      {ch.last_message && <p className="text-xs text-muted-foreground truncate">{ch.last_message}</p>}
                    </div>
                    {ch.unread_count > 0 && (
                      <Badge className="bg-primary text-white text-xs h-5 px-1.5 shrink-0">{ch.unread_count}</Badge>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>

          {/* Main content */}
          <div className="flex-1 flex gap-3 min-w-0">

            {/* Chat / Channel area */}
            <Card className="flex-1 flex flex-col min-w-0">
              {activeSection === 'channels' && selectedChannel ? (
                <>
                  {/* Channel header */}
                  <CardHeader className="pb-3 border-b shrink-0 py-3">
                    <div className="flex items-center gap-2">
                      <Hash className="w-5 h-5 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground">{selectedChannel.name}</h3>
                        {selectedChannel.description && (
                          <p className="text-xs text-muted-foreground truncate">{selectedChannel.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          <span className="text-xs">{selectedChannel.members?.length || 0}</span>
                        </div>
                        {threadMsg && (
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setThreadMsg(null); setThreadReplies([]); }} title="Close thread">
                            <PanelRightOpen className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  {/* Channel messages */}
                  <CardContent className="flex-1 p-4 overflow-hidden min-h-0">
                    <ScrollArea className="h-full pr-2">
                      {channelMessages.length === 0 ? (
                        <div className="text-center py-16 text-muted-foreground">
                          <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
                          <p className="font-medium text-muted-foreground">No messages yet</p>
                          <p className="text-sm mt-1">Be the first to say something in #{selectedChannel.name}</p>
                        </div>
                      ) : (
                        channelMessages.map(msg => {
                          const isSelf = msg.sender_id === user?.user_id;
                          return (
                            <div key={msg.msg_id} className="group flex gap-2 mb-4">
                              <Avatar className="w-8 h-8 shrink-0 mt-0.5">
                                <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                                  {getInitials(msg.sender_name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline gap-2 mb-0.5">
                                  <span className="text-sm font-semibold text-foreground">{msg.sender_name}</span>
                                  <span className="text-xs text-muted-foreground">{formatTime(msg.created_at)}</span>
                                  {/* Reply on hover */}
                                  <button
                                    onClick={() => openThread(msg)}
                                    className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-xs text-muted-foreground hover:text-primary bg-muted hover:bg-primary/10 rounded px-2 py-0.5 border border-transparent hover:border-primary/20"
                                  >
                                    <MessageCircle className="w-3 h-3" /> Reply
                                  </button>
                                </div>
                                {msg.content && <p className="text-sm text-foreground whitespace-pre-wrap">{msg.content}</p>}
                                {renderAttachments(msg.attachments, isSelf)}
                                {/* Thread reply count */}
                                {msg.reply_count > 0 && (
                                  <button
                                    onClick={() => openThread(msg)}
                                    className="flex items-center gap-1 mt-1 text-xs text-primary hover:text-primary/80 hover:underline font-medium"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    {msg.reply_count} {msg.reply_count === 1 ? 'reply' : 'replies'}
                                    <ChevronRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                      <div ref={channelMessagesEndRef} />
                    </ScrollArea>
                  </CardContent>

                  {/* Channel compose */}
                  <div className="p-3 border-t shrink-0">
                    <FilePreviewStrip files={channelFiles} onRemove={i => setChannelFiles(prev => prev.filter((_, idx) => idx !== i))} />
                    <div className="flex gap-2 items-end">
                      <input ref={channelFileInputRef} type="file" className="hidden" multiple
                        accept="image/*,video/*,.pdf,.xlsx,.xls,.csv,.doc,.docx"
                        onChange={handleChannelFileSelect}
                      />
                      <Button variant="outline" size="icon" className="h-9 w-9 shrink-0" onClick={() => channelFileInputRef.current?.click()} title="Attach files">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Textarea
                        value={channelMsg}
                        onChange={e => setChannelMsg(e.target.value)}
                        onPaste={handleChannelPaste}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChannelMessage(); } }}
                        placeholder={`Message #${selectedChannel.name} (Enter to send, Shift+Enter for new line, paste images)`}
                        className="flex-1 resize-none text-sm"
                        rows={1}
                        style={{ minHeight: 36, maxHeight: 120 }}
                      />
                      <Button onClick={handleSendChannelMessage}
                        disabled={(!channelMsg.trim() && !channelFiles.length) || sendingChannel}
                        size="icon" className="h-9 w-9 shrink-0"
                        data-testid="send-channel-btn"
                      >
                        {sendingChannel ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </>
              ) : activeSection === 'dm' && selectedConversation ? (
                <>
                  <CardHeader className="pb-3 border-b shrink-0 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {getInitials(selectedConversation.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">{selectedConversation.name}</h3>
                        <p className="text-sm text-muted-foreground">{selectedConversation.email}</p>
                      </div>
                      <Badge variant="outline" className="ml-auto">{selectedConversation.role}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 p-4 overflow-hidden min-h-0">
                    <ScrollArea className="h-full pr-4">
                      <div className="space-y-4">
                        {messages.length === 0 ? (
                          <div className="text-center py-12 text-muted-foreground">
                            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No messages yet</p>
                            <p className="text-sm">Start the conversation</p>
                          </div>
                        ) : messages.map(msg => (
                          <div key={msg.message_id} className={`flex ${msg.sender_id === user?.user_id ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                              msg.sender_id === user?.user_id
                                ? 'bg-primary text-white rounded-br-md'
                                : 'bg-muted text-foreground rounded-bl-md'
                            }`}>
                              {msg.content && <p className="text-sm">{msg.content}</p>}
                              {msg.attachment && (
                                isImage(msg.attachment.filename, msg.attachment.content_type) ? (
                                  <div className="mt-1 cursor-pointer" onClick={() => {
                                    const token = localStorage.getItem('auth_token');
                                    fetch(`${API_URL}/api/messages/attachment/${msg.message_id}`, { headers: { Authorization: `Bearer ${token}` } })
                                      .then(r => r.blob()).then(b => setLightboxUrl(URL.createObjectURL(b)));
                                  }}>
                                    <img src={`${API_URL}/api/messages/attachment/${msg.message_id}`}
                                      alt={msg.attachment.filename} className="rounded-lg max-h-48 object-cover" style={{ maxWidth: 260 }} />
                                  </div>
                                ) : (
                                  <a href="#" onClick={async e => {
                                    e.preventDefault();
                                    const token = localStorage.getItem('auth_token');
                                    const r = await fetch(`${API_URL}/api/messages/attachment/${msg.message_id}`, { headers: { Authorization: `Bearer ${token}` } });
                                    const blob = await r.blob();
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a'); a.href = url; a.download = msg.attachment.filename; a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                    className={`flex items-center gap-2 mt-1 p-2 rounded-lg cursor-pointer ${
                                      msg.sender_id === user?.user_id ? 'bg-primary/100/30 hover:bg-primary/100/50' : 'bg-muted hover:bg-muted'
                                    }`}
                                  >
                                    {getFileIcon(msg.attachment.filename, msg.attachment.content_type)}
                                    <div className="min-w-0 flex-1">
                                      <p className="text-xs font-medium truncate">{msg.attachment.filename}</p>
                                      <p className={`text-xs ${msg.sender_id === user?.user_id ? 'text-primary/40' : 'text-muted-foreground'}`}>
                                        {formatFileSize(msg.attachment.size)}
                                      </p>
                                    </div>
                                  </a>
                                )
                              )}
                              <div className={`flex items-center justify-end gap-1 mt-1 ${msg.sender_id === user?.user_id ? 'text-primary/40' : 'text-muted-foreground'}`}>
                                <span className="text-xs">{formatTime(msg.created_at)}</span>
                                {msg.sender_id === user?.user_id && (msg.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                              </div>
                            </div>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    </ScrollArea>
                  </CardContent>
                  <div className="p-4 border-t shrink-0">
                    {attachment && (
                      <div className="flex items-center gap-2 mb-2 p-2 bg-muted/50 rounded-lg">
                        {getFileIcon(attachment.name, attachment.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{attachment.name}</p>
                          <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setAttachment(null)} className="h-6 w-6 p-0 text-muted-foreground hover:text-red-500">
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input ref={fileInputRef} type="file" className="hidden"
                        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv,.doc,.docx"
                        onChange={handleDmFileSelect} data-testid="file-input"
                      />
                      <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="shrink-0" title="Attach file" data-testid="attach-btn">
                        <Paperclip className="w-4 h-4" />
                      </Button>
                      <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..."
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                        className="flex-1" data-testid="message-input"
                      />
                      <Button onClick={handleSendMessage} disabled={(!newMessage.trim() && !attachment) || sending} data-testid="send-btn">
                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <h3 className="text-lg font-medium text-muted-foreground">Select a conversation or channel</h3>
                    <p className="text-sm">Choose from the sidebar to start messaging</p>
                  </div>
                </div>
              )}
            </Card>

            {/* Thread panel */}
            {threadMsg && selectedChannel && (
              <Card className="w-80 shrink-0 flex flex-col">
                <CardHeader className="pb-2 border-b shrink-0 py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground text-sm">Thread</h3>
                      <p className="text-xs text-muted-foreground">#{selectedChannel.name}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setThreadMsg(null); setThreadReplies([]); }}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 p-3 overflow-hidden min-h-0">
                  <ScrollArea className="h-full">
                    {/* Root message */}
                    <div className="mb-4 pb-4 border-b">
                      <div className="flex items-start gap-2">
                        <Avatar className="w-7 h-7 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white text-xs">
                            {getInitials(threadMsg.sender_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-foreground">{threadMsg.sender_name}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(threadMsg.created_at)}</span>
                          </div>
                          {threadMsg.content && <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{threadMsg.content}</p>}
                          {renderAttachments(threadMsg.attachments, threadMsg.sender_id === user?.user_id)}
                        </div>
                      </div>
                    </div>
                    {/* Replies */}
                    <p className="text-xs text-muted-foreground mb-3 font-medium">
                      {threadReplies.length} {threadReplies.length === 1 ? 'reply' : 'replies'}
                    </p>
                    {threadReplies.map(reply => (
                      <div key={reply.msg_id} className="flex items-start gap-2 mb-3">
                        <Avatar className="w-6 h-6 shrink-0">
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs">
                            {getInitials(reply.sender_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-semibold text-foreground">{reply.sender_name}</span>
                            <span className="text-xs text-muted-foreground">{formatTime(reply.created_at)}</span>
                          </div>
                          {reply.content && <p className="text-sm text-foreground mt-0.5 whitespace-pre-wrap">{reply.content}</p>}
                          {renderAttachments(reply.attachments, reply.sender_id === user?.user_id)}
                        </div>
                      </div>
                    ))}
                    <div ref={threadEndRef} />
                  </ScrollArea>
                </CardContent>
                {/* Thread compose */}
                <div className="p-3 border-t shrink-0">
                  <FilePreviewStrip files={threadFiles} onRemove={i => setThreadFiles(prev => prev.filter((_, idx) => idx !== i))} />
                  <div className="flex gap-2 items-end">
                    <input ref={threadFileInputRef} type="file" className="hidden" multiple
                      accept="image/*,video/*,.pdf,.xlsx,.xls,.csv,.doc,.docx"
                      onChange={handleThreadFileSelect}
                    />
                    <Button variant="outline" size="icon" className="h-8 w-8 shrink-0" onClick={() => threadFileInputRef.current?.click()} title="Attach">
                      <Paperclip className="w-3.5 h-3.5" />
                    </Button>
                    <Textarea
                      value={threadText}
                      onChange={e => setThreadText(e.target.value)}
                      onPaste={handleThreadPaste}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendThreadReply(); } }}
                      placeholder="Reply in thread..."
                      className="flex-1 resize-none text-sm"
                      rows={1}
                      style={{ minHeight: 32, maxHeight: 96 }}
                    />
                    <Button onClick={handleSendThreadReply} disabled={(!threadText.trim() && !threadFiles.length) || sendingThread} size="icon" className="h-8 w-8 shrink-0">
                      {sendingThread ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                    </Button>
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
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> New Direct Message
            </DialogTitle>
          </DialogHeader>
          <div>
            <Label>Select User</Label>
            <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
              <SelectTrigger className="mt-1" data-testid="recipient-select">
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
            <Button onClick={handleStartNewChat} disabled={!selectedRecipient} data-testid="start-chat-btn">
              <MessageSquare className="w-4 h-4 mr-2" /> Start Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Channel dialog */}
      <Dialog open={newChannelDialog} onOpenChange={v => { setNewChannelDialog(v); if (!v) { setChannelName(''); setChannelDesc(''); setChannelMembers([]); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Hash className="w-5 h-5" /> Create Channel
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Channel Name *</Label>
              <Input className="mt-1" placeholder="e.g. general, ops-team, finance"
                value={channelName}
                onChange={e => setChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))}
              />
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
                      onChange={e => setChannelMembers(prev => e.target.checked ? [...prev, u.user_id] : prev.filter(id => id !== u.user_id))}
                    />
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
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <img src={lightboxUrl} alt="Full size" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
            <Button size="icon" className="absolute -top-3 -right-3 bg-black/60 hover:bg-black/80 text-white border-0 h-8 w-8" onClick={() => setLightboxUrl(null)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
