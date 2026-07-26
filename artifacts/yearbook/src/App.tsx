import { useEffect, useRef } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';
import { ClerkProvider, SignIn, SignUp, useClerk } from '@clerk/react';
import { publishableKeyFromHost } from '@clerk/react/internal';
import { shadcn } from '@clerk/themes';
import { Layout } from '@/components/layout';

import Home from '@/pages/home';
import Students from '@/pages/students';
import StudentDetail from '@/pages/student-detail';
import Gallery from '@/pages/gallery';
import Memories from '@/pages/memories';
import Events from '@/pages/events';
import Teachers from '@/pages/teachers';
import Frames from '@/pages/frames';
import Admin from '@/pages/admin';
import Profile from '@/pages/profile';
import Subscribe from '@/pages/subscribe';
import Onboarding from '@/pages/onboarding';
import NotFound from '@/pages/not-found';

// ── Clerk config ────────────────────────────────────────────────────────────
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
const basePath = import.meta.env.BASE_URL.replace(/\/$/, '');

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || '/'
    : path;
}

if (!clerkPubKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY');

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: 'clerk' as const,
  options: {
    logoPlacement: 'inside' as const,
    logoLinkUrl: basePath || '/',
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: 'hsl(9, 85%, 62%)',
    colorForeground: 'hsl(20, 20%, 20%)',
    colorMutedForeground: 'hsl(25, 15%, 45%)',
    colorDanger: 'hsl(0, 84%, 60%)',
    colorBackground: 'hsl(0, 0%, 100%)',
    colorInput: 'hsl(40, 15%, 93%)',
    colorInputForeground: 'hsl(20, 20%, 20%)',
    colorNeutral: 'hsl(40, 15%, 80%)',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    borderRadius: '0.75rem',
  },
  elements: {
    rootBox: 'w-full flex justify-center',
    cardBox: 'bg-white rounded-2xl w-[440px] max-w-full overflow-hidden shadow-lg',
    card: '!shadow-none !border-0 !bg-transparent !rounded-none',
    footer: '!shadow-none !border-0 !bg-transparent !rounded-none',
    headerTitle: 'font-bold text-foreground',
    headerSubtitle: 'text-muted-foreground',
    socialButtonsBlockButtonText: 'text-foreground font-medium',
    formFieldLabel: 'text-foreground font-medium',
    footerActionLink: 'text-primary font-semibold hover:text-primary/80',
    footerActionText: 'text-muted-foreground',
    dividerText: 'text-muted-foreground',
    identityPreviewEditButton: 'text-primary',
    formFieldSuccessText: 'text-green-600',
    alertText: 'text-foreground',
    logoBox: 'mb-2',
    logoImage: 'w-14 h-14',
    socialButtonsBlockButton: 'border border-border bg-card hover:bg-muted transition-colors',
    formButtonPrimary: 'bg-primary text-white hover:bg-primary/90 transition-colors font-semibold',
    formFieldInput: 'border border-input bg-muted/50 text-foreground focus:ring-2 focus:ring-primary',
    footerAction: 'bg-muted/30',
    dividerLine: 'bg-border',
    alert: 'border border-destructive/20 bg-destructive/5',
    otpCodeFieldInput: 'border border-input bg-muted/50',
    formFieldRow: '',
    main: '',
  },
};

// ── Query client ─────────────────────────────────────────────────────────────
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, staleTime: 5 * 60 * 1000 } },
});

// ── Auto-sync user on sign-in ────────────────────────────────────────────────
function UserSync() {
  const { addListener } = useClerk();
  const qc = useQueryClient();
  const prevIdRef = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    const unsub = addListener(({ user }) => {
      const uid = user?.id ?? null;
      if (prevIdRef.current !== undefined && prevIdRef.current !== uid) {
        qc.clear();
      }
      prevIdRef.current = uid;

      // Sync user to our DB on first login
      if (uid && user) {
        fetch(`${import.meta.env.BASE_URL}api/auth/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: user.primaryEmailAddress?.emailAddress,
            full_name: user.fullName || user.firstName,
          }),
        }).catch(() => {});
      }
    });
    return unsub;
  }, [addListener, qc]);

  return null;
}

// ── Sign-in / Sign-up pages ──────────────────────────────────────────────────
function SignInPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-background via-muted/30 to-secondary/10 px-4 py-12">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
        fallbackRedirectUrl={`${basePath}/`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-to-br from-background via-muted/30 to-secondary/10 px-4 py-12">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
        fallbackRedirectUrl={`${basePath}/onboarding`}
      />
    </div>
  );
}

// ── Router ───────────────────────────────────────────────────────────────────
function Router() {
  return (
    <Switch>
      <Route path="/sign-in/*?" component={SignInPage} />
      <Route path="/sign-up/*?" component={SignUpPage} />
      <Route>
        <Layout>
          <Switch>
            <Route path="/" component={Home} />
            <Route path="/students" component={Students} />
            <Route path="/students/:id" component={StudentDetail} />
            <Route path="/gallery" component={Gallery} />
            <Route path="/memories" component={Memories} />
            <Route path="/events" component={Events} />
            <Route path="/teachers" component={Teachers} />
            <Route path="/frames" component={Frames} />
            <Route path="/profile" component={Profile} />
            <Route path="/subscribe" component={Subscribe} />
            <Route path="/onboarding" component={Onboarding} />
            <Route path="/admin" component={Admin} />
            <Route component={NotFound} />
          </Switch>
        </Layout>
      </Route>
    </Switch>
  );
}

// ── App ──────────────────────────────────────────────────────────────────────
function ClerkProviderWithRoutes() {
  const [, setLocation] = useLocation();
  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: { start: { title: 'Chào mừng trở lại', subtitle: 'Đăng nhập vào tài khoản của bạn' } },
        signUp: { start: { title: 'Tạo tài khoản', subtitle: 'Bắt đầu lưu giữ kỷ niệm học trò' } },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <UserSync />
          <Router />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}

export default function App() {
  return (
    <WouterRouter base={basePath}>
      <ClerkProviderWithRoutes />
    </WouterRouter>
  );
}
