import { useState, useEffect, useRef } from 'react';
import { useUser, Show } from '@clerk/react';
import { useListStudents } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  UserCircle, Link2, PencilLine, Check, Crown, BookOpen,
  Camera, Phone, Facebook, Instagram, MessageCircle, Quote,
  Heart, CalendarDays, Upload, Trash2, Plus, Send, LogIn,
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
  student_id: number | null;
}

interface GuestbookEntry {
  id: number;
  author_name: string;
  message: string;
  created_at: string;
}

/* ─── Avatar upload ───────────────────────────────────────────────────────── */
function AvatarSection({ profile, user, onUpdated }: { profile: UserProfile | null; user: any; onUpdated: (url: string) => void }) {
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
          method: 'POST',
          credentials: 'include',
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

  const avatarSrc = profile?.photo_url || user?.imageUrl;

  return (
    <div className="relative w-24 h-24 shrink-0">
      {avatarSrc ? (
        <img src={avatarSrc} alt="Avatar" className="w-24 h-24 rounded-full object-cover ring-4 ring-background shadow-lg" />
      ) : (
        <AvatarGradient name={user?.fullName || 'U'} className="w-24 h-24" textClassName="text-2xl" />
      )}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary/90 transition-colors"
        title="Thay đổi ảnh đại diện"
      >
        {uploading ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
    </div>
  );
}

/* ─── Main page ───────────────────────────────────────────────────────────── */
export default function Profile() {
  const { user, isLoaded } = useUser();
  const { data: students } = useListStudents();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: '', nickname: '', birth_date: '', phone: '',
    facebook: '', instagram: '', zalo: '', favorite_quote: '',
    personal_letter: '', school_name: '', class_name: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [guestbook, setGuestbook] = useState<GuestbookEntry[]>([]);
  const [gbMsg, setGbMsg] = useState('');
  const [gbName, setGbName] = useState('');
  const [gbSending, setGbSending] = useState(false);
  const [memPhotos, setMemPhotos] = useState<string[]>([]);
  const memFileRef = useRef<HTMLInputElement>(null);

  const fetchProfile = () => {
    if (!isLoaded || !user) return;
    fetch(`${BASE}api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfile(data);
          setMemPhotos(data.memory_photos || []);
          setForm({
            full_name: data.full_name || user.fullName || '',
            nickname: data.nickname || '',
            birth_date: data.birth_date || '',
            phone: data.phone || '',
            facebook: data.facebook || '',
            instagram: data.instagram || '',
            zalo: data.zalo || '',
            favorite_quote: data.favorite_quote || '',
            personal_letter: data.personal_letter || '',
            school_name: data.school_name || '',
            class_name: data.class_name || '',
          });
        }
      })
      .finally(() => setLoading(false));
  };

  const fetchGuestbook = () => {
    if (!isLoaded || !user) return;
    fetch(`${BASE}api/users/${user.id}/guestbook`)
      .then(r => r.ok ? r.json() : [])
      .then(setGuestbook)
      .catch(() => {});
  };

  useEffect(() => { fetchProfile(); fetchGuestbook(); }, [isLoaded, user]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`${BASE}api/auth/me`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setSaved(true); setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const linkToStudent = async (studentId: number) => {
    const res = await fetch(`${BASE}api/auth/me`, {
      method: 'PUT', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId }),
    });
    if (res.ok) setProfile(await res.json());
  };

  const addMemoryPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    if (res.ok) {
      const entry = await res.json();
      setGuestbook(g => [entry, ...g]);
      setGbMsg(''); setGbName('');
    }
    setGbSending(false);
  };

  const deleteGbEntry = async (id: number) => {
    const res = await fetch(`${BASE}api/users/${user?.id}/guestbook/${id}`, {
      method: 'DELETE', credentials: 'include',
    });
    if (res.ok) setGuestbook(g => g.filter(e => e.id !== id));
  };

  const linkedStudent = students?.find(s => s.id === profile?.student_id);

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Show when="signed-out">
        <div className="text-center py-24">
          <UserCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Bạn chưa đăng nhập</h2>
          <p className="text-muted-foreground mb-6">Đăng nhập để xem và chỉnh sửa hồ sơ kỷ yếu của bạn.</p>
          <Link href="/sign-in"><Button className="gap-2"><LogIn className="w-4 h-4" />Đăng nhập ngay</Button></Link>
        </div>
      </Show>

      <Show when="signed-in">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="flex items-center gap-3">
            <UserCircle className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-display font-bold">Hồ Sơ Kỷ Yếu</h1>
          </div>

          {/* Plan badge */}
          {profile && (
            <div>
              {profile.plan === 'premium'
                ? <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5 px-3 py-1"><Crown className="w-3.5 h-3.5" />Premium</Badge>
                : <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-3 py-1">Miễn Phí</Badge>
                    <Link href="/subscribe" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
                      <Crown className="w-3.5 h-3.5" />Nâng cấp Premium
                    </Link>
                  </div>
              }
            </div>
          )}

          {/* ── 1. Thông tin cơ bản ─────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-3xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-bold text-lg flex items-center gap-2"><UserCircle className="w-5 h-5 text-primary" />Thông tin cơ bản</h2>
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="gap-1.5">
                <PencilLine className="w-3.5 h-3.5" />{editing ? 'Hủy' : 'Chỉnh sửa'}
              </Button>
            </div>

            {/* Avatar */}
            <div className="flex items-start gap-5 mb-6">
              <AvatarSection
                profile={profile}
                user={user}
                onUpdated={url => setProfile(p => p ? { ...p, photo_url: url } : p)}
              />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Nhấn vào icon máy ảnh để thay đổi ảnh đại diện</p>
                {profile?.photo_url && (
                  <Badge variant="outline" className="text-xs gap-1"><Check className="w-3 h-3 text-green-600" />Đã tải ảnh lên</Badge>
                )}
              </div>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1.5 block">Họ và tên đầy đủ</Label>
                    <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} placeholder="Nguyễn Thị Lan" />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Biệt danh trong lớp</Label>
                    <Input value={form.nickname} onChange={e => setForm(f => ({ ...f, nickname: e.target.value }))} placeholder="Lan Hoa, Cún..." />
                  </div>
                </div>
                <div>
                  <Label className="mb-1.5 flex items-center gap-1.5"><CalendarDays className="w-3.5 h-3.5" />Ngày sinh</Label>
                  <Input type="date" value={form.birth_date} onChange={e => setForm(f => ({ ...f, birth_date: e.target.value }))} />
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" />Thông tin liên lạc</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1 block text-xs">Số điện thoại</Label>
                      <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="0912 345 678" />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Zalo</Label>
                      <Input value={form.zalo} onChange={e => setForm(f => ({ ...f, zalo: e.target.value }))} placeholder="Số Zalo" />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Facebook</Label>
                      <Input value={form.facebook} onChange={e => setForm(f => ({ ...f, facebook: e.target.value }))} placeholder="facebook.com/..." />
                    </div>
                    <div>
                      <Label className="mb-1 block text-xs">Instagram</Label>
                      <Input value={form.instagram} onChange={e => setForm(f => ({ ...f, instagram: e.target.value }))} placeholder="@username" />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="mb-1.5 flex items-center gap-1.5"><Quote className="w-3.5 h-3.5" />Câu nói tâm đắc</Label>
                  <Input value={form.favorite_quote} onChange={e => setForm(f => ({ ...f, favorite_quote: e.target.value }))} placeholder="Câu châm ngôn hay câu nói yêu thích..." />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="mb-1.5 block">Trường</Label>
                    <Input value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))} placeholder="THCS Vũ Lăng" />
                  </div>
                  <div>
                    <Label className="mb-1.5 block">Lớp</Label>
                    <Input value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} placeholder="9A" />
                  </div>
                </div>

                {saved && <p className="text-green-600 text-sm flex items-center gap-1.5"><Check className="w-4 h-4" />Đã lưu thay đổi</p>}
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? 'Đang lưu...' : <><Check className="w-4 h-4" />Lưu thay đổi</>}
                </Button>
              </div>
            ) : (
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  {profile?.full_name && <InfoRow label="Họ tên" value={profile.full_name} />}
                  {profile?.nickname && <InfoRow label="Biệt danh" value={`"${profile.nickname}"`} />}
                  {profile?.birth_date && <InfoRow label="Ngày sinh" value={profile.birth_date} icon={<CalendarDays className="w-3.5 h-3.5" />} />}
                  {profile?.school_name && <InfoRow label="Trường" value={profile.school_name} />}
                  {profile?.class_name && <InfoRow label="Lớp" value={profile.class_name} />}
                </div>
                {(profile?.phone || profile?.zalo || profile?.facebook || profile?.instagram) && (
                  <div className="border-t border-border pt-4 space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Liên lạc</p>
                    <div className="grid grid-cols-2 gap-2">
                      {profile?.phone && <ContactRow icon={<Phone className="w-3.5 h-3.5" />} value={profile.phone} />}
                      {profile?.zalo && <ContactRow icon={<MessageCircle className="w-3.5 h-3.5" />} value={profile.zalo} label="Zalo" />}
                      {profile?.facebook && <ContactRow icon={<Facebook className="w-3.5 h-3.5" />} value={profile.facebook} />}
                      {profile?.instagram && <ContactRow icon={<Instagram className="w-3.5 h-3.5" />} value={profile.instagram} />}
                    </div>
                  </div>
                )}
                {profile?.favorite_quote && (
                  <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground">
                    "{profile.favorite_quote}"
                  </blockquote>
                )}
                {!profile?.full_name && !editing && (
                  <p className="text-muted-foreground text-sm">Nhấn "Chỉnh sửa" để thêm thông tin hồ sơ của bạn.</p>
                )}
              </div>
            )}
          </section>

          {/* ── 2. Lời ngỏ / Tâm sự ────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-3xl p-6 md:p-8">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
              <Heart className="w-5 h-5 text-primary" />Lời ngỏ & Tâm sự
            </h2>
            {editing ? (
              <Textarea
                value={form.personal_letter}
                onChange={e => setForm(f => ({ ...f, personal_letter: e.target.value }))}
                placeholder="Đôi lời chia sẻ về cảm xúc cuối cấp, kỷ niệm đáng nhớ với bạn bè và thầy cô..."
                rows={6}
                className="resize-none"
              />
            ) : profile?.personal_letter ? (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.personal_letter}</p>
            ) : (
              <p className="text-muted-foreground text-sm italic">Chưa có lời ngỏ. Nhấn "Chỉnh sửa" để viết tâm sự của bạn.</p>
            )}
          </section>

          {/* ── 3. Album ảnh kỷ niệm ────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-3xl p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Camera className="w-5 h-5 text-primary" />Album ảnh kỷ niệm
              </h2>
              <button
                onClick={() => memFileRef.current?.click()}
                className="flex items-center gap-1.5 text-sm text-primary font-semibold hover:underline"
              >
                <Plus className="w-4 h-4" />Thêm ảnh
              </button>
              <input ref={memFileRef} type="file" accept="image/*" className="hidden" onChange={addMemoryPhoto} />
            </div>
            {memPhotos.length === 0 ? (
              <div
                className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => memFileRef.current?.click()}
              >
                <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Tải lên ảnh kỷ niệm — ảnh chụp chung, ảnh nhóm bạn thân, ảnh dã ngoại...</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {memPhotos.map((src, i) => (
                  <div key={i} className="relative group rounded-xl overflow-hidden aspect-square">
                    <img src={src} alt={`memory-${i}`} className="w-full h-full object-cover" />
                    <button
                      onClick={() => removeMemoryPhoto(i)}
                      className="absolute top-1.5 right-1.5 w-7 h-7 bg-destructive/90 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => memFileRef.current?.click()}
                  className="aspect-square rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:border-primary/50 transition-colors"
                >
                  <Plus className="w-6 h-6 text-muted-foreground" />
                </button>
              </div>
            )}
          </section>

          {/* ── 4. Liên kết hồ sơ học sinh ──────────────────────────────── */}
          <section className="bg-card border border-border rounded-3xl p-6 md:p-8">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-4">
              <Link2 className="w-5 h-5 text-primary" />Liên kết hồ sơ học sinh
            </h2>
            {linkedStudent ? (
              <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl">
                <AvatarGradient name={linkedStudent.name} className="w-12 h-12" textClassName="text-lg" />
                <div>
                  <p className="font-bold">{linkedStudent.name}</p>
                  {linkedStudent.nickname && <p className="text-muted-foreground text-sm">"{linkedStudent.nickname}"</p>}
                </div>
                <Badge className="ml-auto gap-1"><Check className="w-3 h-3" />Đã liên kết</Badge>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground text-sm mb-3">Chọn hồ sơ học sinh của bạn trong danh sách lớp:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                  {students?.map(s => (
                    <button key={s.id} onClick={() => linkToStudent(s.id)}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left text-sm"
                    >
                      <AvatarGradient name={s.name} className="w-8 h-8 shrink-0" textClassName="text-xs" />
                      <span className="font-medium truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* ── 5. Sổ lưu bút ───────────────────────────────────────────── */}
          <section className="bg-card border border-border rounded-3xl p-6 md:p-8">
            <h2 className="font-bold text-lg flex items-center gap-2 mb-6">
              <BookOpen className="w-5 h-5 text-primary" />Sổ lưu bút
              <Badge variant="outline" className="ml-auto">{guestbook.length} lời nhắn</Badge>
            </h2>

            {/* Write a message */}
            <div className="bg-muted/30 rounded-2xl p-4 mb-6 space-y-3">
              <p className="text-sm font-semibold">Để lại lời nhắn cho {profile?.full_name?.split(' ').pop() || 'bạn'}:</p>
              <Input value={gbName} onChange={e => setGbName(e.target.value)} placeholder="Tên của bạn (bỏ trống = ẩn danh)" className="bg-background" />
              <Textarea value={gbMsg} onChange={e => setGbMsg(e.target.value)} placeholder="Viết lời nhắn, ký tên, hoặc gửi lời chúc..." rows={3} className="bg-background resize-none" />
              <Button onClick={sendGuestbook} disabled={gbSending || !gbMsg.trim()} size="sm" className="gap-1.5">
                <Send className="w-3.5 h-3.5" />{gbSending ? 'Đang gửi...' : 'Gửi lời nhắn'}
              </Button>
            </div>

            {/* Entries */}
            {guestbook.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">Chưa có lời nhắn nào. Hãy là người đầu tiên!</p>
            ) : (
              <div className="space-y-3">
                {guestbook.map(entry => (
                  <div key={entry.id} className="group flex gap-3 p-4 rounded-2xl bg-muted/20 hover:bg-muted/40 transition-colors">
                    <AvatarGradient name={entry.author_name} className="w-9 h-9 shrink-0 mt-0.5" textClassName="text-xs" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-semibold text-sm">{entry.author_name}</span>
                        <span className="text-xs text-muted-foreground">{new Date(entry.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <p className="text-sm leading-relaxed">{entry.message}</p>
                    </div>
                    <button
                      onClick={() => deleteGbEntry(entry.id)}
                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all shrink-0"
                      title="Xóa"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* ── Create yearbook CTA ──────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-primary/5 to-secondary/10 border border-primary/20 rounded-3xl p-6 flex items-center gap-4">
            <BookOpen className="w-10 h-10 text-primary shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold">Tạo kỷ yếu cho lớp bạn</h3>
              <p className="text-sm text-muted-foreground">Học trường khác? Tạo kỷ yếu riêng cho lớp của bạn ngay.</p>
            </div>
            <Link href="/onboarding">
              <Button variant="outline" className="shrink-0">Tạo ngay</Button>
            </Link>
          </div>
        </motion.div>
      </Show>
    </div>
  );
}

/* ─── Small helpers ───────────────────────────────────────────────────────── */
function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="text-muted-foreground text-xs mb-0.5">{label}</p>
      <p className="font-semibold flex items-center gap-1">{icon}{value}</p>
    </div>
  );
}
function ContactRow({ icon, value, label }: { icon: React.ReactNode; value: string; label?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">{icon}</span>
      <span className="truncate">{value}</span>
    </div>
  );
}
