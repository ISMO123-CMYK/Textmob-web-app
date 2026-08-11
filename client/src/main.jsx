import './index.css';
import Lexum from './router/LexumRouter';
import AppWrapper from './components/layout/AppWrapper';

// Pages
import HomeMobile from './pages/home/HomeMobile';
import HomeDesktop from './pages/home/HomeDesktop';
import AuthPage from './pages/auth/AuthPage';
import ChatsComingSoon from './pages/ChatsComingSoon';
import ActivityMobile from './pages/activity/ActivityMobile';
import ActivityDesktop from './pages/activity/ActivityDesktop';
import ConnectionsMobile from './pages/connections/ConnectionsMobile';
import ConnectionsDesktop from './pages/connections/ConnectionsDesktop';
import ViewPage from './pages/posts/ViewPage';
import PostMobile from './pages/posts/PostMobile';
import PostDesktop from './pages/posts/PostDesktop';
import MenuDesktop from './pages/menu/MenuDesktop';
import MenuMobile from './pages/menu/MenuMobile';
import LogoutPage from './pages/LogoutPage';
import PostUpdateMobile from './pages/posts/PostUpdateMobile';
import PostUpdateDesktop from './pages/posts/PostUpdateDesktop';
import ProfileMobile from './pages/profile/ProfileMobile';
import ProfileDesktop from './pages/profile/ProfileDesktop';
import StoriesPage from './pages/stories/StoriesPage';
import WalletMobile from './pages/wallet/WalletMobile';
import WalletDesktop from './pages/wallet/WalletDesktop';
import SnapsMobile from './pages/snaps/SnapsMobile';
import SnapsDesktop from './pages/snaps/SnapsDesktop';
import TopSearchMobile from './pages/search/TopSearchMobile';
import TopSearchDesktop from './pages/search/TopSearchDesktop';
import HallOfFameMobile from './pages/halloffame/HallOfFameMobile';
import HallOfFameDesktop from './pages/halloffame/HallOfFameDesktop';
import HashtagMobile from './pages/hashtag/HashtagMobile';
import HashtagDesktop from './pages/hashtag/HashtagDesktop';
import LiveViewMobile from './pages/live/LiveViewMobile';
import LiveViewDesktop from './pages/live/LiveViewDesktop';
import MakePostMobile from './pages/posts/MakePostMobile';
import MakePostDesktop from './pages/posts/MakePostDesktop';
import CreateLiveMobile from './pages/live/CreateLiveMobile';
import CreateLiveDesktop from './pages/live/CreateLiveDesktop';
import AccountsCenter from './pages/AccountsCenter';
import AboutPage from './pages/about/AboutPage';
import InstallPage from './pages/InstallPage';

// Initialize feed state (matches Zn's __feedState from bundle)
window.__feedState = window.__feedState || {
  activeTab: 'foryou',
  foryou: { posts: [], page: 1, hasMore: true, scrollY: 0 },
  following: { posts: [], page: 1, hasMore: true, scrollY: 0 }
};

// Initialize the router
Lexum.init({
  root: 'app',
  mode: 'history',
  routes: [
    { path: '/', responsive: { mobile: HomeMobile, desktop: HomeDesktop } },
    { path: '/auth', component: AuthPage },
    { path: '/chats', responsive: { mobile: ChatsComingSoon, desktop: ChatsComingSoon } },
    { path: '/activity', responsive: { mobile: ActivityMobile, desktop: ActivityDesktop } },
    { path: '/connections', responsive: { mobile: ConnectionsMobile, desktop: ConnectionsDesktop } },
    { path: '/view', responsive: { mobile: ViewPage, desktop: ViewPage } },
    { path: '/post/:id', responsive: { mobile: PostMobile, desktop: PostDesktop } },
    { path: '/menu', responsive: { desktop: MenuDesktop, mobile: MenuMobile } },
    { path: '/logout', component: LogoutPage },
    { path: '/post-update', responsive: { mobile: PostUpdateMobile, desktop: PostUpdateDesktop } },
    { path: '/@(:username)', responsive: { mobile: ProfileMobile, desktop: ProfileDesktop } },
    { path: '/wallet', responsive: { mobile: WalletMobile, desktop: WalletDesktop } },
    { path: '/snaps', responsive: { mobile: SnapsMobile, desktop: SnapsDesktop } },
    { path: '/snap/:id', responsive: { mobile: SnapsMobile, desktop: SnapsDesktop } },
    { path: '/topsearch', responsive: { mobile: TopSearchMobile, desktop: TopSearchDesktop } },
    { path: '/halloffame', responsive: { mobile: HallOfFameMobile, desktop: HallOfFameDesktop } },
    { path: '/tag/:hashtag', responsive: { mobile: HashtagMobile, desktop: HashtagDesktop } },
    { path: '/live/:postId', responsive: { mobile: LiveViewMobile, desktop: LiveViewDesktop } },
    { path: '/make-post/:quoteId', responsive: { mobile: MakePostMobile, desktop: MakePostDesktop } },
    { path: '/make-post', responsive: { mobile: MakePostMobile, desktop: MakePostDesktop } },
    { path: '/create-live', responsive: { mobile: CreateLiveMobile, desktop: CreateLiveDesktop } },
    { path: '/accountscenter', component: AccountsCenter },
    { path: '/about', component: AboutPage },
    { path: '/install', component: InstallPage },
  ],
  wrapper: AppWrapper,
});
