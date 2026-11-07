'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { ChatMessage, ChatChannelType, Task, User, StaffLevel } from '@/types';
import { getPersonalName } from '@/utils/nameHelper';
import {
  MessageSquare,
  Send,
  Image as ImageIcon,
  Paperclip,
  Check,
  CheckCheck,
  Search,
  Users,
  Globe,
  User as UserIcon,
  X,
  ChevronLeft,
  Sparkles,
  CheckSquare,
  AlertCircle,
  Clock,
  ChevronDown,
  Info,
} from 'lucide-react';

interface ConversationItem {
  id: string; // channelId
  type: ChatChannelType;
  title: string;
  subtitle: string;
  avatar?: string;
  isOnline?: boolean;
  recipientUser?: User;
  unreadCount: number;
  lastMessage?: ChatMessage;
}

export function ChatCenter() {
  const { currentUser, users, teams, tasks, messages, sendMessage, markChannelAsRead } = useApp();

  const [activeTab, setActiveTab] = useState<'ALL' | 'TEAMS' | 'DIRECT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState<string>('general');
  const [inputContent, setInputContent] = useState('');
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [previewImageModal, setPreviewImageModal] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate Direct Channel ID helper
  const getDirectChannelId = (userA: string, userB: string) => {
    return `direct--${[userA, userB].sort().join('--')}`;
  };

  // Build list of conversations
  const conversations: ConversationItem[] = React.useMemo(() => {
    const list: ConversationItem[] = [];

    // 1. General Channel (Kênh chung toàn cơ quan/công ty)
    const generalMessages = messages.filter((m) => m.channelId === 'general');
    const generalLastMsg = generalMessages[generalMessages.length - 1];
    const generalUnread = generalMessages.filter(
      (m) => m.senderId !== currentUser.id && !m.readBy?.includes(currentUser.id)
    ).length;

    list.push({
      id: 'general',
      type: 'GENERAL',
      title: 'Kênh Thông Báo Chung',
      subtitle: 'Toàn thể nhân sự & các phòng ban',
      unreadCount: generalUnread,
      lastMessage: generalLastMsg,
    });

    // 2. Team Channels (Tổ / Đội)
    teams.forEach((team) => {
      const teamChannelId = team.id;
      const teamMessages = messages.filter((m) => m.channelId === teamChannelId);
      const lastMsg = teamMessages[teamMessages.length - 1];
      const isMember = team.memberIds.includes(currentUser.id);
      const teamUnread = teamMessages.filter(
        (m) => m.senderId !== currentUser.id && !m.readBy?.includes(currentUser.id)
      ).length;

      list.push({
        id: teamChannelId,
        type: 'TEAM',
        title: team.name,
        subtitle: `${team.memberIds.length} thành viên ${isMember ? '• Tổ của bạn' : ''}`,
        unreadCount: teamUnread,
        lastMessage: lastMsg,
      });
    });

    // 3. Direct Conversations (1-1 với đồng nghiệp)
    users
      .filter((u) => u.id !== currentUser.id)
      .forEach((u) => {
        const directChannelId = getDirectChannelId(currentUser.id, u.id);
        const directMessages = messages.filter((m) => m.channelId === directChannelId);
        const lastMsg = directMessages[directMessages.length - 1];
        const directUnread = directMessages.filter(
          (m) => m.senderId !== currentUser.id && !m.readBy?.includes(currentUser.id)
        ).length;

        const levelText =
          u.role === 'ADMIN'
            ? 'Quản Trị Viên'
            : u.level === 'LEVEL_1_MANAGER' || u.role === 'MANAGER'
            ? 'Cấp 1 • Quản Lý'
            : u.level === 'LEVEL_2_SECRETARY' || u.role === 'SECRETARY'
            ? 'Cấp 2 • Điều Phối'
            : u.level === 'LEVEL_3_LEAD'
            ? 'Cấp 3 • Giám Sát'
            : 'Cấp 4 • Nhân Viên';

        list.push({
          id: directChannelId,
          type: 'DIRECT',
          title: getPersonalName(u.name, false),
          subtitle: levelText,
          avatar: u.avatar,
          recipientUser: u,
          unreadCount: directUnread,
          lastMessage: lastMsg,
        });
      });

    return list;
  }, [messages, currentUser, teams, users]);

  // Filter conversations
  const filteredConversations = conversations.filter((item) => {
    // Tab filter
    if (activeTab === 'TEAMS' && item.type !== 'TEAM') return false;
    if (activeTab === 'DIRECT' && item.type !== 'DIRECT') return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchSubtitle = item.subtitle.toLowerCase().includes(q);
      const matchLastMsg = item.lastMessage?.content.toLowerCase().includes(q);
      return matchTitle || matchSubtitle || matchLastMsg;
    }
    return true;
  });

  // Selected conversation object
  const currentConversation = conversations.find((c) => c.id === selectedChannelId) || conversations[0];

  // Active messages for the selected channel
  const activeMessages = messages.filter((m) => m.channelId === selectedChannelId);

  // Auto mark as read when selecting conversation or new messages arrive
  useEffect(() => {
    if (selectedChannelId) {
      markChannelAsRead(selectedChannelId);
    }
  }, [selectedChannelId, messages.length]);

  // Scroll to bottom on new messages or channel switch
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedChannelId, activeMessages.length]);

  // Handle image upload
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Vui lòng chọn ảnh dung lượng dưới 5MB!');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Send Message
  const handleSend = () => {
    if (!inputContent.trim() && !attachedImage) return;

    let recipientId: string | undefined = undefined;
    if (currentConversation.type === 'DIRECT' && currentConversation.recipientUser) {
      recipientId = currentConversation.recipientUser.id;
    }

    const linkedTask = tasks.find((t) => t.id === selectedTaskId);

    sendMessage({
      channelType: currentConversation.type,
      channelId: selectedChannelId,
      recipientId,
      content: inputContent.trim(),
      imageUrl: attachedImage || undefined,
      taskId: linkedTask?.id,
      taskTitle: linkedTask?.title,
    });

    setInputContent('');
    setAttachedImage(null);
    setSelectedTaskId('');
    setShowTaskSelector(false);
  };

  // Quick preset chips
  const quickChips = [
    '👍 Đã nhận lệnh',
    '🚀 Đang xử lý gấp',
    '📍 Đã có mặt tại hiện trường',
    '✅ Đã xử lý xong, chờ nghiệm thu',
    '⚠️ Cần hỗ trợ thêm vật tư / nhân lực',
  ];

  const handleQuickChip = (chip: string) => {
    setInputContent((prev) => (prev ? `${prev} - ${chip}` : chip));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-10rem)] sm:h-[calc(100vh-12rem)] min-h-[460px] sm:min-h-[580px]">
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT COLUMN: Conversation List */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-slate-200 flex flex-col bg-slate-50/50 ${
            selectedChannelId ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header & Search */}
          <div className="p-3.5 border-b border-slate-200 bg-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 leading-tight">Hộp Thư Điều Hành</h2>
                  <p className="text-[11px] text-slate-500">Trao đổi nội bộ & Điều phối</p>
                </div>
              </div>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kênh, tên đồng nghiệp..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-100 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl space-x-1 text-xs font-semibold">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`flex-1 py-1 rounded-lg text-center transition-all ${
                  activeTab === 'ALL' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tất cả
              </button>
              <button
                onClick={() => setActiveTab('TEAMS')}
                className={`flex-1 py-1 rounded-lg text-center transition-all ${
                  activeTab === 'TEAMS' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Tổ / Đội
              </button>
              <button
                onClick={() => setActiveTab('DIRECT')}
                className={`flex-1 py-1 rounded-lg text-center transition-all ${
                  activeTab === 'DIRECT' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                1-1 Trực tiếp
              </button>
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {filteredConversations.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Không tìm thấy cuộc trò chuyện nào</p>
              </div>
            ) : (
              filteredConversations.map((item) => {
                const isSelected = item.id === selectedChannelId;
                return (
                  <button
                    key={item.id}
                    onClick={() => setSelectedChannelId(item.id)}
                    className={`w-full p-3 flex items-start space-x-3 text-left transition-colors relative ${
                      isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-slate-100/70 bg-white'
                    }`}
                  >
                    {/* Avatar / Icon */}
                    <div className="relative shrink-0">
                      {item.type === 'GENERAL' ? (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <Globe className="w-5 h-5" />
                        </div>
                      ) : item.type === 'TEAM' ? (
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-xs">
                          <Users className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                          <UserIcon className="w-5 h-5 text-slate-600" />
                        </div>
                      )}
                      {item.type === 'DIRECT' && (
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white" />
                      )}
                    </div>

                    {/* Content preview */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <h3 className={`text-xs truncate ${isSelected ? 'font-bold text-blue-900' : 'font-semibold text-slate-900'}`}>
                          {item.title}
                        </h3>
                        {item.lastMessage && (
                          <span className="text-[10px] text-slate-400 ml-1 shrink-0">
                            {new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-500 truncate mb-1">{item.subtitle}</p>

                      {item.lastMessage ? (
                        <p className="text-[11px] text-slate-600 truncate flex items-center space-x-1">
                          <span className="text-slate-400 font-medium">{item.lastMessage.senderName}:</span>
                          <span>{item.lastMessage.content || (item.lastMessage.imageUrl ? '[Hình ảnh]' : '')}</span>
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">Chưa có tin nhắn</p>
                      )}
                    </div>

                    {/* Unread badge */}
                    {item.unreadCount > 0 && (
                      <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-xs">
                        {item.unreadCount > 9 ? '9+' : item.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Chat Room */}
        <div className={`flex-1 flex flex-col bg-white ${!selectedChannelId ? 'hidden md:flex' : 'flex'}`}>
          {/* Room Header */}
          <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between bg-white/95 backdrop-blur-xs z-10">
            <div className="flex items-center space-x-3 min-w-0">
              <button
                onClick={() => setSelectedChannelId('')}
                className="md:hidden p-1.5 -ml-1 text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="relative shrink-0">
                {currentConversation.type === 'GENERAL' ? (
                  <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                ) : currentConversation.type === 'TEAM' ? (
                  <div className="w-9 h-9 rounded-xl bg-purple-600 text-white flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
                    <UserIcon className="w-4 h-4 text-slate-600" />
                  </div>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold text-slate-900 truncate">{currentConversation.title}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold border border-slate-200 shrink-0">
                    {currentConversation.type === 'GENERAL'
                      ? 'Kênh chung'
                      : currentConversation.type === 'TEAM'
                      ? 'Tổ / Đội'
                      : 'Trực tiếp'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 truncate">{currentConversation.subtitle}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => markChannelAsRead(selectedChannelId)}
                title="Đánh dấu đã đọc tất cả"
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 hidden sm:inline-flex items-center space-x-1"
              >
                <Check className="w-3 h-3" />
                <span>Đã đọc</span>
              </button>
            </div>
          </div>

          {/* Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/40">
            {activeMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-700">Chưa có tin nhắn nào trong kênh này</h4>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Hãy gửi lời chào hoặc trao đổi chỉ đạo điều hành đầu tiên để bắt đầu công việc.
                </p>
              </div>
            ) : (
              activeMessages.map((msg, index) => {
                const isMe = msg.senderId === currentUser.id;

                const senderUser = users.find((u) => u.id === msg.senderId);
                const isSenderAdmin = senderUser?.role === 'ADMIN';

                // Level label
                const levelLabel = isSenderAdmin
                  ? 'Quản Trị Viên'
                  : msg.senderLevel === 'LEVEL_1_MANAGER'
                  ? 'Cấp 1 • Quản Lý'
                  : msg.senderLevel === 'LEVEL_2_SECRETARY'
                  ? 'Cấp 2 • Điều Phối'
                  : msg.senderLevel === 'LEVEL_3_LEAD'
                  ? 'Cấp 3 • Giám Sát'
                  : 'Cấp 4 • Nhân Viên';

                const levelBadgeClass = isSenderAdmin
                  ? 'bg-indigo-950 text-indigo-100 border border-indigo-800'
                  : msg.senderLevel === 'LEVEL_1_MANAGER'
                  ? 'bg-amber-100 text-amber-800'
                  : msg.senderLevel === 'LEVEL_2_SECRETARY'
                  ? 'bg-blue-100 text-blue-800'
                  : msg.senderLevel === 'LEVEL_3_LEAD'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-emerald-100 text-emerald-800';

                return (
                  <div
                    key={msg.id || index}
                    className={`flex items-end space-x-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] sm:max-w-md md:max-w-lg space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                      {/* Sender Info for incoming messages */}
                      {!isMe && (
                        <div className="flex items-center space-x-1.5 px-1">
                          <span className="text-[11px] font-bold text-slate-800">{msg.senderName}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${levelBadgeClass}`}>
                            {levelLabel}
                          </span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl p-3 shadow-xs space-y-2 ${
                          isMe
                            ? 'bg-blue-600 text-white rounded-br-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                        }`}
                      >
                        {/* Linked Task Tag if present */}
                        {msg.taskId && (
                          <div
                            className={`p-2 rounded-xl text-xs flex items-center space-x-2 ${
                              isMe ? 'bg-blue-700/60 text-blue-100' : 'bg-blue-50 text-blue-900 border border-blue-100'
                            }`}
                          >
                            <CheckSquare className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                            <div className="min-w-0">
                              <span className="text-[10px] uppercase font-bold tracking-wider opacity-80 block">
                                Việc liên kết
                              </span>
                              <span className="font-semibold truncate block">{msg.taskTitle || 'Chi tiết công việc'}</span>
                            </div>
                          </div>
                        )}

                        {/* Image Preview */}
                        {msg.imageUrl && (
                          <div className="rounded-xl overflow-hidden cursor-pointer">
                            <img
                              src={msg.imageUrl}
                              alt="Đính kèm"
                              onClick={() => setPreviewImageModal(msg.imageUrl || null)}
                              className="w-full max-h-60 object-cover rounded-xl hover:opacity-95 transition-opacity"
                            />
                          </div>
                        )}

                        {/* Text Content */}
                        {msg.content && <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>}

                        {/* Timestamp & read status */}
                        <div
                          className={`flex items-center justify-end space-x-1 text-[10px] ${
                            isMe ? 'text-blue-100' : 'text-slate-400'
                          }`}
                        >
                          <span>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {isMe && <CheckCheck className="w-3 h-3 text-blue-200" />}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Reply Chips Bar */}
          <div className="px-3 py-1.5 bg-slate-100/70 border-t border-slate-200 flex items-center space-x-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0 flex items-center space-x-1 mr-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Phản hồi nhanh:</span>
            </span>
            {quickChips.map((chip, idx) => (
              <button
                key={idx}
                onClick={() => handleQuickChip(chip)}
                className="shrink-0 text-[11px] font-medium bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-600 px-2.5 py-1 rounded-full border border-slate-200 transition-colors shadow-2xs"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Attachment Preview Box */}
          {(attachedImage || selectedTaskId) && (
            <div className="px-4 py-2 bg-blue-50/70 border-t border-blue-200 flex items-center justify-between gap-2">
              <div className="flex items-center space-x-3 overflow-hidden">
                {attachedImage && (
                  <div className="relative shrink-0">
                    <img src={attachedImage} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-blue-300" />
                    <button
                      onClick={() => setAttachedImage(null)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full flex items-center justify-center text-[10px]"
                    >
                      ×
                    </button>
                  </div>
                )}
                {selectedTaskId && (
                  <div className="flex items-center space-x-1 text-xs text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-blue-200 truncate">
                    <CheckSquare className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="font-semibold truncate">
                      Gắn thẻ: {tasks.find((t) => t.id === selectedTaskId)?.title}
                    </span>
                    <button onClick={() => setSelectedTaskId('')} className="ml-1 text-slate-400 hover:text-rose-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Task Selector Dropdown Overlay */}
          {showTaskSelector && (
            <div className="px-4 py-2 bg-white border-t border-slate-200 max-h-48 overflow-y-auto space-y-1">
              <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-700">Chọn công việc cần liên kết vào tin nhắn:</span>
                <button onClick={() => setShowTaskSelector(false)} className="text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {tasks.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">Chưa có công việc nào</p>
              ) : (
                tasks.slice(0, 10).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTaskId(t.id);
                      setShowTaskSelector(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-blue-50 text-xs flex items-center justify-between transition-colors"
                  >
                    <span className="font-semibold text-slate-800 truncate">{t.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0 ml-2">
                      {t.isDaily ? 'Việc hằng ngày' : 'Dự án'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}

          {/* Chat Input Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-end space-x-2">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageChange}
              accept="image/*"
              className="hidden"
            />

            {/* Attach Image Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-colors shrink-0"
              title="Đính kèm hình ảnh hiện trường"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* Tag Task Button */}
            <button
              onClick={() => setShowTaskSelector(!showTaskSelector)}
              className={`p-2 rounded-xl transition-colors shrink-0 ${
                selectedTaskId || showTaskSelector
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50'
              }`}
              title="Gắn thẻ công việc"
            >
              <CheckSquare className="w-5 h-5" />
            </button>

            {/* Input textarea */}
            <textarea
              value={inputContent}
              onChange={(e) => setInputContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Nhắn tin trong ${currentConversation.title}... (Enter để gửi)`}
              rows={1}
              className="flex-1 max-h-24 p-2 bg-slate-100 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white resize-none transition-all"
            />

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!inputContent.trim() && !attachedImage}
              className="p-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 transition-colors shadow-sm shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImageModal && (
        <div
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in"
        >
          <div className="relative max-w-3xl max-h-[90vh]">
            <img
              src={previewImageModal}
              alt="Ảnh phóng to"
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl"
            />
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-slate-800 flex items-center justify-center font-bold shadow-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
