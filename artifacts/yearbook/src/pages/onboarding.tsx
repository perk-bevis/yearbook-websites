import { useState } from 'react';
import { useUser, Show } from '@clerk/react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { BookOpen, School, Users, Calendar, ArrowRight, LogIn, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const BASE = import.meta.env.BASE_URL;

export default function Onboarding() {
  const { user, isLoaded } = useUser();
  const [, navigate] = useLocation();
  const [step, setStep] = useState<'intro' | 'form' | 'done'>('intro');
  const [form, setForm] = useState({ school_name: '', class_name: '', academic_year: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ id: number; slug: string; school_name: string; class_name: string } | null>(null);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!form.school_name || !form.class_name || !form.academic_year) {
      setError('Vui lòng điền đầy đủ thông tin bắt buộc.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`${BASE}api/yearbooks`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || 'Không thể tạo kỷ yếu. Vui lòng thử lại.');
        return;
      }
      setCreated(data);
      setStep('done');
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <Show when="signed-out">
        <div className="text-center py-24">
          <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Đăng nhập để bắt đầu</h2>
          <p className="text-muted-foreground mb-6">Bạn cần đăng nhập để tạo kỷ yếu cho lớp.</p>
          <Link href="/sign-in"><Button className="gap-2"><LogIn className="w-4 h-4" />Đăng nhập</Button></Link>
        </div>
      </Show>

      <Show when="signed-in">
        {step === 'intro' && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-full mb-6">
              <BookOpen className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-4xl font-display font-bold mb-4">
              Xin chào, {user?.firstName || 'bạn'}!
            </h1>
            <p className="text-muted-foreground text-lg mb-8 max-w-md mx-auto">
              Hãy tạo kỷ yếu cho lớp của bạn — lưu giữ những kỷ niệm đẹp mãi mãi.
            </p>
            <div className="grid grid-cols-3 gap-4 mb-10 text-center">
              {[
                { icon: School, title: 'Nhập thông tin lớp', desc: 'Trường, lớp, năm học' },
                { icon: Users, title: 'Mời thành viên', desc: 'Chia sẻ link cho cả lớp' },
                { icon: BookOpen, title: 'Lưu kỷ niệm', desc: 'Ảnh, ký ức, sự kiện' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-card border border-border rounded-2xl p-4">
                  <div className="inline-flex items-center justify-center w-10 h-10 bg-primary/10 rounded-xl mb-2">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">{desc}</p>
                </div>
              ))}
            </div>
            <Button onClick={() => setStep('form')} className="gap-2 px-8 py-3 text-base">
              Bắt đầu tạo kỷ yếu <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {step === 'form' && (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
            <button onClick={() => setStep('intro')} className="text-muted-foreground text-sm mb-6 hover:text-foreground transition-colors">← Quay lại</button>
            <h2 className="text-3xl font-display font-bold mb-2">Thông tin kỷ yếu</h2>
            <p className="text-muted-foreground mb-8">Điền thông tin để tạo kỷ yếu cho lớp của bạn.</p>

            <div className="bg-card border border-border rounded-3xl p-6 md:p-8 space-y-5">
              <div>
                <Label className="flex items-center gap-1.5 mb-1.5">
                  <School className="w-4 h-4" /> Tên trường <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={form.school_name}
                  onChange={e => setForm(f => ({ ...f, school_name: e.target.value }))}
                  placeholder="VD: THCS Vũ Lăng"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5">
                    <Users className="w-4 h-4" /> Lớp <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.class_name}
                    onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))}
                    placeholder="VD: 9A, 12B3"
                  />
                </div>
                <div>
                  <Label className="flex items-center gap-1.5 mb-1.5">
                    <Calendar className="w-4 h-4" /> Niên khóa <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={form.academic_year}
                    onChange={e => setForm(f => ({ ...f, academic_year: e.target.value }))}
                    placeholder="VD: 2022-2025"
                  />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">Lời giới thiệu <span className="text-muted-foreground font-normal">(tùy chọn)</span></Label>
                <Input
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Một câu mô tả về lớp bạn..."
                />
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <Button onClick={handleCreate} disabled={saving} className="w-full gap-2 py-3">
                {saving ? 'Đang tạo...' : <><Check className="w-4 h-4" /> Tạo kỷ yếu</>}
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'done' && created && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-3xl font-display font-bold mb-3">Kỷ yếu đã được tạo!</h2>
            <p className="text-muted-foreground mb-2">
              <span className="font-semibold text-foreground">{created.class_name}</span> — {created.school_name}
            </p>
            <p className="text-muted-foreground text-sm mb-8">
              Chia sẻ link này cho cả lớp để cùng nhau lưu giữ kỷ niệm.
            </p>
            <div className="bg-muted/50 rounded-2xl px-5 py-3 font-mono text-sm mb-8 border border-border">
              {window.location.origin}{BASE}yearbooks/{created.slug}
            </div>
            <div className="flex gap-3 justify-center">
              <Link href="/profile">
                <Button variant="outline">Về hồ sơ</Button>
              </Link>
              <Link href="/">
                <Button>Về trang chủ</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </Show>
    </div>
  );
}
