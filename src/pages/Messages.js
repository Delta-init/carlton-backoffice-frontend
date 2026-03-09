import { useEffect, useState, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ScrollArea } from "../components/ui/scroll-area";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import {
  MessageSquare,
  Send,
  Users,
  User,
  Search,
  Plus,
  Check,
  CheckCheck,
  Loader2,
  Clock,
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  File,
} from "lucide-react";

const API_URL = process.env.REACT_APP_BACKEND_URL;

export default function Messages() {
  const { user, getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [attachment, setAttachment] = useState(null);
  const fileInputRef = useRef(null);
  const [newChatDialog, setNewChatDialog] = useState(false);
  const [selectedRecipient, setSelectedRecipient] = useState("");
  const messagesEndRef = useRef(null);

  // Admin view state
  const [viewMode, setViewMode] = useState("my"); // 'my' or 'all'
  const [allConversations, setAllConversations] = useState([]);
  const [selectedAllConversation, setSelectedAllConversation] = useState(null);
  const [allMessages, setAllMessages] = useState([]);
  const [loadingAll, setLoadingAll] = useState(false);

  const isAdmin = user?.role === "admin";

const fetchUsers = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/messages/users`, { headers: getAuthHeaders() });
      if (response.ok) {
        setUsers(await response.json());
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }, [getAuthHeaders]);

  
  // Fetch conversations
  const fetchConversations = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/messages/conversations`, {
        headers: getAuthHeaders(),
      });
      if (response.ok) {
        setConversations(await response.json());
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    }
  }, [getAuthHeaders]);

  // Fetch messages for a conversation
  const fetchMessages = useCallback(
    async (recipientId) => {
      if (!recipientId) return;
      try {
        const response = await fetch(
          `${API_URL}/api/messages/conversation/${recipientId}`,
          {
            headers: getAuthHeaders(),
          },
        );
        if (response.ok) {
          setMessages(await response.json());
          // Scroll to bottom
          setTimeout(
            () =>
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }),
            100,
          );
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      }
    },
    [getAuthHeaders],
  );

  // Admin: Fetch all conversations in the system
  const fetchAllConversations = useCallback(async () => {
    if (!isAdmin) return;
    setLoadingAll(true);
    try {
      const response = await fetch(
        `${API_URL}/api/messages/admin/all-conversations`,
        {
          headers: getAuthHeaders(),
        },
      );
      if (response.ok) {
        setAllConversations(await response.json());
      }
    } catch (error) {
      console.error("Error fetching all conversations:", error);
    } finally {
      setLoadingAll(false);
    }
  }, [getAuthHeaders, isAdmin]);

  // Admin: Fetch messages between two users
  const fetchConversationMessages = useCallback(
    async (user1Id, user2Id) => {
      if (!isAdmin) return;
      try {
        const response = await fetch(
          `${API_URL}/api/messages/admin/conversation/${user1Id}/${user2Id}`,
          {
            headers: getAuthHeaders(),
          },
        );
        if (response.ok) {
          setAllMessages(await response.json());
        }
      } catch (error) {
        console.error("Error fetching conversation messages:", error);
      }
    },
    [getAuthHeaders, isAdmin],
  );

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchUsers(), fetchConversations()]);
      setLoading(false);
    };
    init();
  }, [fetchUsers, fetchConversations]);

  // Fetch all conversations when admin switches to 'all' view
  useEffect(() => {
    if (viewMode === "all" && isAdmin) {
      fetchAllConversations();
    }
  }, [viewMode, isAdmin, fetchAllConversations]);

  // Fetch messages when admin selects a conversation
  useEffect(() => {
    if (selectedAllConversation && isAdmin) {
      fetchConversationMessages(
        selectedAllConversation.user1_id,
        selectedAllConversation.user2_id,
      );
    }
  }, [selectedAllConversation, isAdmin, fetchConversationMessages]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.user_id);
      // Mark as read
      markAsRead(selectedConversation.user_id);
    }
  }, [selectedConversation, fetchMessages]);

  // Auto-refresh messages every 10 seconds
  useEffect(() => {
    if (selectedConversation) {
      const interval = setInterval(() => {
        fetchMessages(selectedConversation.user_id);
      }, 10000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation, fetchMessages]);

  const markAsRead = async (recipientId) => {
    try {
      await fetch(`${API_URL}/api/messages/mark-read/${recipientId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
      });
      fetchConversations();
    } catch (error) {
      console.error("Error marking as read:", error);
    }
  };

  const handleSendMessage = async () => {
    if ((!newMessage.trim() && !attachment) || !selectedConversation) return;

    setSending(true);
    try {
      const formData = new FormData();
      formData.append("recipient_id", selectedConversation.user_id);
      formData.append("content", newMessage);
      if (attachment) {
        formData.append("attachment", attachment);
      }

      const headers = { ...getAuthHeaders() };
      delete headers["Content-Type"]; // Let browser set multipart boundary

      const response = await fetch(`${API_URL}/api/messages/send`, {
        method: "POST",
        headers,
        body: formData,
      });

      if (response.ok) {
        setNewMessage("");
        setAttachment(null);
        fetchMessages(selectedConversation.user_id);
        fetchConversations();
      } else {
        const err = await response.json();
        toast.error(err.detail || "Failed to send message");
      }
    } catch (error) {
      toast.error("Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size exceeds 10MB limit");
      return;
    }
    setAttachment(file);
    e.target.value = "";
  };

  const getFileIcon = (filename, contentType) => {
    const ext = (filename || "").split(".").pop().toLowerCase();
    const type = contentType || "";
    if (
      type.startsWith("image/") ||
      ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)
    )
      return <ImageIcon className="w-4 h-4 text-green-400" />;
    if (ext === "pdf" || type === "application/pdf")
      return <FileText className="w-4 h-4 text-red-400" />;
    if (["xlsx", "xls", "csv"].includes(ext) || type.includes("spreadsheet"))
      return <FileSpreadsheet className="w-4 h-4 text-emerald-400" />;
    return <File className="w-4 h-4 text-slate-400" />;
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleStartNewChat = () => {
    if (!selectedRecipient) {
      toast.error("Please select a user");
      return;
    }

    const recipient = users.find((u) => u.user_id === selectedRecipient);
    if (recipient) {
      setSelectedConversation({
        user_id: recipient.user_id,
        name: recipient.name,
        email: recipient.email,
        role: recipient.role,
      });
      setNewChatDialog(false);
      setSelectedRecipient("");
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "Yesterday";
    } else if (diffDays < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInitials = (name) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const filteredAllConversations = allConversations.filter(
    (c) =>
      c.user1_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.user2_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Messages</h1>
          <p className="text-slate-500 mt-1">Internal messaging system</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Admin View Toggle */}
          {isAdmin && (
            <div className="flex items-center bg-foreground/10 rounded-xl p-1">
              <Button
                variant={viewMode === "my" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("my")}
                className="rounded-xl"
                data-testid="view-my-messages"
              >
                <User className="w-4 h-4 mr-1" /> My Messages
              </Button>
              <Button
                variant={viewMode === "all" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("all")}
                className="rounded-xl text-white"
                data-testid="view-all-messages"
              >
                <Users className="w-4 h-4 mr-1" /> All Communications
              </Button>
            </div>
          )}
          <Button
            onClick={() => setNewChatDialog(true)}
            data-testid="new-chat-btn"
          >
            <Plus className="w-4 h-4 mr-2" /> New Message
          </Button>
        </div>
      </div>

      {/* Admin: All Communications View */}
      {isAdmin && viewMode === "all" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          {/* All Conversations List */}
          <Card className="md:col-span-1 flex flex-col">
            <CardHeader className="pb-2 border-b">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="w-4 h-4" /> All User Conversations
              </CardTitle>
              <div className="relative mt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-[500px]">
                {loadingAll ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : filteredAllConversations.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No conversations found</p>
                  </div>
                ) : (
                  filteredAllConversations.map((conv, idx) => (
                    <div
                      key={idx}
                      onClick={() => setSelectedAllConversation(conv)}
                      className={`p-4 border-b cursor-pointer hover:bg-slate-50 transition-colors ${
                        selectedAllConversation?.user1_id === conv.user1_id &&
                        selectedAllConversation?.user2_id === conv.user2_id
                          ? "bg-blue-50 border-l-4 border-l-blue-500"
                          : ""
                      }`}
                      data-testid={`all-conv-${idx}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          <Avatar className="w-8 h-8 border-2 border-white">
                            <AvatarFallback className="bg-blue-100 text-blue-700 text-xs">
                              {getInitials(conv.user1_name)}
                            </AvatarFallback>
                          </Avatar>
                          <Avatar className="w-8 h-8 border-2 border-white">
                            <AvatarFallback className="bg-purple-100 text-purple-700 text-xs">
                              {getInitials(conv.user2_name)}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-800 truncate">
                              {conv.user1_name} & {conv.user2_name}
                            </p>
                            <span className="text-xs text-slate-400">
                              {conv.message_count} msgs
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            Last: {formatDate(conv.last_message_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Message Thread */}
          <Card className="md:col-span-2 flex flex-col">
            <CardHeader className="border-b py-3">
              {selectedAllConversation ? (
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <Avatar className="w-10 h-10 border-2 border-white">
                      <AvatarFallback className="bg-blue-100 text-blue-700">
                        {getInitials(selectedAllConversation.user1_name)}
                      </AvatarFallback>
                    </Avatar>
                    <Avatar className="w-10 h-10 border-2 border-white">
                      <AvatarFallback className="bg-purple-100 text-purple-700">
                        {getInitials(selectedAllConversation.user2_name)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div>
                    <CardTitle className="text-base">
                      {selectedAllConversation.user1_name} &{" "}
                      {selectedAllConversation.user2_name}
                    </CardTitle>
                    <p className="text-xs text-slate-500">
                      Viewing conversation between users
                    </p>
                  </div>
                </div>
              ) : (
                <CardTitle className="text-slate-400">
                  Select a conversation
                </CardTitle>
              )}
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              {selectedAllConversation ? (
                <ScrollArea className="h-[450px] p-4">
                  <div className="space-y-4">
                    {allMessages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.sender_id === selectedAllConversation.user1_id ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[70%] ${
                            msg.sender_id === selectedAllConversation.user1_id
                              ? "bg-slate-100"
                              : "bg-purple-100"
                          } rounded-xl px-4 py-2`}
                        >
                          <p className="text-xs font-medium text-slate-600 mb-1">
                            {msg.sender_name}
                          </p>
                          <p className="text-sm text-slate-800">
                            {msg.content}
                          </p>
                          <div className="flex items-center justify-end gap-1 mt-1">
                            <span className="text-xs text-slate-400">
                              {formatDate(msg.created_at)}
                            </span>
                            {msg.read && (
                              <CheckCheck className="w-3 h-3 text-blue-500" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <div className="text-center">
                    <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Select a conversation to view messages</p>
                  </div>
                </div>
              )}
            </CardContent>
            {/* Admin view is read-only - no send button */}
            {selectedAllConversation && (
              <div className="p-3 border-t bg-slate-50">
                <p className="text-xs text-slate-500 text-center">
                  Admin view - Read only access to all communications
                </p>
              </div>
            )}
          </Card>
        </div>
      ) : (
        /* Regular User View */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-full">
          {/* Conversations List */}
          <Card className="md:col-span-1 flex flex-col">
            <CardHeader className="pb-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search conversations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-[500px]">
                {filteredConversations.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-sm">Start a new message</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredConversations.map((conv) => (
                      <div
                        key={conv.user_id}
                        className={`p-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                          selectedConversation?.user_id === conv.user_id
                            ? "bg-blue-50"
                            : ""
                        }`}
                        onClick={() => setSelectedConversation(conv)}
                        data-testid={`conversation-${conv.user_id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="w-10 h-10">
                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-sm">
                              {getInitials(conv.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-slate-800 truncate">
                                {conv.name}
                              </span>
                              <span className="text-xs text-slate-400">
                                {formatTime(conv.last_message_at)}
                              </span>
                            </div>
                            <p className="text-sm text-slate-500 truncate">
                              {conv.last_message}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <Badge variant="outline" className="text-xs">
                                {conv.role}
                              </Badge>
                              {conv.unread_count > 0 && (
                                <Badge className="bg-blue-600 text-white text-xs">
                                  {conv.unread_count}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Chat Area */}
          <Card className="md:col-span-2 flex flex-col">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        {getInitials(selectedConversation.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold text-slate-800">
                        {selectedConversation.name}
                      </h3>
                      <p className="text-sm text-slate-500">
                        {selectedConversation.email}
                      </p>
                    </div>
                    <Badge variant="outline" className="ml-auto">
                      {selectedConversation.role}
                    </Badge>
                  </div>
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 p-4 overflow-hidden">
                  <ScrollArea className="h-[350px] pr-4">
                    <div className="space-y-4">
                      {messages.length === 0 ? (
                        <div className="text-center py-12 text-slate-400">
                          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No messages yet</p>
                          <p className="text-sm">Start the conversation</p>
                        </div>
                      ) : (
                        messages.map((msg) => (
                          <div
                            key={msg.message_id}
                            className={`flex ${msg.sender_id === user?.user_id ? "justify-end" : "justify-start"}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                                msg.sender_id === user?.user_id
                                  ? "bg-blue-600 text-white rounded-br-md"
                                  : "bg-slate-100 text-slate-800 rounded-bl-md"
                              }`}
                            >
                              {msg.content && (
                                <p className="text-sm">{msg.content}</p>
                              )}
                              {msg.attachment && (
                                <a
                                  href={`${API_URL}/api/messages/attachment/${msg.message_id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    const token =
                                      localStorage.getItem("auth_token");
                                    fetch(
                                      `${API_URL}/api/messages/attachment/${msg.message_id}`,
                                      {
                                        headers: {
                                          Authorization: `Bearer ${token}`,
                                        },
                                      },
                                    )
                                      .then((r) => r.blob())
                                      .then((blob) => {
                                        const url = URL.createObjectURL(blob);
                                        const a = document.createElement("a");
                                        a.href = url;
                                        a.download = msg.attachment.filename;
                                        a.click();
                                        URL.revokeObjectURL(url);
                                      })
                                      .catch(() =>
                                        toast.error("Download failed"),
                                      );
                                  }}
                                  className={`flex items-center gap-2 mt-1 p-2 rounded-xl cursor-pointer ${
                                    msg.sender_id === user?.user_id
                                      ? "bg-blue-500/30 hover:bg-blue-500/50"
                                      : "bg-slate-200 hover:bg-slate-300"
                                  }`}
                                  data-testid={`attachment-${msg.message_id}`}
                                >
                                  {getFileIcon(
                                    msg.attachment.filename,
                                    msg.attachment.content_type,
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs font-medium truncate">
                                      {msg.attachment.filename}
                                    </p>
                                    <p
                                      className={`text-xs ${msg.sender_id === user?.user_id ? "text-blue-200" : "text-slate-400"}`}
                                    >
                                      {formatFileSize(msg.attachment.size)}
                                    </p>
                                  </div>
                                </a>
                              )}
                              <div
                                className={`flex items-center justify-end gap-1 mt-1 ${
                                  msg.sender_id === user?.user_id
                                    ? "text-blue-200"
                                    : "text-slate-400"
                                }`}
                              >
                                <span className="text-xs">
                                  {formatTime(msg.created_at)}
                                </span>
                                {msg.sender_id === user?.user_id &&
                                  (msg.read ? (
                                    <CheckCheck className="w-3 h-3" />
                                  ) : (
                                    <Check className="w-3 h-3" />
                                  ))}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>
                </CardContent>

                {/* Message Input */}
                <div className="p-4 border-t">
                  {attachment && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-slate-50 rounded-xl">
                      {getFileIcon(attachment.name, attachment.type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {attachment.name}
                        </p>
                        <p className="text-xs text-slate-400">
                          {formatFileSize(attachment.size)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAttachment(null)}
                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.xlsx,.xls,.csv,.doc,.docx"
                      onChange={handleFileSelect}
                      data-testid="file-input"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      className="shrink-0"
                      title="Attach file"
                      data-testid="attach-btn"
                    >
                      <Paperclip className="w-4 h-4" />
                    </Button>
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      onKeyPress={(e) =>
                        e.key === "Enter" && !e.shiftKey && handleSendMessage()
                      }
                      className="flex-1"
                      data-testid="message-input"
                    />
                    <Button
                      onClick={handleSendMessage}
                      disabled={(!newMessage.trim() && !attachment) || sending}
                      data-testid="send-btn"
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-400">
                <div className="text-center">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-medium text-slate-600">
                    Select a conversation
                  </h3>
                  <p className="text-sm">
                    Choose from your existing conversations or start a new one
                  </p>
                </div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* New Chat Dialog */}
      <Dialog open={newChatDialog} onOpenChange={setNewChatDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" /> New Message
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Select User</Label>
              <Select
                value={selectedRecipient}
                onValueChange={setSelectedRecipient}
              >
                <SelectTrigger className="mt-1" data-testid="recipient-select">
                  <SelectValue placeholder="Choose a user to message..." />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.user_id} value={u.user_id}>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{u.name}</span>
                        <Badge variant="outline" className="ml-2 text-xs">
                          {u.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewChatDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleStartNewChat} disabled={!selectedRecipient}>
              <MessageSquare className="w-4 h-4 mr-2" /> Start Chat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
