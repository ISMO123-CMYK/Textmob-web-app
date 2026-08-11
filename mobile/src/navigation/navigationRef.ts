import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef<any>();

export const deepLinkPrefixes = ['textmob://', 'https://textmob.web.app', 'https://louda.web.app'];

export const linking = {
  prefixes: deepLinkPrefixes,
  config: {
    screens: {
      MainTabs: {
        screens: {
          Home: '',
          Fame: 'halloffame',
          Snaps: 'snaps',
        },
      },
      PostDetail: 'post/:id',
      Profile: {
        path: ':username',
        parse: { username: (v: string) => v.replace(/^@/, '') },
        stringify: { username: (v: string) => `@${v}` },
      },
      Hashtag: 'tag/:hashtag',
      LiveView: 'live/:postId',
      Events: 'events',
      CreateEvent: 'create-event',
      Wallet: 'wallet',
      Activity: 'activity',
      Connections: 'connections',
      Chats: 'chats',
      Search: 'topsearch',
      About: 'about',
      AccountsCenter: 'accountscenter',
      PostUpdate: 'post-update',
      CreateLive: 'create-live',
      CreatePost: {
        path: 'make-post/:quoteId?',
        parse: {
          quoteId: (v: string) => decodeURIComponent(v || ''),
        },
      },
      Auth: {
        screens: {
          Login: 'auth',
          Signup: 'auth/signup',
          ForgotPassword: 'auth/forgot-password',
          Onboarding: 'onboarding',
        },
      },
    },
  },
};