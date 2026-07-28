import { useState, useEffect, useRef } from 'react';
import { useUser, Show } from '@clerk/react';
import { Link } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Heart, MessageCircle, Trash2, Send, Image as ImageIcon,
  LogIn, Users, X, Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const BASE = import.meta.env.BASE_URL;

interface Post {
  id: number;
  clerk_user_id: string;
  author_name: string;
  author_photo: string | null;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface Comment {
  id: number;
  post_id: number;
  clerk_user_id: string;
  author_name: string;
  author_photo: string | null;
  content: string;
  created_at: string;
}

/* ─── Avatar helper ─────────────────────────────────────────────────────── */
function UserAvatar({ photo, name, size = 'md' }: { photo?: string | null; name: string; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10';
  const txt = size === 'sm' ? 'text-xs' : 'text-sm';
  if (photo) return <img src={photo} alt={name} className={`${cls} rounded-full object-cover shrink-0`} />;
  return <AvatarGradient name={name} className={`${cls} shrink-0`} textClassName={txt} />;
}

/* ─── Relative time ─────────────────────────────────────────────────────── */
function RelTime({ iso }: { iso: string }) {
  return (
    <span className="text-muted-foreground text-xs">
      {formatDistanceToNow(new Date(iso), { addSuffix: true, locale: vi })}
    </span>
  );
}

/* ─── Create Post ─────────────────────────────────────────────────────── */
function CreatePost({ user, profile, onPosted }: { user: any; profile: any; onPosted: (p: Post) => void }) {
  const [text, setText] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImageUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const submit = async () => {
    if (!text.trim()) return;
    setPosting(true);
    const name = profile?.full_name || profile?.nickname || user?.fullName || 'Ẩn danh';
    const photo = profile?.photo_url || user?.imageUrl || null;
    const res = await fetch(`${BASE}api/feed/posts`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: text, image_url: imageUrl, author_name: name, author_photo: photo }),
    });
    if (res.ok) {
      const post = await res.json();
      onPosted(post);
      setText(''); setImageUrl(null);
    }
    setPosting(false);
  };

  const name = profile?.full_name || profile?.nickname || user?.fullName || '?';
  const photo = profile?.photo_url || user?.imageUrl;

  return (
    <div className="bg-card border border-border rounded-3xl p-5">
      <div className="flex gap-3">
        <UserAvatar photo={photo} name={name} />
        <div className="flex-1">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={`${name?.split(' ').pop()} đang nghĩ gì vậy?`}
            rows={3}
            className="resize-none border-0 bg-muted/30 rounded-2xl focus-visible:ring-1 text-sm"
            onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) submit(); }}
          />
          {imageUrl && (
            <div className="relative mt-2 inline-block">
              <img src={imageUrl} alt="preview" className="max-h-48 rounded-2xl object-cover" />
              <button onClick={() => setImageUrl(null)} className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
              <ImageIcon className="w-4 h-4" /> Thêm ảnh
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImg} />
            <Button onClick={submit} disabled={posting || !text.trim()} size="sm" className="ml-auto gap-1.5">
              <Send className="w-3.5 h-3.5" />{posting ? 'Đang đăng...' : 'Đăng'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Comment section ─────────────────────────────────────────────────── */
function CommentSection({ post, user, profile }: { post: Post; user: any; profile: any }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    const res = await fetch(`${BASE}api/feed/posts/${post.id}/comments`);
    if (res.ok) { setComments(await res.json()); setLoaded(true); }
  };

  useEffect(() => { load(); }, [post.id]);

  const sendComment = async () => {
    if (!newComment.trim() || !user) return;
    setSending(true);
    const name = profile?.full_name || profile?.nickname || user?.fullName || 'Ẩn danh';
    const photo = profile?.photo_url || user?.imageUrl || null;
    const res = await fetch(`${BASE}api/feed/posts/${post.id}/comments`, {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newComment, author_name: name, author_photo: photo }),
    });
    if (res.ok) {
      const c = await res.json();
      setComments(prev => [...prev, c]);
      setNewComment('');
    }
    setSending(false);
  };

  const deleteComment = async (id: number) => {
    const res = await fetch(`${BASE}api/feed/comments/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setComments(cs => cs.filter(c => c.id !== id));
  };

  return (
    <div className="mt-3 pt-3 border-t border-border space-y-3">
      {comments.map(c => (
        <div key={c.id} className="flex gap-2.5 group">
          <UserAvatar photo={c.author_photo} name={c.author_name} size="sm" />
          <div className="flex-1 bg-muted/30 rounded-2xl px-3 py-2">
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-xs">{c.author_name}</span>
              <RelTime iso={c.created_at} />
            </div>
            <p className="text-sm mt-0.5">{c.content}</p>
          </div>
          {user?.id === c.clerk_user_id && (
            <button onClick={() => deleteComment(c.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all self-center">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}

      {user ? (
        <div className="flex gap-2.5">
          <UserAvatar photo={profile?.photo_url || user?.imageUrl} name={profile?.full_name || user?.fullName || '?'} size="sm" />
          <div className="flex-1 flex gap-2">
            <input
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Viết bình luận..."
              className="flex-1 bg-muted/30 rounded-2xl px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              onKeyDown={e => { if (e.key === 'Enter') sendComment(); }}
            />
            <button onClick={sendComment} disabled={sending || !newComment.trim()} className="text-primary disabled:opacity-40">
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <Link href="/sign-in" className="text-xs text-primary hover:underline ml-2">Đăng nhập để bình luận</Link>
      )}
    </div>
  );
}

/* ─── Single Post Card ─────────────────────────────────────────────────── */
function PostCard({ post, user, profile, onDeleted }: { post: Post; user: any; profile: any; onDeleted: () => void }) {
  const [likes, setLikes] = useState(post.likes_count);
  const [liked, setLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [liking, setLiking] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetch(`${BASE}api/feed/posts/${post.id}/likes`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setLikes(d.likes_count); setLiked(d.liked); } });
  }, [post.id, user]);

  const toggleLike = async () => {
    if (!user || liking) return;
    setLiking(true);
    const res = await fetch(`${BASE}api/feed/posts/${post.id}/like`, { method: 'POST', credentials: 'include' });
    if (res.ok) {
      const d = await res.json();
      setLikes(d.likes_count); setLiked(d.liked);
    }
    setLiking(false);
  };

  const deletePost = async () => {
    if (!confirm('Xóa bài đăng này?')) return;
    const res = await fetch(`${BASE}api/feed/posts/${post.id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) onDeleted();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      className="bg-card border border-border rounded-3xl p-5 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <UserAvatar photo={post.author_photo} name={post.author_name} />
          <div>
            <p className="font-semibold text-sm">{post.author_name}</p>
            <RelTime iso={post.created_at} />
          </div>
        </div>
        {user?.id === post.clerk_user_id && (
          <button onClick={deletePost} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-1.5 rounded-full hover:bg-destructive/10">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Content */}
      <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3">{post.content}</p>

      {/* Image */}
      {post.image_url && (
        <div className="mb-3 rounded-2xl overflow-hidden">
          <img src={post.image_url} alt="post" className="w-full max-h-[400px] object-cover" />
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 pt-2 border-t border-border">
        <button
          onClick={toggleLike}
          className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${liked ? 'text-red-500' : 'text-muted-foreground hover:text-red-400'}`}
        >
          <Heart className={`w-4 h-4 transition-transform ${liked ? 'fill-current scale-110' : ''}`} />
          {likes > 0 && <span>{likes}</span>}
          <span className="hidden sm:inline">{liked ? 'Đã thích' : 'Thích'}</span>
        </button>
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          {post.comments_count > 0 && <span>{post.comments_count}</span>}
          <span className="hidden sm:inline">Bình luận</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && <CommentSection post={post} user={user} profile={profile} />}
    </motion.div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function Feed() {
  const { user, isLoaded } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    fetch(`${BASE}api/feed/posts`)
      .then(r => r.ok ? r.json() : [])
      .then(data => { setPosts(data); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch(`${BASE}api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setProfile(d); });
  }, [isLoaded, user]);

  return (
    <div className="container mx-auto px-4 py-10 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
          <Users className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-display font-bold">Bảng tin lớp 9A</h1>
          <p className="text-muted-foreground text-sm">Chia sẻ kỷ niệm và cảm xúc cùng bạn bè</p>
        </div>
      </div>

      {/* Create post (signed in only) */}
      <Show when="signed-in">
        <div className="mb-6">
          <CreatePost user={user} profile={profile} onPosted={p => setPosts(prev => [p, ...prev])} />
        </div>
      </Show>

      <Show when="signed-out">
        <div className="mb-6 p-4 bg-muted/30 border border-border rounded-3xl flex items-center gap-3">
          <LogIn className="w-5 h-5 text-primary shrink-0" />
          <span className="text-sm text-muted-foreground flex-1">Đăng nhập để chia sẻ kỷ niệm cùng bạn bè.</span>
          <Link href="/sign-in"><Button size="sm">Đăng nhập</Button></Link>
        </div>
      </Show>

      {/* Posts feed */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <div key={i} className="h-40 bg-muted/30 rounded-3xl animate-pulse" />)}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20">
          <Plus className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">Chưa có bài đăng nào. Hãy là người đầu tiên chia sẻ!</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-4">
            {posts.map(post => (
              <PostCard
                key={post.id}
                post={post}
                user={user}
                profile={profile}
                onDeleted={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
              />
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
