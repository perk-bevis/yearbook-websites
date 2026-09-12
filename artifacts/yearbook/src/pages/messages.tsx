import { useState, useEffect, useRef } from 'react';
import { useUser, Show } from '@clerk/react';
import { Link, useParams, useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Search, ArrowLeft, MessageCircle, LogIn, Plus, X, Users, Check, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AvatarGradient } from '@/components/ui/avatar-gradient';

const BASE = import.meta.env.BASE_URL;

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
  const bottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    // Poll every 4 seconds
    pollRef.current = setInterval(() => {
      fetchConversations();
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

  const sendMessage = async () => {
    if (!text.trim() || (!partnerId && !groupId) || sending) return;
    setSending(true);
    try {
      const url = groupId ? `${BASE}api/groups/${groupId}/messages` : `${BASE}api/messages/send`;
      const body = groupId
        ? { content: text.trim() }
        : { receiver_id: partnerId, content: text.trim() };
      const res = await fetch(url, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setText('');
        if (groupId) fetchGroupThread();
        else {
          fetchThread();
          fetchConversations();
        }
      }
    } finally {
      setSending(false);
    }
  };

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

  const filteredConvs = conversations.filter(c =>
    displayName(c).toLowerCase().includes(searchQ.toLowerCase())
  );
  const filteredUsers = allUsers.filter(u =>
    displayName(u).toLowerCase().includes(userSearch.toLowerCase())
  );

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
        <div className="flex h-[calc(100dvh-5rem)] md:h-[75vh] bg-card md:rounded-3xl border overflow-hidden shadow-sm">

          {/* Left sidebar — conversation list */}
          <div className={`w-full md:w-80 flex flex-col border-r shrink-0 ${partnerId || groupId ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-lg">Tin nhắn</h2>
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
              {groups.length > 0 && (
                <div className="border-b pb-2">
                  <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">Nhóm</p>
                  {groups.map(group => (
                    <button key={group.id} onClick={() => navigate(`/tin-nhan/nhom/${group.id}`)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${groupId === group.id ? 'bg-primary/5' : ''}`}>
                      <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><Users className="w-5 h-5" /></div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{group.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{group.member_count} thành viên{group.last_message ? ` · ${group.last_message}` : ''}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {filteredConvs.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                  <MessageCircle className="w-8 h-8 mb-2 opacity-40" />
                  <p>Chưa có cuộc trò chuyện nào</p>
                  <button onClick={openNewChat} className="mt-2 text-primary hover:underline text-xs">
                    Bắt đầu nhắn tin
                  </button>
                </div>
              )}
              {filteredConvs.map(conv => (
                <button
                  key={conv.partner_id}
                  onClick={() => navigate(`/tin-nhan/${conv.partner_id}`)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left ${
                    partnerId === conv.partner_id ? 'bg-primary/5' : ''
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
            </div>
          </div>

          {/* Right — message thread */}
          <div className={`flex-1 flex flex-col ${!partnerId && !groupId ? 'hidden md:flex' : 'flex'}`}>
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
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {(groupId ? groupMessages : messages).map(msg => {
                    const isMine = msg.sender_id === user?.id;
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
                        <div className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm ${
                          isMine
                            ? 'bg-primary text-white rounded-br-sm'
                            : 'bg-muted text-foreground rounded-bl-sm'
                        }`}>
                          {msg.content}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                {/* Input */}
                <div className="p-3 border-t flex gap-2">
                  <Input
                    value={text}
                    onChange={e => setText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                    placeholder="Nhập tin nhắn..."
                    className="rounded-2xl bg-muted/50 border-0"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={!text.trim() || sending}
                    size="icon"
                    className="rounded-2xl shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
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
