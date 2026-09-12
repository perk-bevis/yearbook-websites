import { useState, useEffect, useRef } from 'react';
import { useUser, Show } from '@clerk/react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  UserCircle, PencilLine, Check, Crown, BookOpen,
  Camera, Phone, Facebook, Instagram, MessageCircle, Quote,
  Heart, CalendarDays, Upload, Trash2, Plus, Send, LogIn, X, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AvatarGradient } from '@/components/ui/avatar-gradient';

const BASE = import.meta.env.BASE_URL;

interface UserProfile {
  id: number;
  clerk_user_id: string;
  email: string;
  full_name: string;
  nickname: string;
  birth_date: string;
  phone: string;
  facebook: string;
  instagram: string;
  zalo: string;
  favorite_quote: string;
  personal_letter: string;
  photo_url: string;
  memory_photos: string[];
  school_name: string;
  class_name: string;
  plan: string;
}

interface GuestbookEntry {
  id: number;
  author_name: string;
  author_clerk_id: string;
  message: string;
  created_at: string;
}

interface Friend {
  clerk_user_id: string;
  full_name: string;
  nickname?: string;
  photo_url?: string;
  online?: boolean;
}

/* ─── Avatar upload section ─────────────────────────────────────────────── */
function AvatarUpload({ profile, user, onUpdated }: { profile: UserProfile | null; user: any; onUpdated: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      try {
        const res = await fetch(`${BASE}api/auth/me/avatar`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data_url: dataUrl }),
        });
        if (res.ok) {
          const data = await res.json();
          onUpdated(data.photo_url);
        }
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const src = profile?.photo_url || user?.imageUrl;
  return (
    <div className="relative shrink-0">
      {src
        ? <img src={src} alt="avatar" className="w-20 h-20 rounded-full object-cover ring-4 ring-background shadow-lg" />
        : <AvatarGradient name={user?.fullName || 'U'} className="w-20 h-20" textClassName="text-2xl" />
      }
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 w-7 h-7 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
        title="Đổi ảnh đại diện"
      >
        {uploading
          ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          : <Camera className="w-3 h-3" />
        }
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

/* ─── Edit modal ─────────────────────────────────────────────────────────── */
function EditModal({ profile, user, onSaved, onClose }: {
  profile: UserProfile | null; user: any;
  onSaved: (p: UserProfile) => void; onClose: () => void;
}) {
  const [form, setForm] = useState({
    full_name: profile?.full_name || user?.fullName || '',
    nickname: profile?.nickname || '',
    birth_date: profile?.birth_date || '',
    phone: profile?.phone || '',
    facebook: profile?.facebook || '',
    instagram: profile?.instagram || '',
    zalo: profile?.zalo || '',
    favorite_quote: profile?.favorite_quote || '',
    personal_letter: profile?.personal_letter || '',
    school_name: profile?.school_name || '',
    class_name: profile?.class_name || '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`${BASE}api/auth/me`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) { onSaved(await res.json()); onClose(); }
    setSaving(false);
  };

  const f = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(p => ({ ...p, [key]: e.target.value })),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="bg-card border border-border rounded-3xl w-full max-w-lg max-h-[90dvh] overflow-y-auto shadow-2xl"
      >
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between z-10 rounded-t-3xl">
          <h2 className="font-bold text-lg">Chỉnh sửa hồ sơ</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div><Label className="mb-1.5 block text-xs font-semibold">Họ và tên</Label><Input {...f('full_name')} placeholder="Nguyễn Thị Lan" /></div>
            <div><Label className="mb-1.5 block text-xs font-semibold">Biệt danh</Label><Input {...f('nickname')} placeholder="Lan Hoa..." /></div>
          </div>
          <div><Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold"><CalendarDays className="w-3.5 h-3.5" />Ngày sinh</Label><Input type="date" {...f('birth_date')} /></div>

          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Thông tin liên lạc</p>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="mb-1 block text-xs">Điện thoại</Label><Input {...f('phone')} placeholder="0912 345 678" /></div>
              <div><Label className="mb-1 block text-xs">Zalo</Label><Input {...f('zalo')} placeholder="Số Zalo" /></div>
              <div><Label className="mb-1 block text-xs">Facebook URL</Label><Input {...f('facebook')} placeholder="facebook.com/..." /></div>
              <div><Label className="mb-1 block text-xs">Instagram</Label><Input {...f('instagram')} placeholder="@username" /></div>
            </div>
          </div>

          <div><Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold"><Quote className="w-3.5 h-3.5" />Câu nói tâm đắc</Label><Input {...f('favorite_quote')} placeholder="Câu châm ngôn yêu thích..." /></div>

          <div className="grid grid-cols-2 gap-4">
            <div><Label className="mb-1.5 block text-xs font-semibold">Trường</Label><Input {...f('school_name')} placeholder="THCS Vũ Lăng" /></div>
            <div><Label className="mb-1.5 block text-xs font-semibold">Lớp</Label><Input {...f('class_name')} placeholder="9A" /></div>
          </div>

          <div><Label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold"><Heart className="w-3.5 h-3.5" />Lời ngỏ / Tâm sự</Label>
            <Textarea {...f('personal_letter')} rows={5} className="resize-none" placeholder="Chia sẻ cảm xúc cuối cấp, kỷ niệm với bạn bè và thầy cô..." />
          </div>
        </div>

        <div className="sticky bottom-0 bg-card border-t border-border px-6 py-4 flex gap-3 rounded-b-3xl">
          <Button variant="outline" onClick={onClose} className="flex-1">Hủy</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 gap-1.5">
            <Check className="w-4 h-4" />{saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Info row helper ────────────────────────────────────────────────────── */
function InfoItem({ icon, label, value, href }: { icon: React.ReactNode; label: string; value?: string | null; href?: string }) {
  const content = value
    ? href
      ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{value}</a>
      : <span>{value}</span>
    : <span className="text-muted-foreground/60 italic text-xs">Chưa cập nhật</span>;

  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/40 last:border-0">
      <span className="text-muted-foreground shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm font-medium truncate">{content}</div>
      </div>
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function Profile() {
  const { user, isLoaded } = useUser();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  const [gbMsg, setGbMsg] = useState('');
  const [gbName, setGbName] = useState('');
  const [gbSending, setGbSending] = useState(false);
  const [memPhotos, setMemPhotos] = useState<string[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const memFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch(`${BASE}api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) { setProfile(d); setMemPhotos(d.memory_photos || []); } })
      .finally(() => setLoading(false));
    fetch(`${BASE}api/users/${user.id}/guestbook`)
      .then(r => r.ok ? r.json() : [])
      .then(setGuestbook).catch(() => {});
    fetch(`${BASE}api/friends/list`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : [])
      .then(data => Array.isArray(data) && setFriends(data)).catch(() => {});
  }, [isLoaded, user]);

  const addMemoryPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const newPhotos = [...memPhotos, reader.result as string];
      setMemPhotos(newPhotos);
      await fetch(`${BASE}api/auth/me/memory-photos`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos: newPhotos }),
      });
    };
    reader.readAsDataURL(file);
  };

  const removeMemoryPhoto = async (idx: number) => {
    const newPhotos = memPhotos.filter((_, i) => i !== idx);
    setMemPhotos(newPhotos);
    await fetch(`${BASE}api/auth/me/memory-photos`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photos: newPhotos }),
    });
  };

  const sendGuestbook = async () => {
    if (!gbMsg.trim()) return;
    setGbSending(true);
    const res = await fetch(`${BASE}api/users/${user?.id}/guestbook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: gbMsg, author_name: gbName || undefined }),
    });
    if (res.ok) { const entry = await res.json(); setGuestbook(g => [entry, ...g]); setGbMsg(''); setGbName(''); }
    setGbSending(false);
  };

  const deleteGbEntry = async (id: number) => {
    const res = await fetch(`${BASE}api/users/${user?.id}/guestbook/${id}`, { method: 'DELETE', credentials: 'include' });
    if (res.ok) setGuestbook(g => g.filter(e => e.id !== id));
  };

  if (!isLoaded || (isLoaded && !user)) {
    return (
      <Show when="signed-out">
        <div className="text-center py-24">
          <UserCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Bạn chưa đăng nhập</h2>
          <p className="text-muted-foreground mb-6">Đăng nhập để xem và chỉnh sửa hồ sơ kỷ yếu.</p>
          <Link href="/sign-in"><Button className="gap-2"><LogIn className="w-4 h-4" />Đăng nhập ngay</Button></Link>
        </div>
      </Show>
    );
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <Show when="signed-out">
        <div className="text-center py-24">
          <UserCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Bạn chưa đăng nhập</h2>
          <p className="text-muted-foreground mb-6">Đăng nhập để xem và chỉnh sửa hồ sơ kỷ yếu.</p>
          <Link href="/sign-in"><Button className="gap-2"><LogIn className="w-4 h-4" />Đăng nhập ngay</Button></Link>
        </div>
      </Show>

      <Show when="signed-in">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

          {/* ── Hero: Avatar + Name ─────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-3xl p-6">
            <div className="flex items-center gap-5">
              {/* Avatar */}
              <AvatarUpload
                profile={profile}
                user={user}
                onUpdated={url => setProfile(p => p ? { ...p, photo_url: url } : p)}
              />

              {/* Name + plan */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold truncate">
                      {profile?.full_name || user?.fullName || 'Chưa đặt tên'}
                    </h1>
                    {profile?.nickname && (
                      <p className="text-muted-foreground text-sm">"{profile.nickname}"</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      {profile?.plan === 'premium'
                        ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1 text-xs"><Crown className="w-3 h-3" />Premium</Badge>
                        : <Badge variant="outline" className="text-xs">Miễn phí</Badge>
                      }
                      {profile?.school_name && <span className="text-xs text-muted-foreground">{profile.school_name}</span>}
                      {profile?.class_name && <span className="text-xs text-muted-foreground">• {profile.class_name}</span>}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-1.5 shrink-0">
                    <PencilLine className="w-3.5 h-3.5" />Sửa
                  </Button>
                </div>
                {profile?.plan !== 'premium' && (
                  <Link href="/subscribe" className="inline-flex items-center gap-1 text-xs text-amber-600 hover:underline mt-2 font-semibold">
                    <Crown className="w-3 h-3" />Nâng cấp Premium để mở khóa khung ảnh động
                  </Link>
                )}
              </div>
            </div>

            {/* Quote */}
            {profile?.favorite_quote && (
              <blockquote className="mt-4 border-l-4 border-primary/30 pl-4 italic text-muted-foreground text-sm">
                "{profile.favorite_quote}"
              </blockquote>
            )}
          </section>

          {/* ── Thông tin cá nhân ────────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-3xl p-6">
            <h2 className="font-bold mb-4 flex items-center gap-2 text-base">
              <UserCircle className="w-4.5 h-4.5 text-primary" />Thông tin cá nhân
            </h2>
            <div className="space-y-0">
              <InfoItem icon={<CalendarDays className="w-4 h-4" />} label="Ngày sinh" value={profile?.birth_date} />
              <InfoItem icon={<Phone className="w-4 h-4" />} label="Điện thoại" value={profile?.phone} />
              <InfoItem icon={<MessageCircle className="w-4 h-4" />} label="Zalo" value={profile?.zalo} />
              <InfoItem
                icon={<Facebook className="w-4 h-4" />} label="Facebook" value={profile?.facebook}
                href={profile?.facebook?.startsWith('http') ? profile.facebook : profile?.facebook ? `https://${profile.facebook}` : undefined}
              />
              <InfoItem
                icon={<Instagram className="w-4 h-4" />} label="Instagram" value={profile?.instagram}
                href={profile?.instagram ? `https://instagram.com/${profile.instagram.replace('@','')}` : undefined}
              />
            </div>
            {!profile?.phone && !profile?.zalo && !profile?.facebook && !profile?.instagram && (
              <p className="text-sm text-muted-foreground mt-2">Nhấn <strong>Sửa</strong> ở trên để thêm thông tin liên lạc.</p>
            )}
          </section>

          {/* ── Lời ngỏ ──────────────────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-3xl p-6">
            <h2 className="font-bold mb-3 flex items-center gap-2 text-base">
              <Heart className="w-4.5 h-4.5 text-primary" />Lời ngỏ & Tâm sự
            </h2>
            {profile?.personal_letter
              ? <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-sm">{profile.personal_letter}</p>
              : <p className="text-sm text-muted-foreground italic">Chưa có lời ngỏ. Nhấn "Sửa" để viết tâm sự của bạn.</p>
            }
          </section>

          {/* ── Album ảnh kỷ niệm ────────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold flex items-center gap-2 text-base"><Camera className="w-4.5 h-4.5 text-primary" />Album kỷ niệm</h2>
              <button onClick={() => memFileRef.current?.click()} className="flex items-center gap-1.5 text-xs text-primary font-semibold hover:underline">
                <Plus className="w-3.5 h-3.5" />Thêm ảnh
              </button>
              <input ref={memFileRef} type="file" accept="image/*" className="hidden" onChange={addMemoryPhoto} />
            </div>
            {memPhotos.length === 0
              ? (
                <div
                  className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
                  onClick={() => memFileRef.current?.click()}
                >
                  <Upload className="w-7 h-7 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Tải ảnh kỷ niệm lên đây</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {memPhotos.map((src, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden aspect-square">
                      <img src={src} alt="" className="w-full h-full object-cover" />
                      <button
                        onClick={() => removeMemoryPhoto(i)}
                        className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => memFileRef.current?.click()}
                    className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:border-primary/40 transition-colors"
                  >
                    <Plus className="w-5 h-5 text-muted-foreground" />
                  </button>
                </div>
              )
            }
          </section>

          {/* ── Bạn bè ────────────────────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-3xl p-6">
            <h2 className="font-bold mb-5 flex items-center gap-2 text-base">
              <Users className="w-4.5 h-4.5 text-primary" />Bạn bè đã thêm
              <Badge variant="outline" className="ml-auto text-xs">{friends.length} bạn</Badge>
            </h2>
            {friends.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                Bạn chưa thêm người bạn nào.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {friends.map(friend => {
                  const name = friend.nickname || friend.full_name || 'Người dùng';
                  return (
                    <Link
                      key={friend.clerk_user_id}
                      href={`/profile/${friend.clerk_user_id}`}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-muted/20 hover:bg-muted/50 transition-colors"
                    >
                      <div className="relative shrink-0">
                        {friend.photo_url
                          ? <img src={friend.photo_url} alt={name} className="w-10 h-10 rounded-full object-cover" />
                          : <AvatarGradient name={name} className="w-10 h-10" textClassName="text-sm" />}
                        <span className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full border-2 border-card ${friend.online ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">{friend.online ? 'Đang hoạt động' : 'Ngoại tuyến'}</p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </motion.div>
      </Show>

      {/* Edit modal */}
      {editing && (
        <EditModal
          profile={profile} user={user}
          onSaved={p => setProfile(p)}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  );
}
