import { useState, useEffect } from 'react';
import { useUser, Show } from '@clerk/react';
import { useListStudents } from '@workspace/api-client-react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import { UserCircle, Link2, PencilLine, Check, Crown, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { AvatarGradient } from '@/components/ui/avatar-gradient';

const BASE = import.meta.env.BASE_URL;

interface UserProfile {
  id: number;
  clerk_user_id: string;
  email: string;
  full_name: string;
  school_name: string;
  class_name: string;
  plan: string;
  student_id: number | null;
}

export default function Profile() {
  const { user, isLoaded } = useUser();
  const { data: students } = useListStudents();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ full_name: '', school_name: '', class_name: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch(`${BASE}api/auth/me`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          setProfile(data);
          setForm({
            full_name: data.full_name || user.fullName || '',
            school_name: data.school_name || '',
            class_name: data.class_name || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [isLoaded, user]);

  const handleSave = async () => {
    setSaving(true);
    const res = await fetch(`${BASE}api/auth/me`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setProfile(data);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 3000);
    }
    setSaving(false);
  };

  const linkToStudent = async (studentId: number) => {
    const res = await fetch(`${BASE}api/auth/me`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ student_id: studentId }),
    });
    if (res.ok) setProfile(await res.json());
  };

  const linkedStudent = students?.find(s => s.id === profile?.student_id);

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <Show when="signed-out">
        <div className="text-center py-24">
          <UserCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Bạn chưa đăng nhập</h2>
          <p className="text-muted-foreground mb-6">Đăng nhập để xem và chỉnh sửa hồ sơ của bạn.</p>
          <Link href="/sign-in">
            <Button>Đăng nhập ngay</Button>
          </Link>
        </div>
      </Show>

      <Show when="signed-in">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex items-center gap-3 mb-8">
            <UserCircle className="w-7 h-7 text-primary" />
            <h1 className="text-3xl font-display font-bold">Hồ Sơ Cá Nhân</h1>
          </div>

          {/* Plan badge */}
          {profile && (
            <div className="mb-6">
              {profile.plan === 'premium' ? (
                <Badge className="bg-amber-100 text-amber-700 border-amber-200 gap-1.5 px-3 py-1">
                  <Crown className="w-3.5 h-3.5" /> Tài khoản Premium
                </Badge>
              ) : (
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="gap-1.5 px-3 py-1">Tài khoản Miễn Phí</Badge>
                  <Link href="/subscribe" className="text-sm text-primary font-semibold hover:underline flex items-center gap-1">
                    <Crown className="w-3.5 h-3.5" /> Nâng cấp Premium
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* Avatar + info */}
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 mb-6">
            <div className="flex items-start gap-6 mb-6">
              {user?.imageUrl ? (
                <img src={user.imageUrl} alt={user.fullName || ''} className="w-20 h-20 rounded-full object-cover" />
              ) : (
                <AvatarGradient name={user?.fullName || 'U'} className="w-20 h-20" textClassName="text-2xl" />
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-bold">{user?.fullName || 'Chưa có tên'}</h2>
                <p className="text-muted-foreground">{user?.primaryEmailAddress?.emailAddress}</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setEditing(!editing)} className="gap-1.5">
                <PencilLine className="w-3.5 h-3.5" />
                {editing ? 'Hủy' : 'Chỉnh sửa'}
              </Button>
            </div>

            {editing ? (
              <div className="space-y-4">
                <div>
                  <Label>Tên hiển thị</Label>
                  <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} className="mt-1" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Trường</Label>
                    <Input value={form.school_name} onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))} placeholder="VD: THCS Vũ Lăng" className="mt-1" />
                  </div>
                  <div>
                    <Label>Lớp</Label>
                    <Input value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} placeholder="VD: 9A" className="mt-1" />
                  </div>
                </div>
                <Button onClick={handleSave} disabled={saving} className="gap-1.5">
                  {saving ? 'Đang lưu...' : <><Check className="w-4 h-4" /> Lưu thay đổi</>}
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                {profile?.school_name && (
                  <div><p className="text-muted-foreground">Trường</p><p className="font-semibold">{profile.school_name}</p></div>
                )}
                {profile?.class_name && (
                  <div><p className="text-muted-foreground">Lớp</p><p className="font-semibold">{profile.class_name}</p></div>
                )}
              </div>
            )}

            {saved && (
              <p className="text-green-600 text-sm mt-3 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Đã lưu thay đổi
              </p>
            )}
          </div>

          {/* Link to student profile */}
          <div className="bg-card border border-border rounded-3xl p-6 md:p-8 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <Link2 className="w-5 h-5 text-primary" />
              <h3 className="text-lg font-bold">Liên kết hồ sơ học sinh</h3>
            </div>
            {linkedStudent ? (
              <div className="flex items-center gap-4 p-4 bg-primary/5 rounded-2xl">
                <AvatarGradient name={linkedStudent.name} className="w-12 h-12" textClassName="text-lg" />
                <div>
                  <p className="font-bold">{linkedStudent.name}</p>
                  {linkedStudent.nickname && <p className="text-muted-foreground text-sm">"{linkedStudent.nickname}"</p>}
                </div>
                <Badge className="ml-auto">Đã liên kết</Badge>
              </div>
            ) : (
              <div>
                <p className="text-muted-foreground text-sm mb-4">Chọn hồ sơ học sinh của bạn trong danh sách lớp để liên kết tài khoản:</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                  {students?.map(s => (
                    <button
                      key={s.id}
                      onClick={() => linkToStudent(s.id)}
                      className="flex items-center gap-2 p-2.5 rounded-xl border border-border hover:border-primary hover:bg-primary/5 transition-colors text-left text-sm"
                    >
                      <AvatarGradient name={s.name} className="w-8 h-8 shrink-0" textClassName="text-xs" />
                      <span className="font-medium truncate">{s.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Create new yearbook */}
          <div className="bg-gradient-to-br from-primary/5 to-secondary/10 border border-primary/20 rounded-3xl p-6 flex items-center gap-4">
            <BookOpen className="w-10 h-10 text-primary shrink-0" />
            <div className="flex-1">
              <h3 className="font-bold">Tạo kỷ yếu cho lớp bạn</h3>
              <p className="text-sm text-muted-foreground">Bạn học ở trường khác? Tạo kỷ yếu riêng cho lớp của bạn.</p>
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
