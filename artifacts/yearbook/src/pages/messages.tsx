import { useState, useEffect, useRef } from 'react';
import { useUser, Show } from '@clerk/react';
import { Link, useParams, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Search, ArrowLeft, MessageCircle, LogIn, Plus, X, Users, Check,
  Edit3, MoreHorizontal, Camera, Image as ImageIcon, Mic, Square, Smile,
  ThumbsUp, Paperclip, FileText, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { toast } from 'sonner';

const BASE = import.meta.env.BASE_URL;
const ATTACHMENT_PREFIX = 'YB_ATTACHMENT:';
const QUICK_EMOJIS = ['😀', '😂', '🥰', '😍', '😢', '😮', '👍', '❤️', '🎉', '🙏'];

type ChatAttachment = {
  type: 'image' | 'audio' | 'file';
  url: string;
  name: string;
  content_type: string;
  size: number;
  duration_seconds?: number;
};

function parseAttachment(content: string): ChatAttachment | null {
  if (!content.startsWith(ATTACHMENT_PREFIX)) return null;
  try {
    const value = JSON.parse(content.slice(ATTACHMENT_PREFIX.length)) as ChatAttachment;
    if (
      !['image', 'audio', 'file'].includes(value.type) ||
      typeof value.url !== 'string' ||
      !value.url.includes('/api/messages/attachments/')
    ) return null;
    return value;
  } catch {
    return null;
  }
}

function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

interface Conversation {
  partner_id: string;
  last_message: string;
  last_at: string;
  unread_count: number;
  full_name: string;
  nickname: string;
  photo_url: string;
  role: string;
  online?: boolean;
}

interface Message {
  id: number;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  full_name: string;
  nickname: string;
  photo_url: string;
}

interface UserItem {
  clerk_user_id: string;
  full_name: string;
  nickname: string;
  photo_url: string;
  role: string;
  online?: boolean;
}

interface Group {
  id: number;
  name: string;
  member_count: number;
  last_message?: string;
  last_at?: string;
}

interface Friend {
  clerk_user_id: string;
  full_name: string;
  nickname?: string;
  photo_url?: string;
  online?: boolean;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Vừa xong';
  if (mins < 60) return `${mins} phút trước`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} giờ trước`;
  return `${Math.floor(hrs / 24)} ngày trước`;
}

function displayName(u: { full_name?: string; nickname?: string }) {
  return u.nickname || u.full_name || 'Người dùng';
}

export default function Messages() {
  const { user } = useUser();
  const params = useParams<{ partnerId?: string; groupId?: string }>();
  const [, navigate] = useLocation();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [allUsers, setAllUsers] = useState<UserItem[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [groupMessages, setGroupMessages] = useState<Message[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedFriendIds, setSelectedFriendIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'groups' | 'people'>('all');
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const cancelRecordingRef = useRef(false);
  const recordingStartedAtRef = useRef(0);

  const partnerId = params?.partnerId;
  const groupId = params?.groupId ? Number(params.groupId) : undefined;

  const activeConv = conversations.find(c => c.partner_id === partnerId);
  const activeGroup = groups.find(g => g.id === groupId);

  // Load conversations
  const fetchConversations = () => {
    if (!user) return;
    fetch(`${BASE}api/messages/conversations`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => Array.isArray(data) && setConversations(data))
      .catch(() => {});
    fetch(`${BASE}api/groups`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => Array.isArray(data) && setGroups(data))
      .catch(() => {});
  };

  const fetchFriends = () => {
    if (!user) return;
    fetch(`${BASE}api/friends/list`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => Array.isArray(data) && setFriends(data))
      .catch(() => {});
  };

  const fetchGroupThread = () => {
    if (!user || !groupId) return;
    fetch(`${BASE}api/groups/${groupId}/messages`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => Array.isArray(data) && setGroupMessages(data))
      .catch(() => {});
  };

  // Load thread
  const fetchThread = () => {
    if (!user || !partnerId) return;
    fetch(`${BASE}api/messages/thread/${partnerId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!user) return;
    fetchConversations();
    fetchFriends();
    // Poll every 4 seconds
    pollRef.current = setInterval(() => {
      fetchConversations();
      fetchFriends();
      if (partnerId) fetchThread();
      if (groupId) fetchGroupThread();
    }, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [user, partnerId, groupId]);

  useEffect(() => {
    if (partnerId) {
      setMessages([]);
      fetchThread();
    }
    if (groupId) {
      setGroupMessages([]);
      fetchGroupThread();
    }
  }, [partnerId, groupId, user]);

  const postMessage = async (content: string, clearDraft = false) => {
    if (!content.trim() || (!partnerId && !groupId) || sending) return false;
    setSending(true);
    try {
      const url = groupId ? `${BASE}api/groups/${groupId}/messages` : `${BASE}api/messages/send`;
      const body = groupId
        ? { content: content.trim() }
        : { receiver_id: partnerId, content: content.trim() };
      const res = await fetch(url, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || 'Không gửi được tin nhắn.');
      }
      if (clearDraft) setText('');
      if (groupId) fetchGroupThread();
      else fetchThread();
      fetchConversations();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không gửi được tin nhắn.');
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendMessage = () => postMessage(text.trim(), true);

  const uploadAttachment = async (file: File | Blob, kind: 'image' | 'audio' | 'file', durationSeconds?: number) => {
    if (!partnerId && !groupId) return;
    const maxBytes = kind === 'image' ? 12 * 1024 * 1024 : 25 * 1024 * 1024;
    if (!file.size || file.size > maxBytes) {
      toast.error(kind === 'image' ? 'Ảnh không được vượt quá 12 MB.' : 'Tệp không được vượt quá 25 MB.');
      return;
    }

    const contentType = file.type || (kind === 'audio' ? 'audio/webm' : '');
    const name = file instanceof File ? file.name : `Tin nhắn thoại.${contentType.includes('mp4') ? 'm4a' : 'webm'}`;
    setUploadingAttachment(true);
    setAttachmentMenuOpen(false);
    try {
      const request = await fetch(`${BASE}api/messages/attachments/request-url`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind, content_type: contentType, size: file.size }),
      });
      const uploadDetails = await request.json().catch(() => ({}));
      if (!request.ok) throw new Error(uploadDetails.detail || 'Không thể chuẩn bị tải tệp lên.');

      const uploaded = await fetch(uploadDetails.uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });
      if (!uploaded.ok) throw new Error('Không thể tải tệp lên kho lưu trữ.');

      const attachment: ChatAttachment = {
        type: kind,
        url: `${BASE}api/messages/attachments/${uploadDetails.objectName}`,
        name,
        content_type: contentType,
        size: file.size,
        ...(durationSeconds ? { duration_seconds: durationSeconds } : {}),
      };
      const delivered = await postMessage(`${ATTACHMENT_PREFIX}${JSON.stringify(attachment)}`);
      if (delivered) toast.success(kind === 'audio' ? 'Đã gửi tin nhắn thoại.' : 'Đã gửi tệp đính kèm.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Không thể gửi tệp đính kèm.');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleSelectedFile = (event: React.ChangeEvent<HTMLInputElement>, forcedKind?: 'image') => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const mime = file.type.toLowerCase().split(';', 1)[0];
    const isAudio = mime.startsWith('audio/') || /\.(m4a|mp3|ogg|wav|webm|aac|3gp)$/i.test(file.name);
    const kind = forcedKind || (mime.startsWith('image/') ? 'image' : isAudio ? 'audio' : 'file');
    void uploadAttachment(file, kind);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error('Trình duyệt này chưa hỗ trợ ghi âm. Bạn có thể chọn tệp ghi âm có sẵn.');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      cancelRecordingRef.current = false;
      recordingStartedAtRef.current = Date.now();
      const mimeType = [
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/webm',
      ].find(type => MediaRecorder.isTypeSupported(type));
      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recorder.ondataavailable = event => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onerror = () => toast.error('Đã xảy ra lỗi khi ghi âm.');
      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);
        if (cancelRecordingRef.current) {
          cancelRecordingRef.current = false;
          setRecordSeconds(0);
          return;
        }
        const duration = Math.max(1, Math.round((Date.now() - recordingStartedAtRef.current) / 1000));
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        recordingChunksRef.current = [];
        if (blob.size) void uploadAttachment(blob, 'audio', duration);
        else toast.error('Bản ghi âm trống. Hãy thử ghi lại.');
      };
      recorder.start(250);
      setRecordSeconds(0);
      setIsRecording(true);
    } catch {
      toast.error('Không thể dùng micro. Hãy cấp quyền truy cập micro rồi thử lại.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  };

  const cancelRecording = () => {
    cancelRecordingRef.current = true;
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
    setIsRecording(false);
    setRecordSeconds(0);
  };

  useEffect(() => {
    if (!isRecording) return;
    const timer = window.setInterval(() => {
      const seconds = Math.floor((Date.now() - recordingStartedAtRef.current) / 1000);
      setRecordSeconds(seconds);
      if (seconds >= 300 && mediaRecorderRef.current?.state === 'recording') {
        toast.info('Đã đạt giới hạn ghi âm 5 phút.');
        mediaRecorderRef.current.stop();
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => () => {
    mediaRecorderRef.current?.stop();
    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
  }, []);

  const openNewChat = async () => {
    if (!allUsers.length) {
      const res = await fetch(`${BASE}api/users/list`, { credentials: 'include' });
      if (res.ok) setAllUsers(await res.json());
    }
    setShowPicker(true);
  };

  const openGroupModal = async () => {
    if (!friends.length) {
      const res = await fetch(`${BASE}api/friends/list`, { credentials: 'include' });
      if (res.ok) setFriends(await res.json());
    }
    setGroupName('');
    setSelectedFriendIds([]);
    setShowGroupModal(true);
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedFriendIds.length === 0) return;
    const res = await fetch(`${BASE}api/groups`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: groupName.trim(), member_ids: selectedFriendIds }),
    });
    if (res.ok) {
      const group = await res.json();
      setShowGroupModal(false);
      fetchConversations();
      navigate(`/tin-nhan/nhom/${group.id}`);
    }
  };

  const filteredConvs = conversations
    .filter(c => activeTab !== 'unread' || c.unread_count > 0)
    .filter(c => displayName(c).toLowerCase().includes(searchQ.toLowerCase()));
  const filteredUsers = allUsers.filter(u =>
    displayName(u).toLowerCase().includes(userSearch.toLowerCase())
  );
  const onlineFriends = friends.filter(friend => friend.online);
  const showGroups = activeTab === 'all' || activeTab === 'groups';
  const showConversations = activeTab === 'all' || activeTab === 'unread';
  const inboxTabs = [
    { id: 'all' as const, label: 'Tất cả' },
    { id: 'unread' as const, label: 'Chưa đọc' },
    { id: 'groups' as const, label: 'Nhóm' },
    { id: 'people' as const, label: 'Mọi người' },
  ];

  return (
    <div className="container mx-auto px-0 md:px-4 py-0 md:py-8 max-w-5xl">
      <Show when="signed-out">
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <MessageCircle className="w-14 h-14 text-muted-foreground" />
          <p className="text-muted-foreground">Đăng nhập để nhắn tin với bạn bè</p>
          <Link href="/sign-in"><Button className="gap-2"><LogIn className="w-4 h-4" />Đăng nhập</Button></Link>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="min-h-[100dvh] md:min-h-0 flex flex-col md:flex-row bg-[#FFFDF7] md:h-[75vh] md:rounded-3xl border border-[#E8E0CC] overflow-hidden shadow-sm">
          {/* Mobile Messenger-style inbox header */}
          {!partnerId && !groupId && (
            <div className="md:hidden bg-[#FFFDF7]">
              <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                <Link href="/" className="text-[22px] leading-none font-bold tracking-tight text-foreground">
                  Kỷ Yếu Lớp 9A
                </Link>
                <div className="flex items-center gap-3">
                  <button className="w-9 h-9 rounded-full hover:bg-[#F0EAD8] flex items-center justify-center" title="Tùy chọn">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                  <button onClick={openNewChat} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center" title="Tin nhắn mới">
                    <Edit3 className="w-[19px] h-[19px]" />
                  </button>
                </div>
              </div>
              <div className="px-5 pb-3">
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-[21px] h-[21px] text-muted-foreground" />
                  <Input
                    value={searchQ}
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="Tìm kiếm trên Messenger"
                    className="h-10 pl-10 rounded-full bg-[#F0EAD8] border-0 text-[13.5px]"
                  />
                </div>
              </div>
              <div className="flex gap-1 overflow-x-auto px-5 pb-2 border-b border-[#E8E0CC] scrollbar-none">
                {inboxTabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                      activeTab === tab.id ? 'bg-[#EAF2FF] text-[#1465C0]' : 'text-foreground hover:bg-[#F0EAD8]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Left sidebar — conversation list */}
          <div className={`w-full md:w-80 md:h-full min-h-0 flex flex-col border-r border-[#E8E0CC] shrink-0 ${partnerId || groupId ? 'hidden md:flex' : 'flex'}`}>
            <div className="hidden md:block p-4 border-b border-[#E8E0CC]">
              <div className="flex items-center justify-between mb-3">
                <Link href="/" className="font-bold text-lg hover:text-[#B8862F] transition-colors">Kỷ Yếu Lớp 9A</Link>
                <div className="flex items-center gap-1">
                  <button onClick={openNewChat} className="p-2 rounded-full hover:bg-muted transition-colors text-primary" title="Nhắn tin mới">
                    <Plus className="w-5 h-5" />
                  </button>
                  <button onClick={openGroupModal} className="p-2 rounded-full hover:bg-muted transition-colors text-primary" title="Tạo nhóm từ bạn bè">
                    <Users className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={searchQ}
                  onChange={e => setSearchQ(e.target.value)}
                  placeholder="Tìm kiếm..."
                  className="pl-9 rounded-xl bg-muted/50 border-0 text-sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'people' ? (
                onlineFriends.length > 0 ? (
                  <div>
                    <p className="px-5 pt-4 pb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Bạn bè đang online</p>
                    {onlineFriends.map(friend => {
                      const name = displayName(friend);
                      return (
                        <button
                          key={friend.clerk_user_id}
                          onClick={() => navigate(`/tin-nhan/${friend.clerk_user_id}`)}
                          className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#F0EAD8]/60 transition-colors text-left"
                        >
                          <div className="relative shrink-0">
                            {friend.photo_url
                              ? <img src={friend.photo_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                              : <AvatarGradient name={name} className="w-11 h-11" textClassName="text-base" />}
                            <span className="absolute right-0 bottom-0 w-3 h-3 rounded-full border-2 border-[#FFFDF7] bg-emerald-500" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{name}</p>
                            <p className="text-xs text-emerald-600">Đang hoạt động</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 px-8 text-center text-muted-foreground text-sm">
                    <Users className="w-9 h-9 mb-2 opacity-40" />
                    <p>Không có người dùng nào online</p>
                    <button onClick={openNewChat} className="mt-2 text-[#B8862F] hover:underline text-xs">
                      Tìm người để kết bạn
                    </button>
                  </div>
                )
              ) : (
              <>
              {showGroups && groups.length > 0 && (
                <div className="border-b border-[#E8E0CC] pb-2">
                  <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Nhóm</p>
                  {groups.map(group => (
                    <button key={group.id} onClick={() => navigate(`/tin-nhan/nhom/${group.id}`)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F0EAD8]/60 transition-colors text-left ${groupId === group.id ? 'bg-[#F0EAD8]' : ''}`}>
                      <div className="w-11 h-11 rounded-full bg-[#F0EAD8] text-[#B8862F] flex items-center justify-center shrink-0"><Users className="w-5 h-5" /></div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{group.member_count} thành viên{group.last_message ? ` · ${group.last_message}` : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showGroups && activeTab === 'groups' && groups.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                  <Users className="w-8 h-8 mb-2 opacity-40" />
                  <p>Chưa có nhóm nào</p>
                  <button onClick={openGroupModal} className="mt-2 text-[#B8862F] hover:underline text-xs">
                    Tạo nhóm từ bạn bè
                  </button>
                </div>
              )}
              {showConversations && filteredConvs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                  <MessageCircle className="w-8 h-8 mb-2 opacity-40" />
                  <p>{activeTab === 'unread' ? 'Không có tin nhắn chưa đọc' : 'Chưa có cuộc trò chuyện nào'}</p>
                  <button onClick={openNewChat} className="mt-2 text-[#B8862F] hover:underline text-xs">
                    Bắt đầu nhắn tin
                  </button>
                </div>
              )}
              {showConversations && filteredConvs.map(conv => (
                <button
                  key={conv.partner_id}
                  onClick={() => navigate(`/tin-nhan/${conv.partner_id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${
                    partnerId === conv.partner_id ? 'bg-[#F0EAD8]' : ''
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="relative">
                    {conv.photo_url
                      ? <img src={conv.photo_url} alt="" className="w-11 h-11 rounded-full object-cover" />
                      : <AvatarGradient name={displayName(conv)} className="w-11 h-11" textClassName="text-base" />
                    }
                    <span className={`absolute right-0 bottom-0 w-3 h-3 rounded-full border-2 border-card ${conv.online ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                    </div>
                    {conv.unread_count > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline">
                      <p className={`text-sm truncate ${conv.unread_count > 0 ? 'font-bold' : 'font-medium'}`}>
                        {displayName(conv)}
                      </p>
                      <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{timeAgo(conv.last_at)}</span>
                    </div>
                    <p className={`text-xs truncate mt-0.5 ${conv.unread_count > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {conv.last_message}
                    </p>
                  </div>
                </button>
              ))}
              </>
              )}
            </div>
          </div>

          {/* Right — message thread */}
          <div className={`flex-1 min-w-0 min-h-0 md:h-full flex flex-col ${!partnerId && !groupId ? 'hidden md:flex' : 'flex'}`}>
            {!partnerId && !groupId ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <MessageCircle className="w-12 h-12 opacity-30" />
                <p className="text-sm">Chọn một cuộc trò chuyện để bắt đầu</p>
                <button onClick={openNewChat} className="text-primary hover:underline text-sm">
                  + Nhắn tin với ai đó
                </button>
              </div>
            ) : (
              <>
                {/* Thread header */}
                <div className="px-4 py-3 border-b flex items-center gap-3">
                  <button
                    onClick={() => navigate('/tin-nhan')}
                    className="md:hidden p-2 -ml-2 rounded-full hover:bg-muted"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  {groupId ? (
                    <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center"><Users className="w-4 h-4" /></div>
                  ) : activeConv?.photo_url
                    ? <img src={activeConv.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                    : <AvatarGradient name={displayName(activeConv || { full_name: partnerId })} className="w-9 h-9" textClassName="text-sm" />
                  }
                  <div>
                    <p className="font-semibold text-sm">{groupId ? (activeGroup?.name || 'Nhóm') : (activeConv ? displayName(activeConv) : '...')}</p>
                    {groupId ? <p className="text-xs text-muted-foreground">{activeGroup?.member_count || 0} thành viên</p> : (
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <span className={`w-1.5 h-1.5 rounded-full ${activeConv?.online ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
                        {activeConv?.online ? 'Đang hoạt động' : 'Không hoạt động'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
                  {(groupId ? groupMessages : messages).map(msg => {
                    const isMine = msg.sender_id === user?.id;
                    const attachment = parseAttachment(msg.content);
                    return (
                      <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                        {!isMine && (
                          <div className="shrink-0 mt-auto">
                            {msg.photo_url
                              ? <img src={msg.photo_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                              : <AvatarGradient name={msg.full_name || ''} className="w-7 h-7" textClassName="text-xs" />
                            }
                          </div>
                        )}
                         <div className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-[13.5px] ${
                          isMine
                             ? 'bg-[#B8862F] text-white rounded-br-sm'
                             : 'bg-[#F0EAD8] text-foreground rounded-bl-sm'
                        }`}>
                          {attachment?.type === 'image' ? (
                            <a href={attachment.url} target="_blank" rel="noreferrer" aria-label={`Mở ảnh ${attachment.name}`}>
                              <img
                                src={attachment.url}
                                alt={attachment.name || 'Ảnh đính kèm'}
                                loading="lazy"
                                className="max-h-64 max-w-full rounded-xl object-contain"
                              />
                            </a>
                          ) : attachment?.type === 'audio' ? (
                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-1.5 text-xs">
                                <Mic className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">{attachment.name || 'Tin nhắn thoại'}</span>
                                {attachment.duration_seconds ? <span className="shrink-0 opacity-75">{formatDuration(attachment.duration_seconds)}</span> : null}
                              </div>
                              <audio controls preload="metadata" src={attachment.url} className="block h-9 w-[min(250px,65vw)] max-w-full" />
                            </div>
                          ) : attachment?.type === 'file' ? (
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noreferrer"
                              className="flex min-w-0 items-center gap-2"
                            >
                              <FileText className="w-5 h-5 shrink-0" />
                              <span className="truncate underline underline-offset-2">{attachment.name || 'Tệp đính kèm'}</span>
                            </a>
                          ) : (
                            msg.content
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="relative border-t border-[#E8E0CC] bg-[#FFFDF7] px-2 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] md:px-4">
                  {attachmentMenuOpen && (
                    <div className="absolute bottom-full left-2 z-20 mb-2 w-52 rounded-2xl border border-[#E8E0CC] bg-white p-1.5 shadow-lg">
                      <button
                        type="button"
                        onClick={() => { setAttachmentMenuOpen(false); fileInputRef.current?.click(); }}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[#F0EAD8]"
                      >
                        <Paperclip className="h-4 w-4 text-[#1465C0]" />
                        Chọn ảnh, âm thanh hoặc tệp
                      </button>
                    </div>
                  )}
                  {emojiPickerOpen && (
                    <div className="absolute bottom-full right-12 z-20 mb-2 grid grid-cols-5 gap-1 rounded-2xl border border-[#E8E0CC] bg-white p-2 shadow-lg">
                      {QUICK_EMOJIS.map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => { setText(current => `${current}${emoji}`); setEmojiPickerOpen(false); }}
                          className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-[#F0EAD8]"
                          aria-label={`Chèn ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                  <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={event => handleSelectedFile(event, 'image')}
                  />
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={event => handleSelectedFile(event, 'image')}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,audio/*,.pdf,.txt,.doc,.docx"
                    className="hidden"
                    onChange={event => handleSelectedFile(event)}
                  />
                  <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => { setAttachmentMenuOpen(open => !open); setEmojiPickerOpen(false); }}
                      disabled={uploadingAttachment || isRecording}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1465C0] hover:bg-[#EAF2FF] disabled:opacity-40 sm:h-9 sm:w-9"
                      title="Thêm tệp"
                      aria-label="Thêm tệp đính kèm"
                    >
                      <Plus className="h-6 w-6" />
                    </button>
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      disabled={uploadingAttachment || isRecording}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1465C0] hover:bg-[#EAF2FF] disabled:opacity-40 sm:h-9 sm:w-9"
                      title="Chụp ảnh"
                      aria-label="Chụp ảnh"
                    >
                      <Camera className="h-[22px] w-[22px]" />
                    </button>
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingAttachment || isRecording}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1465C0] hover:bg-[#EAF2FF] disabled:opacity-40 sm:h-9 sm:w-9"
                      title="Chọn ảnh"
                      aria-label="Chọn ảnh từ thiết bị"
                    >
                      <ImageIcon className="h-[22px] w-[22px]" />
                    </button>
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      disabled={uploadingAttachment || sending}
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-[#EAF2FF] disabled:opacity-40 sm:h-9 sm:w-9 ${isRecording ? 'text-red-600' : 'text-[#1465C0]'}`}
                      title={isRecording ? 'Dừng và gửi ghi âm' : 'Ghi âm'}
                      aria-label={isRecording ? 'Dừng và gửi ghi âm' : 'Bắt đầu ghi âm'}
                    >
                      {isRecording ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-[22px] w-[22px]" />}
                    </button>

                    {isRecording ? (
                      <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#F0EAD8] px-3 text-sm">
                        <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-600" />
                        <span className="truncate">Đang ghi âm</span>
                        <span className="shrink-0 tabular-nums">{formatDuration(recordSeconds)}</span>
                        <button
                          type="button"
                          onClick={cancelRecording}
                          className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5"
                          title="Hủy ghi âm"
                          aria-label="Hủy ghi âm"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <Input
                        value={text}
                        onChange={event => setText(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault();
                            void sendMessage();
                          }
                        }}
                        placeholder={uploadingAttachment ? 'Đang gửi tệp...' : 'Nhắn tin'}
                        disabled={uploadingAttachment}
                        className="h-10 min-w-0 flex-1 rounded-full border-0 bg-[#F0EAD8] px-3.5 text-[15px] focus-visible:ring-1 focus-visible:ring-[#1465C0]"
                      />
                    )}

                    {!isRecording && (
                      <button
                        type="button"
                        onClick={() => { setEmojiPickerOpen(open => !open); setAttachmentMenuOpen(false); }}
                        disabled={uploadingAttachment}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1465C0] hover:bg-[#EAF2FF] disabled:opacity-40 sm:h-9 sm:w-9"
                        title="Chọn biểu tượng cảm xúc"
                        aria-label="Chọn biểu tượng cảm xúc"
                      >
                        <Smile className="h-[22px] w-[22px]" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        if (text.trim()) void sendMessage();
                        else if (!uploadingAttachment && !sending) void postMessage('👍');
                      }}
                      disabled={sending || uploadingAttachment}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1465C0] hover:bg-[#EAF2FF] disabled:opacity-40 sm:h-9 sm:w-9"
                      title={text.trim() ? 'Gửi tin nhắn' : 'Gửi lượt thích'}
                      aria-label={text.trim() ? 'Gửi tin nhắn' : 'Gửi lượt thích'}
                    >
                      {sending || uploadingAttachment
                        ? <Loader2 className="h-5 w-5 animate-spin" />
                        : text.trim()
                          ? <Send className="h-[21px] w-[21px]" />
                          : <ThumbsUp className="h-[22px] w-[22px] fill-current" />}
                    </button>
                  </div>
                  {uploadingAttachment && (
                    <p className="mt-1 px-1 text-[11px] text-muted-foreground">Đang tải tệp lên…</p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* New group modal */}
        <AnimatePresence>
          {showGroupModal && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setShowGroupModal(false)}>
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                onClick={e => e.stopPropagation()} className="bg-card rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-bold">Tạo nhóm mới</h3>
                  <button onClick={() => setShowGroupModal(false)} className="p-1.5 rounded-full hover:bg-muted"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-4 space-y-3">
                  <Input value={groupName} onChange={e => setGroupName(e.target.value)} placeholder="Tên nhóm..." />
                  <p className="text-xs font-semibold text-muted-foreground">Chọn bạn bè để thêm vào nhóm</p>
                  <div className="max-h-56 overflow-y-auto space-y-1">
                    {friends.length === 0 ? <p className="text-sm text-muted-foreground py-5 text-center">Bạn chưa có bạn bè để thêm.</p> : friends.map(friend => {
                      const selected = selectedFriendIds.includes(friend.clerk_user_id);
                      const name = displayName(friend);
                      return <button key={friend.clerk_user_id} onClick={() => setSelectedFriendIds(ids => selected ? ids.filter(id => id !== friend.clerk_user_id) : [...ids, friend.clerk_user_id])}
                        className={`w-full flex items-center gap-3 p-2 rounded-xl text-left ${selected ? 'bg-primary/10' : 'hover:bg-muted/50'}`}>
                        {friend.photo_url ? <img src={friend.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" /> : <AvatarGradient name={name} className="w-9 h-9" textClassName="text-sm" />}
                        <span className="flex-1 text-sm font-medium">{name}</span>
                        {selected && <Check className="w-4 h-4 text-primary" />}
                      </button>;
                    })}
                  </div>
                  <Button onClick={createGroup} disabled={!groupName.trim() || selectedFriendIds.length === 0} className="w-full gap-2"><Users className="w-4 h-4" />Tạo nhóm</Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* New chat picker modal */}
        <AnimatePresence>
          {showPicker && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
              onClick={() => setShowPicker(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                className="bg-card rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
              >
                <div className="p-4 border-b flex items-center justify-between">
                  <h3 className="font-bold">Nhắn tin mới</h3>
                  <button onClick={() => setShowPicker(false)} className="p-1.5 rounded-full hover:bg-muted">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 border-b">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                      placeholder="Tìm tên..."
                      autoFocus
                      className="pl-9 rounded-xl bg-muted/50 border-0 text-sm"
                    />
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredUsers.length === 0 && (
                    <p className="text-center text-muted-foreground text-sm py-8">Không tìm thấy ai</p>
                  )}
                  {filteredUsers.map(u => (
                    <button
                      key={u.clerk_user_id}
                      onClick={() => { setShowPicker(false); navigate(`/tin-nhan/${u.clerk_user_id}`); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      {u.photo_url
                        ? <img src={u.photo_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        : <AvatarGradient name={displayName(u)} className="w-10 h-10" textClassName="text-sm" />
                      }
                      <div>
                        <p className="font-medium text-sm">{displayName(u)}</p>
                        <p className="text-xs text-muted-foreground">
                          {u.role === 'teacher' ? '🎓 Giáo viên' : '📚 Học sinh'}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Show>
    </div>
  );
}
