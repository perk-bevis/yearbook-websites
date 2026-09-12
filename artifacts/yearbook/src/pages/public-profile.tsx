import { useEffect, useState } from 'react';
import { useUser, Show } from '@clerk/react';
import { Link, useParams } from 'wouter';
import { motion } from 'framer-motion';
import { UserCircle, UserPlus, UserCheck, Clock3, MessageCircle, UserMinus, LogIn, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AvatarGradient } from '@/components/ui/avatar-gradient';

const BASE = import.meta.env.BASE_URL;

interface PublicProfileData {
  clerk_user_id: string;
  full_name: string;
  nickname?: string;
  photo_url?: string;
  school_name?: string;
  class_name?: string;
  role?: string;
  personal_letter?: string;
  favorite_quote?: string;
  online?: boolean;
}

type FriendStatus = 'self' | 'friends' | 'outgoing' | 'incoming' | 'none';

export default function PublicProfile() {
  const { user } = useUser();
  const { userId } = useParams<{ userId: string }>();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [status, setStatus] = useState<FriendStatus>('none');
  const [requestId, setRequestId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionBusy, setActionBusy] = useState(false);

  const load = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const profileRes = await fetch(`${BASE}api/users/${userId}/profile`);
      if (profileRes.ok) setProfile(await profileRes.json());
      if (user) {
        const statusRes = await fetch(`${BASE}api/friends/status/${userId}`, { credentials: 'include' });
        if (statusRes.ok) {
          const data = await statusRes.json();
          setStatus(data.status);
          setRequestId(data.request_id || null);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [userId, user?.id]);

  const friendAction = async () => {
    if (!user || !userId || actionBusy) return;
    setActionBusy(true);
    try {
      let res: Response;
      if (status === 'incoming' && requestId) {
        res = await fetch(`${BASE}api/friends/accept/${requestId}`, { method: 'POST', credentials: 'include' });
      } else if (status === 'friends') {
        res = await fetch(`${BASE}api/friends/${userId}`, { method: 'DELETE', credentials: 'include' });
      } else {
        res = await fetch(`${BASE}api/friends/request/${userId}`, { method: 'POST', credentials: 'include' });
      }
      if (res.ok) await load();
    } finally {
      setActionBusy(false);
    }
  };

  const name = profile?.nickname || profile?.full_name || 'Người dùng';

  if (loading) return <div className="container mx-auto max-w-2xl px-4 py-20 text-center text-muted-foreground">Đang tải hồ sơ...</div>;
  if (!profile) return <div className="container mx-auto max-w-2xl px-4 py-20 text-center">Không tìm thấy hồ sơ này.</div>;

  return (
    <div className="container mx-auto max-w-2xl px-4 py-12">
      <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
        <section className="bg-card border rounded-3xl p-6">
          <div className="flex items-start gap-5">
            <div className="relative shrink-0">
              {profile.photo_url
                ? <img src={profile.photo_url} alt={name} className="w-24 h-24 rounded-full object-cover ring-4 ring-background shadow-lg" />
                : <AvatarGradient name={name} className="w-24 h-24" textClassName="text-3xl" />}
              <span className={`absolute right-1 bottom-1 w-4 h-4 rounded-full border-2 border-card ${profile.online ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold truncate">{profile.full_name || name}</h1>
              {profile.nickname && <p className="text-muted-foreground">"{profile.nickname}"</p>}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {profile.role === 'teacher' && <Badge variant="outline" className="gap-1"><GraduationCap className="w-3 h-3" />Giáo viên</Badge>}
                {profile.school_name && <span className="text-xs text-muted-foreground">{profile.school_name}</span>}
                {profile.class_name && <span className="text-xs text-muted-foreground">• {profile.class_name}</span>}
              </div>
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                <span className={`w-1.5 h-1.5 rounded-full ${profile.online ? 'bg-emerald-500' : 'bg-muted-foreground/50'}`} />
                {profile.online ? 'Đang hoạt động' : 'Không hoạt động'}
              </p>
            </div>
          </div>

          <Show when="signed-out">
            <div className="mt-6 pt-5 border-t flex justify-center">
              <Link href="/sign-in"><Button className="gap-2"><LogIn className="w-4 h-4" />Đăng nhập để kết bạn</Button></Link>
            </div>
          </Show>
          <Show when="signed-in">
            {status !== 'self' && (
              <div className="mt-6 pt-5 border-t flex flex-wrap gap-2">
                <Button onClick={friendAction} disabled={actionBusy} variant={status === 'friends' ? 'outline' : 'default'} className="gap-2">
                  {status === 'friends' ? <><UserMinus className="w-4 h-4" />Hủy kết bạn</>
                    : status === 'outgoing' ? <><Clock3 className="w-4 h-4" />Đã gửi lời mời</>
                    : status === 'incoming' ? <><UserCheck className="w-4 h-4" />Chấp nhận kết bạn</>
                    : <><UserPlus className="w-4 h-4" />Thêm bạn bè</>}
                </Button>
                <Link href={`/tin-nhan/${profile.clerk_user_id}`}>
                  <Button variant="outline" className="gap-2"><MessageCircle className="w-4 h-4" />Nhắn tin</Button>
                </Link>
              </div>
            )}
          </Show>
        </section>

        {(profile.favorite_quote || profile.personal_letter) && (
          <section className="bg-card border rounded-3xl p-6 space-y-5">
            {profile.favorite_quote && <blockquote className="border-l-4 border-primary/30 pl-4 italic text-muted-foreground">"{profile.favorite_quote}"</blockquote>}
            {profile.personal_letter && <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">{profile.personal_letter}</p>}
          </section>
        )}
      </motion.div>
    </div>
  );
}