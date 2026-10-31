import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useUser, Show } from '@clerk/react';
import { Link, useParams, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Search, ArrowLeft, MessageCircle, LogIn, Plus, X, Users, Check,
  Edit3, MoreHorizontal, Camera, Image as ImageIcon, Mic, Square, Smile,
  ThumbsUp, Paperclip, FileText, Loader2, Video, Play, Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { toast } from 'sonner';

const BASE = import.meta.env.BASE_URL;
const ATTACHMENT_PREFIX = 'YB_ATTACHMENT:';
const QUICK_EMOJIS = ['😀', '😂', '🥰', '😍', '😢', '😮', '👍', '❤️', '🎉', '🙏'];

type AttachmentKind = 'image' | 'video' | 'audio' | 'file';

type ChatAttachment = {
  type: AttachmentKind;
  url: string;
  name: string;
  content_type: string;
  size: number;
  duration_seconds?: number;
};

type PendingAttachment = {
  file: File | Blob;
  type: AttachmentKind;
  name: string;
  contentType: string;
  durationSeconds?: number;
  previewUrl?: string;
};

function parseAttachment(content: string): ChatAttachment | null {
  if (!content.startsWith(ATTACHMENT_PREFIX)) return null;

  try {
    const value = JSON.parse(
      content.slice(ATTACHMENT_PREFIX.length),
    ) as ChatAttachment;

    if (
      !['image', 'video', 'audio', 'file'].includes(value.type) ||
      typeof value.url !== 'string' ||
      !value.url.includes('/api/messages/attachments/')
    ) {
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

function formatDuration(seconds = 0) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
  const [activeTab, setActiveTab] = useState<
    'all' | 'unread' | 'groups' | 'people'
  >('all');

  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  // Tệp được chọn hoặc ghi âm sẽ nằm ở đây cho đến khi người dùng gửi.
  const [pendingAttachment, setPendingAttachment] =
    useState<PendingAttachment | null>(null);

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
  const groupId = params?.groupId
    ? Number(params.groupId)
    : undefined;

  const activeConv = conversations.find(
    conversation => conversation.partner_id === partnerId,
  );

  const activeGroup = groups.find(group => group.id === groupId);

  const fetchConversations = () => {
    if (!user) return;

    fetch(`${BASE}api/messages/conversations`, {
      credentials: 'include',
    })
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data)) setConversations(data);
      })
      .catch(() => {});

    fetch(`${BASE}api/groups`, { credentials: 'include' })
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data)) setGroups(data);
      })
      .catch(() => {});
  };

  const fetchFriends = () => {
    if (!user) return;

    fetch(`${BASE}api/friends/list`, { credentials: 'include' })
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data)) setFriends(data);
      })
      .catch(() => {});
  };

  const fetchGroupThread = () => {
    if (!user || !groupId) return;

    fetch(`${BASE}api/groups/${groupId}/messages`, {
      credentials: 'include',
    })
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data)) setGroupMessages(data);
      })
      .catch(() => {});
  };

  const fetchThread = () => {
    if (!user || !partnerId) return;

    fetch(`${BASE}api/messages/thread/${partnerId}`, {
      credentials: 'include',
    })
      .then(response => response.json())
      .then(data => {
        if (Array.isArray(data)) {
          setMessages(data);
          setTimeout(() => {
            bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (!user) return;

    fetchConversations();
    fetchFriends();

    pollRef.current = setInterval(() => {
      fetchConversations();
      fetchFriends();

      if (partnerId) fetchThread();
      if (groupId) fetchGroupThread();
    }, 4000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
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

  const postMessage = async (
    content: string,
    clearDraft = false,
  ): Promise<boolean> => {
    if (!content.trim() || (!partnerId && !groupId) || sending) {
      return false;
    }

    setSending(true);

    try {
      const url = groupId
        ? `${BASE}api/groups/${groupId}/messages`
        : `${BASE}api/messages/send`;

      const body = groupId
        ? { content: content.trim() }
        : { receiver_id: partnerId, content: content.trim() };

      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(
          error.detail || 'Không gửi được tin nhắn.',
        );
      }

      if (clearDraft) setText('');

      if (groupId) fetchGroupThread();
      else fetchThread();

      fetchConversations();
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không gửi được tin nhắn.',
      );
      return false;
    } finally {
      setSending(false);
    }
  };

  const sendMessage = () => postMessage(text.trim(), true);

  // Chỉ upload khi người dùng bấm nút Gửi trong phần xem trước.
  const uploadAttachment = async (pending: PendingAttachment) => {
    if (!partnerId && !groupId) return;

    const { file, type, name, contentType, durationSeconds } = pending;
    const maxBytes =
      type === 'image' ? 12 * 1024 * 1024 : 25 * 1024 * 1024;

    if (!file.size || file.size > maxBytes) {
      toast.error(
        type === 'image'
          ? 'Ảnh không được vượt quá 12 MB.'
          : 'Tệp không được vượt quá 25 MB.',
      );
      return;
    }

    setUploadingAttachment(true);
    setAttachmentMenuOpen(false);

    try {
      const request = await fetch(
        `${BASE}api/messages/attachments/request-url`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: type,
            content_type: contentType,
            size: file.size,
          }),
        },
      );

      const uploadDetails = await request.json().catch(() => ({}));

      if (!request.ok) {
        throw new Error(
          uploadDetails.detail || 'Không thể chuẩn bị tải tệp lên.',
        );
      }

      const uploaded = await fetch(uploadDetails.uploadURL, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });

      if (!uploaded.ok) {
        throw new Error('Không thể tải tệp lên kho lưu trữ.');
      }

      const attachment: ChatAttachment = {
        type,
        url: `${BASE}api/messages/attachments/${uploadDetails.objectName}`,
        name,
        content_type: contentType,
        size: file.size,
        ...(durationSeconds
          ? { duration_seconds: durationSeconds }
          : {}),
      };

      const delivered = await postMessage(
        `${ATTACHMENT_PREFIX}${JSON.stringify(attachment)}`,
      );

      if (delivered) {
        if (pending.previewUrl) {
          URL.revokeObjectURL(pending.previewUrl);
        }

        setPendingAttachment(null);
        toast.success('Đã gửi tệp đính kèm.');
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Không thể gửi tệp đính kèm.',
      );
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleSelectedFile = (
    event: ChangeEvent<HTMLInputElement>,
    forcedKind?: 'image',
  ) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) return;

    const mime = file.type.toLowerCase().split(';', 1)[0];

    const isImage = mime.startsWith('image/');
    const isVideo = mime.startsWith('video/');
    const isAudio =
      mime.startsWith('audio/') ||
      /\.(m4a|mp3|ogg|wav|webm|aac|3gp)$/i.test(file.name);

    const type: AttachmentKind =
      forcedKind ||
      (isImage
        ? 'image'
        : isVideo
          ? 'video'
          : isAudio
            ? 'audio'
            : 'file');

    const previewUrl =
      type === 'image' || type === 'video' || type === 'audio'
        ? URL.createObjectURL(file)
        : undefined;

    setPendingAttachment(previous => {
      if (previous?.previewUrl) {
        URL.revokeObjectURL(previous.previewUrl);
      }

      return {
        file,
        type,
        name: file.name,
        contentType: file.type || 'application/octet-stream',
        previewUrl,
      };
    });

    setAttachmentMenuOpen(false);
    setEmojiPickerOpen(false);
  };

  const cancelPendingAttachment = () => {
    setPendingAttachment(current => {
      if (current?.previewUrl) URL.revokeObjectURL(current.previewUrl);
      return null;
    });
  };

  const startRecording = async () => {
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === 'undefined'
    ) {
      toast.error(
        'Trình duyệt chưa hỗ trợ ghi âm. Bạn có thể chọn tệp ghi âm có sẵn.',
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      cancelRecordingRef.current = false;
      recordingStartedAtRef.current = Date.now();

      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        'audio/webm',
      ];

      const mimeType = supportedTypes.find(type =>
        MediaRecorder.isTypeSupported(type),
      );

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = event => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        toast.error('Đã xảy ra lỗi khi ghi âm.');
      };

      recorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);

        if (cancelRecordingRef.current) {
          cancelRecordingRef.current = false;
          setRecordSeconds(0);
          recordingChunksRef.current = [];
          return;
        }

        const durationSeconds = Math.max(
          1,
          Math.round(
            (Date.now() - recordingStartedAtRef.current) / 1000,
          ),
        );

        const blob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });

        recordingChunksRef.current = [];

        if (!blob.size) {
          toast.error('Bản ghi âm trống. Hãy thử ghi lại.');
          return;
        }

        const previewUrl = URL.createObjectURL(blob);

        setPendingAttachment(previous => {
          if (previous?.previewUrl) {
            URL.revokeObjectURL(previous.previewUrl);
          }

          return {
            file: blob,
            type: 'audio',
            name: 'Tin nhắn thoại',
            contentType: blob.type || 'audio/webm',
            durationSeconds,
            previewUrl,
          };
        });
      };

      recorder.start(250);
      setRecordSeconds(0);
      setIsRecording(true);
    } catch {
      toast.error(
        'Không thể dùng micro. Hãy cấp quyền truy cập micro rồi thử lại.',
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const cancelRecording = () => {
    cancelRecordingRef.current = true;

    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }

    recordingStreamRef.current?.getTracks().forEach(track => track.stop());
    setIsRecording(false);
    setRecordSeconds(0);
  };

  useEffect(() => {
    if (!isRecording) return;

    const timer = window.setInterval(() => {
      const seconds = Math.floor(
        (Date.now() - recordingStartedAtRef.current) / 1000,
      );

      setRecordSeconds(seconds);

      if (
        seconds >= 300 &&
        mediaRecorderRef.current?.state === 'recording'
      ) {
        toast.info('Đã đạt giới hạn ghi âm 5 phút.');
        mediaRecorderRef.current.stop();
      }
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      recordingStreamRef.current?.getTracks().forEach(track => track.stop());

      // Giải phóng URL xem trước khi rời trang.
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, []);

  const openNewChat = async () => {
    if (!allUsers.length) {
      const response = await fetch(`${BASE}api/users/list`, {
        credentials: 'include',
      });

      if (response.ok) setAllUsers(await response.json());
    }

    setShowPicker(true);
  };

  const openGroupModal = async () => {
    if (!friends.length) {
      const response = await fetch(`${BASE}api/friends/list`, {
        credentials: 'include',
      });

      if (response.ok) setFriends(await response.json());
    }

    setGroupName('');
    setSelectedFriendIds([]);
    setShowGroupModal(true);
  };

  const createGroup = async () => {
    if (!groupName.trim() || selectedFriendIds.length === 0) return;

    const response = await fetch(`${BASE}api/groups`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: groupName.trim(),
        member_ids: selectedFriendIds,
      }),
    });

    if (response.ok) {
      const group = await response.json();
      setShowGroupModal(false);
      fetchConversations();
      navigate(`/tin-nhan/nhom/${group.id}`);
    }
  };

  const filteredConvs = conversations
    .filter(
      conversation =>
        activeTab !== 'unread' || conversation.unread_count > 0,
    )
    .filter(conversation =>
      displayName(conversation)
        .toLowerCase()
        .includes(searchQ.toLowerCase()),
    );

  const filteredUsers = allUsers.filter(userItem =>
    displayName(userItem)
      .toLowerCase()
      .includes(userSearch.toLowerCase()),
  );

  const onlineFriends = friends.filter(friend => friend.online);
  const showGroups = activeTab === 'all' || activeTab === 'groups';
  const showConversations =
    activeTab === 'all' || activeTab === 'unread';

  const inboxTabs = [
    { id: 'all' as const, label: 'Tất cả' },
    { id: 'unread' as const, label: 'Chưa đọc' },
    { id: 'groups' as const, label: 'Nhóm' },
    { id: 'people' as const, label: 'Mọi người' },
  ];

            {/* JSX giao diện chính */}
          return (
            <div className="container mx-auto max-w-5xl px-0 py-0 md:px-4 md:py-8">
              <Show when="signed-out">
                <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
                  <MessageCircle className="h-14 w-14 text-muted-foreground" />
                  <p className="text-muted-foreground">Đăng nhập để nhắn tin với bạn bè</p>
                  <Link href="/sign-in">
                    <Button className="gap-2">
                      <LogIn className="h-4 w-4" />
                      Đăng nhập
                    </Button>
                  </Link>
                </div>
              </Show>

              <Show when="signed-in">
                <div className="flex min-h-[100dvh] flex-col overflow-hidden border border-[#E8E0CC] bg-[#FFFDF7] shadow-sm md:h-[75vh] md:min-h-0 md:flex-row md:rounded-3xl">
                  {!partnerId && !groupId && (
                    <div className="bg-[#FFFDF7] md:hidden">
                      <div className="flex items-center justify-between px-5 pb-3 pt-5">
                        <Link href="/" className="text-[22px] font-bold tracking-tight">
                          Kỷ Yếu Lớp 9A
                        </Link>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={openGroupModal}
                            className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F0EAD8]"
                            title="Tạo nhóm"
                          >
                            <Users className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={openNewChat}
                            className="flex h-9 w-9 items-center justify-center rounded-full bg-muted"
                            title="Tin nhắn mới"
                          >
                            <Edit3 className="h-[19px] w-[19px]" />
                          </button>
                        </div>
                      </div>

                      <div className="px-5 pb-3">
                        <div className="relative">
                          <Search className="absolute left-3.5 top-1/2 h-[21px] w-[21px] -translate-y-1/2 text-muted-foreground" />
                          <Input
                            value={searchQ}
                            onChange={event => setSearchQ(event.target.value)}
                            placeholder="Tìm kiếm trên Messenger"
                            className="h-10 rounded-full border-0 bg-[#F0EAD8] pl-10 text-[13.5px]"
                          />
                        </div>
                      </div>

                      <div className="flex gap-1 overflow-x-auto border-b border-[#E8E0CC] px-5 pb-2">
                        {inboxTabs.map(tab => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ${
                              activeTab === tab.id
                                ? 'bg-[#EAF2FF] text-[#1465C0]'
                                : 'text-foreground hover:bg-[#F0EAD8]'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Danh sách hội thoại */}
                  <div
                    className={`flex min-h-0 w-full shrink-0 flex-col border-r border-[#E8E0CC] md:h-full md:w-80 ${
                      partnerId || groupId ? 'hidden md:flex' : 'flex'
                    }`}
                  >
                    <div className="hidden border-b border-[#E8E0CC] p-4 md:block">
                      <div className="mb-3 flex items-center justify-between">
                        <Link href="/" className="text-lg font-bold hover:text-[#B8862F]">
                          Kỷ Yếu Lớp 9A
                        </Link>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={openNewChat}
                            className="rounded-full p-2 text-primary hover:bg-muted"
                            title="Nhắn tin mới"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                          <button
                            type="button"
                            onClick={openGroupModal}
                            className="rounded-full p-2 text-primary hover:bg-muted"
                            title="Tạo nhóm"
                          >
                            <Users className="h-5 w-5" />
                          </button>
                        </div>
                      </div>

                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={searchQ}
                          onChange={event => setSearchQ(event.target.value)}
                          placeholder="Tìm kiếm..."
                          className="rounded-xl border-0 bg-muted/50 pl-9 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      {activeTab === 'people' ? (
                        onlineFriends.length > 0 ? (
                          <div>
                            <p className="px-5 pb-2 pt-4 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                              Bạn bè đang online
                            </p>
                            {onlineFriends.map(friend => {
                              const name = displayName(friend);
                              return (
                                <button
                                  key={friend.clerk_user_id}
                                  type="button"
                                  onClick={() => navigate(`/tin-nhan/${friend.clerk_user_id}`)}
                                  className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-[#F0EAD8]/60"
                                >
                                  <div className="relative shrink-0">
                                    {friend.photo_url ? (
                                      <img src={friend.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                                    ) : (
                                      <AvatarGradient name={name} className="h-11 w-11" textClassName="text-base" />
                                    )}
                                    <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#FFFDF7] bg-emerald-500" />
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
                          <div className="flex h-48 flex-col items-center justify-center px-8 text-center text-sm text-muted-foreground">
                            <Users className="mb-2 h-9 w-9 opacity-40" />
                            <p>Không có người dùng nào online</p>
                            <button type="button" onClick={openNewChat} className="mt-2 text-xs text-[#B8862F] hover:underline">
                              Tìm người để kết bạn
                            </button>
                          </div>
                        )
                      ) : (
                        <>
                          {showGroups && groups.length > 0 && (
                            <div className="border-b border-[#E8E0CC] pb-2">
                              <p className="px-4 pb-1 pt-3 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                                Nhóm
                              </p>
                              {groups.map(group => (
                                <button
                                  key={group.id}
                                  type="button"
                                  onClick={() => navigate(`/tin-nhan/nhom/${group.id}`)}
                                  className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-[#F0EAD8]/60 ${
                                    groupId === group.id ? 'bg-[#F0EAD8]' : ''
                                  }`}
                                >
                                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F0EAD8] text-[#B8862F]">
                                    <Users className="h-5 w-5" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">{group.name}</p>
                                    <p className="truncate text-xs text-muted-foreground">
                                      {group.member_count} thành viên
                                      {group.last_message ? ` · ${group.last_message}` : ''}
                                    </p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {showGroups && activeTab === 'groups' && groups.length === 0 && (
                            <div className="flex h-40 flex-col items-center justify-center text-sm text-muted-foreground">
                              <Users className="mb-2 h-8 w-8 opacity-40" />
                              <p>Chưa có nhóm nào</p>
                              <button type="button" onClick={openGroupModal} className="mt-2 text-xs text-[#B8862F] hover:underline">
                                Tạo nhóm từ bạn bè
                              </button>
                            </div>
                          )}

                          {showConversations && filteredConvs.length === 0 && (
                            <div className="flex h-40 flex-col items-center justify-center text-sm text-muted-foreground">
                              <MessageCircle className="mb-2 h-8 w-8 opacity-40" />
                              <p>
                                {activeTab === 'unread'
                                  ? 'Không có tin nhắn chưa đọc'
                                  : 'Chưa có cuộc trò chuyện nào'}
                              </p>
                              <button type="button" onClick={openNewChat} className="mt-2 text-xs text-[#B8862F] hover:underline">
                                Bắt đầu nhắn tin
                              </button>
                            </div>
                          )}

                          {showConversations && filteredConvs.map(conv => (
                            <button
                              key={conv.partner_id}
                              type="button"
                              onClick={() => navigate(`/tin-nhan/${conv.partner_id}`)}
                              className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                                partnerId === conv.partner_id ? 'bg-[#F0EAD8]' : ''
                              }`}
                            >
                              <div className="relative shrink-0">
                                {conv.photo_url ? (
                                  <img src={conv.photo_url} alt="" className="h-11 w-11 rounded-full object-cover" />
                                ) : (
                                  <AvatarGradient name={displayName(conv)} className="h-11 w-11" textClassName="text-base" />
                                )}
                                <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#FFFDF7] ${
                                  conv.online ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                                }`} />
                                {conv.unread_count > 0 && (
                                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                                    {conv.unread_count}
                                  </span>
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-baseline justify-between">
                                  <p className={`truncate text-sm ${
                                    conv.unread_count > 0 ? 'font-bold' : 'font-medium'
                                  }`}>
                                    {displayName(conv)}
                                  </p>
                                  <span className="ml-2 shrink-0 text-[10px] text-muted-foreground">
                                    {timeAgo(conv.last_at)}
                                  </span>
                                </div>
                                <p className={`mt-0.5 truncate text-xs ${
                                  conv.unread_count > 0
                                    ? 'font-medium text-foreground'
                                    : 'text-muted-foreground'
                                }`}>
                                  {conv.last_message}
                                </p>
                              </div>
                            </button>
                          ))}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Khung hội thoại */}
                  <div className={`flex min-h-0 min-w-0 flex-1 flex-col md:h-full ${
                    !partnerId && !groupId ? 'hidden md:flex' : 'flex'
                  }`}>
                    {!partnerId && !groupId ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
                        <MessageCircle className="h-12 w-12 opacity-30" />
                        <p className="text-sm">Chọn một cuộc trò chuyện để bắt đầu</p>
                        <button type="button" onClick={openNewChat} className="text-sm text-primary hover:underline">
                          + Nhắn tin với ai đó
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3 border-b px-4 py-3">
                          <button
                            type="button"
                            onClick={() => navigate('/tin-nhan')}
                            className="-ml-2 rounded-full p-2 hover:bg-muted md:hidden"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </button>

                          {groupId ? (
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <Users className="h-4 w-4" />
                            </div>
                          ) : activeConv?.photo_url ? (
                            <img src={activeConv.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                          ) : (
                            <AvatarGradient
                              name={displayName(activeConv || { full_name: partnerId })}
                              className="h-9 w-9"
                              textClassName="text-sm"
                            />
                          )}

                          <div>
                            <p className="text-sm font-semibold">
                              {groupId
                                ? activeGroup?.name || 'Nhóm'
                                : activeConv
                                  ? displayName(activeConv)
                                  : '...'}
                            </p>
                            {groupId ? (
                              <p className="text-xs text-muted-foreground">
                                {activeGroup?.member_count || 0} thành viên
                              </p>
                            ) : (
                              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <span className={`h-1.5 w-1.5 rounded-full ${
                                  activeConv?.online ? 'bg-emerald-500' : 'bg-muted-foreground/50'
                                }`} />
                                {activeConv?.online ? 'Đang hoạt động' : 'Không hoạt động'}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Tin nhắn */}
                        <div className="flex-1 min-h-0 space-y-2 overflow-y-auto p-4">
                          {(groupId ? groupMessages : messages).map(msg => {
                            const isMine = msg.sender_id === user?.id;
                            const attachment = parseAttachment(msg.content);

                            return (
                              <div key={msg.id} className={`flex gap-2 ${
                                isMine ? 'flex-row-reverse' : 'flex-row'
                              }`}>
                                {!isMine && (
                                  <div className="mt-auto shrink-0">
                                    {msg.photo_url ? (
                                      <img src={msg.photo_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                                    ) : (
                                      <AvatarGradient name={msg.full_name || ''} className="h-7 w-7" textClassName="text-xs" />
                                    )}
                                  </div>
                                )}

                                <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-[13.5px] md:max-w-[70%] ${
                                  isMine
                                    ? 'rounded-br-sm bg-[#B8862F] text-white'
                                    : 'rounded-bl-sm bg-[#F0EAD8] text-foreground'
                                }`}>
                                  {attachment?.type === 'image' ? (
                                    <a href={attachment.url} target="_blank" rel="noreferrer">
                                      <img
                                        src={attachment.url}
                                        alt={attachment.name || 'Ảnh đính kèm'}
                                        loading="lazy"
                                        className="max-h-64 max-w-full rounded-xl object-contain"
                                      />
                                    </a>
                                  ) : attachment?.type === 'video' ? (
                                    <video
                                      src={attachment.url}
                                      controls
                                      preload="metadata"
                                      className="max-h-72 max-w-full rounded-xl"
                                    />
                                  ) : attachment?.type === 'audio' ? (
                                    <div className="min-w-0 space-y-1">
                                      <div className="flex items-center gap-1.5 text-xs">
                                        <Mic className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{attachment.name || 'Tin nhắn thoại'}</span>
                                        {attachment.duration_seconds ? (
                                          <span className="shrink-0 opacity-75">
                                            {formatDuration(attachment.duration_seconds)}
                                          </span>
                                        ) : null}
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
                                      <FileText className="h-5 w-5 shrink-0" />
                                      <span className="truncate underline underline-offset-2">
                                        {attachment.name || 'Tệp đính kèm'}
                                      </span>
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

                        {/* Khung nhập và xem trước tệp */}
                        <div className="relative border-t border-[#E8E0CC] bg-[#FFFDF7] px-2 py-2.5 pb-[calc(0.625rem+env(safe-area-inset-bottom))] md:px-4">
                          {pendingAttachment && (
                            <div className="mb-3 rounded-2xl border border-[#E8E0CC] bg-white p-3">
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-sm font-semibold">Xem trước tệp đính kèm</p>
                                <button
                                  type="button"
                                  onClick={cancelPendingAttachment}
                                  disabled={uploadingAttachment}
                                  className="rounded-full p-1.5 hover:bg-muted disabled:opacity-40"
                                  aria-label="Hủy tệp đính kèm"
                                  title="Hủy"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>

                              {pendingAttachment.type === 'image' && pendingAttachment.previewUrl && (
                                <img
                                  src={pendingAttachment.previewUrl}
                                  alt="Xem trước ảnh"
                                  className="max-h-56 max-w-full rounded-xl object-contain"
                                />
                              )}

                              {pendingAttachment.type === 'video' && pendingAttachment.previewUrl && (
                                <video
                                  src={pendingAttachment.previewUrl}
                                  controls
                                  className="max-h-56 max-w-full rounded-xl"
                                />
                              )}

                              {pendingAttachment.type === 'audio' && pendingAttachment.previewUrl && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mic className="h-4 w-4" />
                                    <span className="truncate">{pendingAttachment.name}</span>
                                    {pendingAttachment.durationSeconds && (
                                      <span className="shrink-0 text-muted-foreground">
                                        {formatDuration(pendingAttachment.durationSeconds)}
                                      </span>
                                    )}
                                  </div>
                                  <audio controls src={pendingAttachment.previewUrl} className="w-full" />
                                </div>
                              )}

                              {pendingAttachment.type === 'file' && (
                                <div className="flex items-center gap-3 rounded-xl bg-[#F0EAD8] p-3">
                                  <FileText className="h-8 w-8 shrink-0 text-[#1465C0]" />
                                  <div className="min-w-0 flex-1">
                                    <p className="break-all text-sm font-medium">{pendingAttachment.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {formatSize(pendingAttachment.file.size)}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {(pendingAttachment.type === 'image' || pendingAttachment.type === 'video') && (
                                <p className="mt-2 text-xs text-muted-foreground">
                                  {pendingAttachment.name} · {formatSize(pendingAttachment.file.size)}
                                </p>
                              )}

                              <div className="mt-3 flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={cancelPendingAttachment}
                                  disabled={uploadingAttachment}
                                >
                                  Hủy
                                </Button>
                                <Button
                                  type="button"
                                  onClick={() => void uploadAttachment(pendingAttachment)}
                                  disabled={uploadingAttachment}
                                  className="gap-2"
                                >
                                  {uploadingAttachment ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Send className="h-4 w-4" />
                                  )}
                                  {uploadingAttachment ? 'Đang gửi...' : 'Gửi'}
                                </Button>
                              </div>
                            </div>
                          )}

                          {attachmentMenuOpen && (
                            <div className="absolute bottom-full left-2 z-20 mb-2 w-56 rounded-2xl border border-[#E8E0CC] bg-white p-1.5 shadow-lg">
                              <button
                                type="button"
                                onClick={() => {
                                  setAttachmentMenuOpen(false);
                                  fileInputRef.current?.click();
                                }}
                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-[#F0EAD8]"
                              >
                                <Paperclip className="h-4 w-4 text-[#1465C0]" />
                                Chọn ảnh, video, âm thanh hoặc tệp
                              </button>
                            </div>
                          )}

                          {emojiPickerOpen && (
                            <div className="absolute bottom-full right-12 z-20 mb-2 grid grid-cols-5 gap-1 rounded-2xl border border-[#E8E0CC] bg-white p-2 shadow-lg">
                              {QUICK_EMOJIS.map(emoji => (
                                <button
                                  key={emoji}
                                  type="button"
                                  onClick={() => {
                                    setText(current => `${current}${emoji}`);
                                    setEmojiPickerOpen(false);
                                  }}
                                  className="flex h-9 w-9 items-center justify-center rounded-lg text-xl hover:bg-[#F0EAD8]"
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
                            accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx"
                            className="hidden"
                            onChange={event => handleSelectedFile(event)}
                          />

                          <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setAttachmentMenuOpen(open => !open);
                                setEmojiPickerOpen(false);
                              }}
                              disabled={uploadingAttachment || isRecording || !!pendingAttachment}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1465C0] hover:bg-[#EAF2FF] disabled:opacity-40 sm:h-9 sm:w-9"
                              title="Thêm tệp"
                            >
                              <Plus className="h-6 w-6" />
                            </button>

                            <button
                              type="button"
                              onClick={() => cameraInputRef.current?.click()}
                              disabled={uploadingAttachment || isRecording || !!pendingAttachment}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1465C0] hover:bg-[#EAF2FF] disabled:opacity-40 sm:h-9 sm:w-9"
                              title="Chụp ảnh"
                            >
                              <Camera className="h-[22px] w-[22px]" />
                            </button>

                            <button
                              type="button"
                              onClick={() => imageInputRef.current?.click()}
                              disabled={uploadingAttachment || isRecording || !!pendingAttachment}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1465C0] hover:bg-[#EAF2FF] disabled:opacity-40 sm:h-9 sm:w-9"
                              title="Chọn ảnh"
                            >
                              <ImageIcon className="h-[22px] w-[22px]" />
                            </button>

                            <button
                              type="button"
                              onClick={isRecording ? stopRecording : startRecording}
                              disabled={uploadingAttachment || sending || !!pendingAttachment}
                              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-[#EAF2FF] disabled:opacity-40 sm:h-9 sm:w-9 ${
                                isRecording ? 'text-red-600' : 'text-[#1465C0]'
                              }`}
                              title={isRecording ? 'Dừng ghi âm để xem trước' : 'Ghi âm'}
                            >
                              {isRecording ? (
                                <Square className="h-5 w-5 fill-current" />
                              ) : (
                                <Mic className="h-[22px] w-[22px]" />
                              )}
                            </button>

                            {isRecording ? (
                              <div className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-full bg-[#F0EAD8] px-3 text-sm">
                                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-red-600" />
                                <span className="truncate">Đang ghi âm</span>
                                <span className="shrink-0 tabular-nums">{formatDuration(recordSeconds)}</span>
                                <button
                                  type="button"
                                  onClick={cancelRecording}
                                  className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-black/5"
                                  title="Hủy ghi âm"
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
                                disabled={uploadingAttachment || !!pendingAttachment}
                                className="h-10 min-w-0 flex-1 rounded-full border-0 bg-[#F0EAD8] px-3.5 text-[15px] focus-visible:ring-1 focus-visible:ring-[#1465C0]"
                              />
                            )}

                            {!isRecording && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEmojiPickerOpen(open => !open);
                                  setAttachmentMenuOpen(false);
                                }}
                                disabled={uploadingAttachment || !!pendingAttachment}
                                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1465C0] hover:bg-[#EAF2FF] disabled:opacity-40 sm:h-9 sm:w-9"
                                title="Chọn emoji"
                              >
                                <Smile className="h-[22px] w-[22px]" />
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                if (text.trim()) void sendMessage();
                                else if (!uploadingAttachment && !sending && !pendingAttachment) {
                                  void postMessage('👍');
                                }
                              }}
                              disabled={sending || uploadingAttachment || !!pendingAttachment || isRecording}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#1465C0] hover:bg-[#EAF2FF] disabled:opacity-40 sm:h-9 sm:w-9"
                              title={text.trim() ? 'Gửi tin nhắn' : 'Gửi lượt thích'}
                            >
                              {sending || uploadingAttachment ? (
                                <Loader2 className="h-5 w-5 animate-spin" />
                              ) : text.trim() ? (
                                <Send className="h-[21px] w-[21px]" />
                              ) : (
                                <ThumbsUp className="h-[22px] w-[22px] fill-current" />
                              )}
                            </button>
                          </div>

                          {uploadingAttachment && (
                            <p className="mt-1 px-1 text-[11px] text-muted-foreground">
                              Đang tải tệp lên…
                            </p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Modal tạo nhóm */}
                <AnimatePresence>
                  {showGroupModal && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowGroupModal(false)}
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={event => event.stopPropagation()}
                        className="w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-2xl"
                      >
                        <div className="flex items-center justify-between border-b p-4">
                          <h3 className="font-bold">Tạo nhóm mới</h3>
                          <button type="button" onClick={() => setShowGroupModal(false)} className="rounded-full p-1.5 hover:bg-muted">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-3 p-4">
                          <Input
                            value={groupName}
                            onChange={event => setGroupName(event.target.value)}
                            placeholder="Tên nhóm..."
                          />
                          <p className="text-xs font-semibold text-muted-foreground">Chọn bạn bè để thêm vào nhóm</p>
                          <div className="max-h-56 space-y-1 overflow-y-auto">
                            {friends.length === 0 ? (
                              <p className="py-5 text-center text-sm text-muted-foreground">Bạn chưa có bạn bè để thêm.</p>
                            ) : friends.map(friend => {
                              const selected = selectedFriendIds.includes(friend.clerk_user_id);
                              const name = displayName(friend);
                              return (
                                <button
                                  key={friend.clerk_user_id}
                                  type="button"
                                  onClick={() => setSelectedFriendIds(ids => selected
                                    ? ids.filter(id => id !== friend.clerk_user_id)
                                    : [...ids, friend.clerk_user_id])}
                                  className={`flex w-full items-center gap-3 rounded-xl p-2 text-left ${
                                    selected ? 'bg-primary/10' : 'hover:bg-muted/50'
                                  }`}
                                >
                                  {friend.photo_url ? (
                                    <img src={friend.photo_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                                  ) : (
                                    <AvatarGradient name={name} className="h-9 w-9" textClassName="text-sm" />
                                  )}
                                  <span className="flex-1 text-sm font-medium">{name}</span>
                                  {selected && <Check className="h-4 w-4 text-primary" />}
                                </button>
                              );
                            })}
                          </div>
                          <Button
                            type="button"
                            onClick={createGroup}
                            disabled={!groupName.trim() || selectedFriendIds.length === 0}
                            className="w-full gap-2"
                          >
                            <Users className="h-4 w-4" />
                            Tạo nhóm
                          </Button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Modal nhắn tin mới */}
                <AnimatePresence>
                  {showPicker && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowPicker(false)}
                      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={event => event.stopPropagation()}
                        className="w-full max-w-sm overflow-hidden rounded-3xl bg-card shadow-2xl"
                      >
                        <div className="flex items-center justify-between border-b p-4">
                          <h3 className="font-bold">Nhắn tin mới</h3>
                          <button type="button" onClick={() => setShowPicker(false)} className="rounded-full p-1.5 hover:bg-muted">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="border-b p-3">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                              value={userSearch}
                              onChange={event => setUserSearch(event.target.value)}
                              placeholder="Tìm tên..."
                              autoFocus
                              className="rounded-xl border-0 bg-muted/50 pl-9 text-sm"
                            />
                          </div>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          {filteredUsers.length === 0 && (
                            <p className="py-8 text-center text-sm text-muted-foreground">Không tìm thấy ai</p>
                          )}
                          {filteredUsers.map(userItem => (
                            <button
                              key={userItem.clerk_user_id}
                              type="button"
                              onClick={() => {
                                setShowPicker(false);
                                navigate(`/tin-nhan/${userItem.clerk_user_id}`);
                              }}
                              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
                            >
                              {userItem.photo_url ? (
                                <img src={userItem.photo_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                              ) : (
                                <AvatarGradient name={displayName(userItem)} className="h-10 w-10" textClassName="text-sm" />
                              )}
                              <div>
                                <p className="text-sm font-medium">{displayName(userItem)}</p>
                                <p className="text-xs text-muted-foreground">
                                  {userItem.role === 'teacher' ? '🎓 Giáo viên' : '📚 Học sinh'}
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
