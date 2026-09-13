import { useState } from 'react';
import { useUser, Show } from '@clerk/react';
import { useLocation, Link } from 'wouter';
import { motion } from 'framer-motion';
import { GraduationCap, Users, ArrowRight, Crown, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

const BASE = import.meta.env.BASE_URL;

export default function RoleSelect() {
  const { user } = useUser();
  const [, navigate] = useLocation();
  const [selected, setSelected] = useState<'teacher' | 'student' | 'class_leader' | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${BASE}api/auth/me/role`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: selected }),
      });
      if (!res.ok) {
        const d = await res.json();
        setError(d.detail || 'Có lỗi xảy ra');
        return;
      }
      navigate('/');
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100dvh-4rem)] flex items-center justify-center px-4 py-12">
      <Show when="signed-out">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Bạn cần đăng nhập để tiếp tục.</p>
          <Link href="/sign-in"><Button className="gap-2"><LogIn className="w-4 h-4" />Đăng nhập</Button></Link>
        </div>
      </Show>

      <Show when="signed-in">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-display font-bold mb-2">
              Xin chào, {user?.firstName || 'bạn'}!
            </h1>
            <p className="text-muted-foreground">
              Bạn là giáo viên, học sinh hay lớp trưởng của lớp 9A?
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {/* Teacher card */}
            <button
              onClick={() => setSelected('teacher')}
              className={`group relative flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all cursor-pointer ${
                selected === 'teacher'
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                selected === 'teacher' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
              }`}>
                <GraduationCap className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">Giáo viên</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Có thể gửi lời nhắn trong trang "Lời thầy cô"
                </p>
              </div>
              {selected === 'teacher' && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>

            {/* Student card */}
            <button
              onClick={() => setSelected('student')}
              className={`group relative flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all cursor-pointer ${
                selected === 'student'
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                selected === 'student' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
              }`}>
                <Users className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">Học sinh</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Tham gia bảng tin, nhắn tin và tương tác với bạn bè
                </p>
              </div>
              {selected === 'student' && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>

            {/* Class leader card */}
            <button
              onClick={() => setSelected('class_leader')}
              className={`group relative flex flex-col items-center gap-4 p-6 rounded-3xl border-2 transition-all cursor-pointer ${
                selected === 'class_leader'
                  ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border bg-card hover:border-primary/40 hover:bg-muted/30'
              }`}
            >
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${
                selected === 'class_leader' ? 'bg-primary text-white' : 'bg-primary/10 text-primary'
              }`}>
                <Crown className="w-8 h-8" />
              </div>
              <div className="text-center">
                <p className="font-bold text-lg">Lớp trưởng</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Quản lý ảnh kỷ niệm và ghim bài viết quan trọng
                </p>
              </div>
              {selected === 'class_leader' && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </button>
          </div>

          {error && <p className="text-destructive text-sm text-center mb-4">{error}</p>}

          <Button
            onClick={handleConfirm}
            disabled={!selected || saving}
            className="w-full gap-2 py-3 text-base"
          >
            {saving ? 'Đang lưu...' : <>Xác nhận <ArrowRight className="w-4 h-4" /></>}
          </Button>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Bạn có thể thay đổi thông tin này sau trong hồ sơ.
          </p>
        </motion.div>
      </Show>
    </div>
  );
}
