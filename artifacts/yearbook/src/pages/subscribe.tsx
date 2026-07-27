import { useState, useEffect } from 'react';
import { useUser, Show } from '@clerk/react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  Crown, Check, Sparkles, Image, Frame, Palette, FileText,
  Headphones, Users, BookOpen, LogIn, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const BASE = import.meta.env.BASE_URL;

const FREE_FEATURES = [
  { icon: BookOpen, text: '1 kỷ yếu lớp học' },
  { icon: Users, text: 'Tối đa 35 học sinh' },
  { icon: Frame, text: '2 khung ảnh miễn phí' },
  { icon: Image, text: '50 ảnh trong album' },
  { icon: Sparkles, text: 'Ký ức và sự kiện không giới hạn' },
];

const PREMIUM_FEATURES = [
  { icon: BookOpen, text: 'Không giới hạn kỷ yếu' },
  { icon: Users, text: 'Không giới hạn học sinh' },
  { icon: Frame, text: 'Toàn bộ khung ảnh premium + khung động' },
  { icon: Image, text: 'Ảnh không giới hạn' },
  { icon: Palette, text: 'Chủ đề giao diện tùy chỉnh' },
  { icon: FileText, text: 'Xuất PDF kỷ yếu' },
  { icon: Headphones, text: 'Hỗ trợ ưu tiên' },
];

export default function Subscribe() {
  const { user, isLoaded } = useUser();
  const [plan, setPlan] = useState<string>('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [purchaseUrl, setPurchaseUrl] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('checkout_done') === '1') {
      fetch(`${BASE}api/whop/verify`, { credentials: 'include' })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d?.plan) setPlan(d.plan); })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!isLoaded || !user) return;
    fetch(`${BASE}api/whop/verify`, { credentials: 'include' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.plan) setPlan(d.plan); })
      .catch(() => {});
  }, [isLoaded, user]);

  const handleUpgrade = async () => {
    setLoading(true);
    setError('');
    setPurchaseUrl('');
    try {
      const res = await fetch(`${BASE}api/whop/checkout`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) {
        // Payment not yet configured — show info
        setError(data.detail || 'Tính năng thanh toán đang được cấu hình. Vui lòng thử lại sau hoặc liên hệ quản trị viên.');
        return;
      }
      if (data.purchase_url) {
        setPurchaseUrl(data.purchase_url);
        // Auto-redirect after brief delay
        setTimeout(() => { window.location.href = data.purchase_url; }, 800);
      }
    } catch {
      setError('Lỗi kết nối. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      {/* Header */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
          <Crown className="w-8 h-8 text-amber-600" />
        </div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="text-4xl md:text-5xl font-display font-bold mb-3">
          Nâng Cấp Kỷ Yếu
        </motion.h1>
        <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="text-muted-foreground text-lg max-w-xl mx-auto">
          Mở khóa toàn bộ tính năng để tạo kỷ yếu đẹp nhất cho lớp bạn.
        </motion.p>
      </div>

      {/* Premium active banner */}
      {plan === 'premium' && (
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="mb-10 p-6 bg-amber-50 border border-amber-200 rounded-3xl text-center">
          <Crown className="w-10 h-10 text-amber-500 mx-auto mb-2" />
          <h2 className="text-xl font-bold text-amber-800 mb-1">Bạn đang dùng Premium!</h2>
          <p className="text-amber-700 text-sm">Tất cả tính năng cao cấp đã được mở khóa.</p>
        </motion.div>
      )}

      {/* Redirect notification */}
      {purchaseUrl && (
        <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-2xl flex items-center gap-3 text-sm">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
          <span>Đang chuyển đến trang thanh toán...</span>
          <a href={purchaseUrl} className="ml-auto text-primary font-semibold flex items-center gap-1 hover:underline">
            Nhấn đây <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Free */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}
          className="bg-card border border-border rounded-3xl p-8">
          <div className="mb-6">
            <Badge variant="outline" className="mb-3">Miễn Phí</Badge>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">0</span>
              <span className="text-muted-foreground">đ/tháng</span>
            </div>
          </div>
          <ul className="space-y-3 mb-8">
            {FREE_FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-muted-foreground">
                <Icon className="w-4 h-4 shrink-0" />{text}
              </li>
            ))}
          </ul>
          {plan === 'free' && (
            <div className="w-full py-2.5 border border-border rounded-xl text-center text-sm text-muted-foreground font-medium">
              Gói hiện tại
            </div>
          )}
        </motion.div>

        {/* Premium */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-4 right-4">
            <Badge className="bg-amber-500 text-white border-0">Phổ biến</Badge>
          </div>
          <div className="mb-6">
            <div className="flex items-center gap-1.5 mb-3">
              <Crown className="w-4 h-4 text-amber-600" />
              <Badge className="bg-amber-100 text-amber-700 border-amber-200">Premium</Badge>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">$4.99</span>
              <span className="text-muted-foreground">/tháng</span>
            </div>
          </div>
          <ul className="space-y-3 mb-8">
            {PREMIUM_FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <Check className="w-4 h-4 text-amber-600 shrink-0" />{text}
              </li>
            ))}
          </ul>

          <Show when="signed-out">
            <Link href="/sign-in">
              <Button className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                <LogIn className="w-4 h-4" />Đăng nhập để nâng cấp
              </Button>
            </Link>
          </Show>
          <Show when="signed-in">
            {plan === 'premium' ? (
              <div className="w-full py-2.5 bg-amber-200/50 border border-amber-300 rounded-xl text-center text-sm text-amber-800 font-semibold">
                <Check className="w-4 h-4 inline mr-1.5" />Đang hoạt động
              </div>
            ) : (
              <Button onClick={handleUpgrade} disabled={loading}
                className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                <Crown className="w-4 h-4" />
                {loading ? 'Đang xử lý...' : 'Nâng cấp ngay — $4.99/tháng'}
              </Button>
            )}
          </Show>

          {error && (
            <div className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-xl text-sm text-orange-800">
              {error}
            </div>
          )}
        </motion.div>
      </div>

      <p className="text-center text-muted-foreground text-sm mt-8">
        Thanh toán an toàn qua Whop. Có thể hủy bất cứ lúc nào.
      </p>
    </div>
  );
}
