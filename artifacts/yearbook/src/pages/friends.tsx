import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from '@clerk/react';
import { Link } from 'wouter';
import { motion } from 'framer-motion';
import {
  Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, GraduationCap,
  LoaderCircle, MapPin, Search, UserMinus, UserPlus, UsersRound, X, Inbox, Send,
} from 'lucide-react';
import {
  getGetFriendsOverviewQueryKey,
  getListClassesQueryKey,
  getListCohortsQueryKey,
  getSearchUsersQueryKey,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useGetFriendsOverview,
  useListClasses,
  useListCohorts,
  useRemoveFriend,
  useRequestFriendship,
  useSearchUsers,
} from '@workspace/api-client-react';
import type { SearchUsersParams, SocialUser } from '@workspace/api-client-react';
import { AvatarGradient } from '@/components/ui/avatar-gradient';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type FriendsTab = 'friends' | 'incoming' | 'outgoing' | 'discover';

function personName(person: SocialUser) {
  return person.nickname || person.full_name || 'Bạn học';
}

function PersonAvatar({ person, size = 'md' }: { person: SocialUser; size?: 'sm' | 'md' | 'lg' }) {
  const name = personName(person);
  const sizeClass = size === 'lg' ? 'h-[4.5rem] w-[4.5rem]' : size === 'sm' ? 'h-11 w-11' : 'h-14 w-14';
  return (
    <div className="relative shrink-0">
      {person.photo_url
        ? <img src={person.photo_url} alt={name} className={cn(sizeClass, 'rounded-full object-cover ring-2 ring-background')} />
        : <AvatarGradient name={name} className={sizeClass} textClassName={size === 'lg' ? 'text-2xl' : 'text-base'} />}
      <span className={cn(
        'absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card',
        person.online ? 'bg-emerald-500' : 'bg-muted-foreground/35',
      )} />
    </div>
  );
}

function PersonMeta({ person }: { person: SocialUser }) {
  return (
    <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      {person.class_name && <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{person.class_name}</span>}
      {person.school_name && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{person.school_name}</span>}
    </div>
  );
}

function SectionTitle({ eyebrow, title, count }: { eyebrow?: string; title: string; count?: number }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-3">
      <div>
        {eyebrow && <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{eyebrow}</p>}
        <h2 className="font-display text-3xl font-bold leading-none text-foreground">{title}</h2>
      </div>
      {count !== undefined && <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">{count}</span>}
    </div>
  );
}

export default function Friends() {
  const { isLoaded: authLoaded, isSignedIn } = useUser();
  const queryClient = useQueryClient();
  const overviewQuery = useGetFriendsOverview({
    query: { enabled: !!isSignedIn, queryKey: getGetFriendsOverviewQueryKey() },
  });
  const { data: overview, isLoading, isError, refetch } = overviewQuery;
  const { data: cohorts } = useListCohorts({
    query: { enabled: !!isSignedIn, queryKey: getListCohortsQueryKey() },
  });
  const [query, setQuery] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [classId, setClassId] = useState('');
  const [activeTab, setActiveTab] = useState<FriendsTab>('friends');
  const [page, setPage] = useState(1);
  const [feedback, setFeedback] = useState('');

  const cohortFilter = cohortId ? Number(cohortId) : undefined;
  const classFilter = classId ? Number(classId) : undefined;
  const classParams = useMemo(() => ({ cohort_id: cohortFilter }), [cohortFilter]);
  const { data: classes } = useListClasses(classParams, {
    query: { enabled: !!isSignedIn && !!cohortFilter, queryKey: getListClassesQueryKey(classParams) },
  });
  const searchParams = useMemo<SearchUsersParams>(() => ({
    ...(query.trim() ? { q: query.trim() } : {}),
    ...(cohortFilter ? { cohort_id: cohortFilter } : {}),
    ...(classFilter ? { class_id: classFilter } : {}),
    page,
    page_size: 12,
  }), [query, cohortFilter, classFilter, page]);
  const searchQuery = useSearchUsers(searchParams, {
    query: {
      enabled: !!isSignedIn && activeTab === 'discover',
      queryKey: getSearchUsersQueryKey(searchParams),
    },
  });

  const requestFriend = useRequestFriendship();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();
  const mutationBusy = requestFriend.isPending || acceptRequest.isPending || declineRequest.isPending || removeFriend.isPending;

  const refreshSocial = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetFriendsOverviewQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getSearchUsersQueryKey(searchParams) }),
    ]);
  };

  const runAction = async (action: () => Promise<unknown>, message: string) => {
    setFeedback('');
    try {
      await action();
      await refreshSocial();
      setFeedback(message);
    } catch {
      setFeedback('Không thể hoàn tất thao tác lúc này. Bạn thử lại nhé.');
    }
  };

  const sendRequest = (targetId: string) => runAction(
    () => requestFriend.mutateAsync({ data: { target_id: targetId } }),
    'Đã gửi lời mời kết bạn.',
  );
  const accept = (requestId?: number | null) => {
    if (!requestId) return;
    void runAction(() => acceptRequest.mutateAsync({ requestId }), 'Hai bạn đã kết nối.');
  };
  const decline = (requestId?: number | null) => {
    if (!requestId) return;
    void runAction(() => declineRequest.mutateAsync({ requestId }), 'Đã bỏ qua lời mời.');
  };
  const remove = (targetId: string, cancel = false) => {
    const prompt = cancel ? 'Hủy lời mời kết bạn đã gửi?' : 'Bạn muốn gỡ người này khỏi danh sách bạn bè?';
    if (!window.confirm(prompt)) return;
    void runAction(() => removeFriend.mutateAsync({ targetId }), cancel ? 'Đã hủy lời mời.' : 'Đã cập nhật danh sách bạn bè.');
  };

  const friends = overview?.friends ?? [];
  const incoming = overview?.incoming ?? [];
  const outgoing = overview?.outgoing ?? [];
  const suggestions = overview?.suggestions ?? [];
  const searchItems = searchQuery.data?.items ?? [];
  const totalPages = Math.max(1, Math.ceil((searchQuery.data?.total ?? 0) / (searchQuery.data?.page_size ?? 12)));
  const changeFilter = (setter: (value: string) => void, value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-7 md:py-10">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
        <section className="relative mb-8 overflow-hidden rounded-[2rem] border border-primary/10 bg-primary/[0.055] px-5 py-7 md:px-9 md:py-9">
          <div aria-hidden className="pointer-events-none absolute -right-12 -top-16 h-64 w-64 rounded-full border-[1.5rem] border-accent/20" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 right-32 h-40 w-40 rounded-full bg-secondary/35 blur-2xl" />
          <div className="relative z-10 flex flex-col gap-7 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">Kỷ Yếu Vũ Lăng · Kết nối lại</p>
              <h1 className="font-display text-5xl font-bold leading-[0.95] tracking-tight text-foreground md:text-6xl">Bạn bè năm ấy,<br className="hidden sm:block" /> vẫn ở đây.</h1>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
                Tìm lại những gương mặt thân quen, gửi một lời chào và nối tiếp câu chuyện từ ngày còn chung lớp.
              </p>
            </div>
            <div className="flex gap-2 self-start md:self-auto">
              <div className="min-w-[104px] rounded-2xl border border-border/70 bg-card/80 px-4 py-3">
                <p className="font-display text-3xl font-bold leading-none">{friends.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Bạn bè</p>
              </div>
              <div className="min-w-[104px] rounded-2xl border border-border/70 bg-card/80 px-4 py-3">
                <p className="font-display text-3xl font-bold leading-none">{incoming.length}</p>
                <p className="mt-1 text-xs text-muted-foreground">Lời mời mới</p>
              </div>
            </div>
          </div>
        </section>

        {feedback && (
          <div role="status" className="mb-5 flex items-center justify-between gap-3 rounded-xl border border-primary/15 bg-primary/[0.06] px-4 py-3 text-sm text-foreground">
            <span>{feedback}</span><button onClick={() => setFeedback('')} aria-label="Đóng thông báo"><X className="h-4 w-4" /></button>
          </div>
        )}

        {!authLoaded ? (
          <section className="rounded-[2rem] border border-border bg-card p-5 md:p-7">
            <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-16 rounded-2xl" />)}</div>
            <Skeleton className="mt-5 h-48 rounded-2xl" />
          </section>
        ) : !isSignedIn ? (
          <section className="rounded-[2rem] border border-border bg-card px-5 py-12 text-center shadow-sm md:px-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UsersRound className="h-7 w-7" /></div>
            <h2 className="font-display text-3xl font-bold">Đăng nhập để gặp lại bạn cũ</h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Danh sách bạn bè, lời mời và gợi ý kết nối chỉ hiển thị với thành viên đã đăng nhập.</p>
            <Link href="/sign-in" className="mt-5 inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Đăng nhập để tiếp tục</Link>
          </section>
        ) : (
          <section className="rounded-[2rem] border border-border bg-card p-4 shadow-sm md:p-7">
            <div className="mb-5">
              <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Cùng nhau lớn lên</p>
              <h2 className="font-display text-4xl font-bold leading-none">Kết nối bạn bè</h2>
            </div>
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-2xl bg-muted/65 p-1.5 md:grid-cols-4" role="tablist" aria-label="Danh sách kết nối">
              {([
                { id: 'friends' as const, title: 'Bạn bè', count: friends.length, icon: UsersRound },
                { id: 'incoming' as const, title: 'Lời mời đến', count: incoming.length, icon: Inbox },
                { id: 'outgoing' as const, title: 'Đã gửi', count: outgoing.length, icon: Send },
                { id: 'discover' as const, title: 'Khám phá', icon: Search },
              ]).map(({ id, title, count, icon: Icon }) => (
                <button key={id} type="button" role="tab" aria-selected={activeTab === id} onClick={() => setActiveTab(id)} className={cn(
                  'flex min-h-11 items-center justify-center gap-2 rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:text-sm',
                  activeTab === id ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}>
                  <Icon className="h-4 w-4 shrink-0" />{title}
                  {count !== undefined && <span className={cn('rounded-full px-1.5 py-0.5 text-[10px]', activeTab === id ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground')}>{count}</span>}
                </button>
              ))}
            </div>

            {activeTab === 'friends' && (
              <div role="tabpanel">
                <SectionTitle eyebrow="Đã nối lại liên lạc" title="Bạn bè" count={friends.length} />
                {isLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="flex items-center gap-3 rounded-2xl border border-border p-4"><Skeleton className="h-14 w-14 rounded-full" /><div className="flex-1"><Skeleton className="mb-2 h-4 w-28" /><Skeleton className="h-3 w-36" /></div></div>)}</div>
                ) : isError ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center">
                    <p className="font-semibold">Chưa thể mở danh sách bạn bè</p><p className="mt-1 text-sm text-muted-foreground">Thử tải lại sau một lát nhé.</p>
                    <Button variant="outline" className="mt-4" onClick={() => void refetch()}>Thử tải lại</Button>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UsersRound className="h-6 w-6" /></div>
                    <h3 className="font-semibold">Danh sách đang chờ những cái tên đầu tiên</h3>
                    <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Tìm một người bạn cũ ở mục “Khám phá” để bắt đầu kết nối.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {friends.map((person) => (
                      <article key={person.clerk_user_id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/80 bg-background/55 p-3.5 transition-colors hover:border-primary/25">
                        <Link href={`/profile/${person.clerk_user_id}`} className="shrink-0"><PersonAvatar person={person} /></Link>
                        <div className="min-w-0 flex-1"><Link href={`/profile/${person.clerk_user_id}`} className="block truncate text-sm font-semibold hover:text-primary">{personName(person)}</Link><PersonMeta person={person} /></div>
                        <Button variant="outline" size="icon" title="Gỡ bạn bè" aria-label={`Gỡ ${personName(person)} khỏi danh sách bạn bè`} onClick={() => remove(person.clerk_user_id)} disabled={mutationBusy} className="shrink-0 rounded-xl text-muted-foreground hover:text-destructive"><UserMinus className="h-4 w-4" /></Button>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'incoming' && (
              <div role="tabpanel">
                <SectionTitle eyebrow="Có người nhớ đến bạn" title="Lời mời kết bạn" count={incoming.length} />
                {isLoading ? <div className="space-y-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-[76px] rounded-2xl" />)}</div>
                  : isError ? <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center"><p className="font-semibold">Chưa thể tải lời mời</p><Button variant="outline" className="mt-4" onClick={() => void refetch()}>Thử tải lại</Button></div>
                  : incoming.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Inbox className="h-6 w-6" /></div><h3 className="font-semibold">Chưa có lời mời mới</h3><p className="mt-1 text-sm text-muted-foreground">Khi bạn học cũ gửi lời mời, bạn sẽ thấy tại đây.</p></div>
                  : <div className="divide-y divide-border/70">{incoming.map((person) => (
                    <div key={person.request_id ?? person.clerk_user_id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
                      <Link href={`/profile/${person.clerk_user_id}`} className="shrink-0"><PersonAvatar person={person} /></Link>
                      <div className="min-w-0 flex-1"><Link href={`/profile/${person.clerk_user_id}`} className="truncate font-semibold hover:text-primary">{personName(person)}</Link><PersonMeta person={person} /></div>
                      <div className="flex shrink-0 gap-1.5">
                        <Button size="sm" onClick={() => accept(person.request_id)} disabled={mutationBusy || !person.request_id} className="px-2.5"><Check className="h-4 w-4" /><span className="hidden sm:inline">Đồng ý</span></Button>
                        <Button size="icon" variant="outline" aria-label={`Từ chối lời mời từ ${personName(person)}`} onClick={() => decline(person.request_id)} disabled={mutationBusy || !person.request_id}><X className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  ))}</div>}
              </div>
            )}

            {activeTab === 'outgoing' && (
              <div role="tabpanel">
                <SectionTitle eyebrow="Đang chờ hồi âm" title="Lời mời đã gửi" count={outgoing.length} />
                {isLoading ? <div className="space-y-3">{[0, 1, 2].map((item) => <Skeleton key={item} className="h-[76px] rounded-2xl" />)}</div>
                  : isError ? <div className="rounded-2xl border border-dashed border-border px-5 py-10 text-center"><p className="font-semibold">Chưa thể tải lời mời đã gửi</p><Button variant="outline" className="mt-4" onClick={() => void refetch()}>Thử tải lại</Button></div>
                  : outgoing.length === 0 ? <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Send className="h-6 w-6" /></div><h3 className="font-semibold">Bạn chưa gửi lời mời nào</h3><p className="mt-1 text-sm text-muted-foreground">Tìm lại một người bạn từ mục “Khám phá”.</p></div>
                  : <div className="divide-y divide-border/70">{outgoing.map((person) => (
                    <div key={person.request_id ?? person.clerk_user_id} className="flex items-center gap-3 py-3 first:pt-1 last:pb-0">
                      <Link href={`/profile/${person.clerk_user_id}`} className="shrink-0"><PersonAvatar person={person} /></Link>
                      <div className="min-w-0 flex-1"><Link href={`/profile/${person.clerk_user_id}`} className="truncate font-semibold hover:text-primary">{personName(person)}</Link><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><Clock3 className="h-3 w-3" />Đang chờ phản hồi</p></div>
                      <Button variant="outline" size="sm" onClick={() => remove(person.target_id || person.clerk_user_id, true)} disabled={mutationBusy} className="shrink-0"><X className="h-3.5 w-3.5" /><span className="hidden sm:inline">Hủy lời mời</span><span className="sm:hidden">Hủy</span></Button>
                    </div>
                  ))}</div>}
              </div>
            )}

            {activeTab === 'discover' && (
              <div role="tabpanel">
                <SectionTitle eyebrow="Cùng khóa, cùng lớp" title="Khám phá bạn học" />
                <div className="mb-6 grid gap-2 md:grid-cols-[minmax(220px,1fr)_190px_190px]">
                  <label className="relative block">
                    <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={query} onChange={(event) => changeFilter(setQuery, event.target.value)} placeholder="Tên bạn, biệt danh..." className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" />
                  </label>
                  <label className="relative block">
                    <select value={cohortId} onChange={(event) => { changeFilter((value) => { setCohortId(value); setClassId(''); }, event.target.value); }} className="h-11 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-9 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15">
                      <option value="">Tất cả khóa học</option>
                      {(cohorts ?? []).map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name} · {cohort.year}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </label>
                  <label className="relative block">
                    <select value={classId} onChange={(event) => changeFilter(setClassId, event.target.value)} disabled={!cohortFilter} className="h-11 w-full appearance-none rounded-xl border border-input bg-background px-3 pr-9 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:opacity-50">
                      <option value="">Tất cả lớp</option>
                      {(classes ?? []).map((classItem) => <option key={classItem.id} value={classItem.id}>{classItem.name}</option>)}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  </label>
                </div>

                {suggestions.length > 0 && (
                  <div className="mb-7">
                    <SectionTitle eyebrow="Dựa trên những người bạn biết" title="Gợi ý kết nối" count={suggestions.length} />
                    <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 xl:grid-cols-3">
                      {suggestions.map((person) => (
                        <article key={person.clerk_user_id} className="w-[min(82vw,300px)] shrink-0 snap-start rounded-3xl border border-border bg-background p-4 md:w-auto">
                          <div className="flex items-center gap-3">
                            <Link href={`/profile/${person.clerk_user_id}`}><PersonAvatar person={person} size="lg" /></Link>
                            <div className="min-w-0 flex-1"><Link href={`/profile/${person.clerk_user_id}`} className="block truncate font-semibold hover:text-primary">{personName(person)}</Link><PersonMeta person={person} /><p className="mt-2 text-xs font-medium text-primary">{person.mutual_count ? `${person.mutual_count} bạn chung` : 'Có thể là bạn học cũ'}</p></div>
                          </div>
                          <Button variant="outline" className="mt-4 w-full rounded-xl border-primary/20 text-primary hover:bg-primary/5" onClick={() => sendRequest(person.clerk_user_id)} disabled={mutationBusy || person.friend_status === 'outgoing'}>
                            {person.friend_status === 'outgoing' ? <><Clock3 className="h-4 w-4" />Đã gửi lời mời</> : <><UserPlus className="h-4 w-4" />Gửi lời mời</>}
                          </Button>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                <SectionTitle eyebrow="Tìm trong cộng đồng" title="Danh bạ bạn học" count={searchQuery.data?.total ?? 0} />
                {searchQuery.isError ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center"><p className="font-semibold">Danh sách chưa tải được</p><p className="mt-1 text-sm text-muted-foreground">Kết nối đang chập chờn một chút.</p><Button variant="outline" className="mt-4" onClick={() => void searchQuery.refetch()}>Thử tải lại</Button></div>
                ) : searchQuery.isLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="flex items-center gap-3 rounded-2xl border border-border p-4"><Skeleton className="h-14 w-14 rounded-full" /><div className="flex-1"><Skeleton className="mb-2 h-4 w-28" /><Skeleton className="h-3 w-36" /></div></div>)}</div>
                ) : searchItems.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center"><div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Search className="h-6 w-6" /></div><h3 className="font-semibold">Chưa tìm thấy bạn học phù hợp</h3><p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">Thử đổi từ khóa hoặc bộ lọc khóa học, lớp nhé.</p></div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {searchItems.map((person) => (
                        <article key={person.clerk_user_id} className="flex min-w-0 items-center gap-3 rounded-2xl border border-border/80 bg-background/55 p-3.5 transition-colors hover:border-primary/25">
                          <Link href={`/profile/${person.clerk_user_id}`} className="shrink-0"><PersonAvatar person={person} /></Link>
                          <div className="min-w-0 flex-1"><Link href={`/profile/${person.clerk_user_id}`} className="block truncate text-sm font-semibold hover:text-primary">{personName(person)}</Link><PersonMeta person={person} />{person.mutual_count ? <p className="mt-1 text-[11px] text-primary">{person.mutual_count} bạn chung</p> : null}</div>
                          {person.friend_status === 'friends' ? <span className="inline-flex items-center gap-1 rounded-full bg-secondary/35 px-2.5 py-1.5 text-[11px] font-semibold text-secondary-foreground"><Check className="h-3 w-3" />Bạn bè</span>
                            : person.friend_status === 'outgoing' ? <Button variant="outline" size="sm" onClick={() => remove(person.target_id || person.clerk_user_id, true)} disabled={mutationBusy} className="rounded-full px-2.5 text-xs"><Clock3 className="h-3.5 w-3.5" />Đã gửi</Button>
                            : person.friend_status === 'incoming' ? <Button size="sm" onClick={() => accept(person.request_id)} disabled={mutationBusy || !person.request_id} className="rounded-full px-2.5 text-xs"><Check className="h-3.5 w-3.5" />Đồng ý</Button>
                            : <Button size="icon" aria-label={`Gửi lời mời kết bạn cho ${personName(person)}`} title="Gửi lời mời kết bạn" onClick={() => sendRequest(person.clerk_user_id)} disabled={mutationBusy} className="h-9 w-9 shrink-0 rounded-xl"><UserPlus className="h-4 w-4" /></Button>}
                        </article>
                      ))}
                    </div>
                    {(searchQuery.data?.total ?? 0) > 12 && (
                      <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
                        <span className="text-xs text-muted-foreground">{searchQuery.data?.total} người · Trang {page} / {totalPages}</span>
                        <div className="flex gap-2"><Button variant="outline" size="icon" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /></Button><Button variant="outline" size="icon" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><ChevronRight className="h-4 w-4" /></Button></div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </section>
        )}
        <p className="pb-3 pt-5 text-center text-xs text-muted-foreground">Mỗi lần tìm thấy nhau là một mảnh ký ức được nối lại.</p>
      </motion.div>
      {mutationBusy && <div className="sr-only" role="status"><LoaderCircle className="animate-spin" />Đang cập nhật kết nối</div>}
    </div>
  );
}
