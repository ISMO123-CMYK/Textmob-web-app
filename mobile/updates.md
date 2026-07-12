Here is the detailed feature summary for each of the 16 files:

---

## 1. `SearchContent.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\search\SearchContent.jsx)

**What the page/screen does:**  
Full-page search interface allowing users to search for people, posts, topics, hashtags, and mentions across the platform. It also serves as an "Explore" landing page with suggested creators when no search has been performed.

**All interactive features:**
- **Search input** with auto-suggest dropdown (users, hashtags, mentions, topics)
- **Clear search** button (X) inside the input
- **Search submit** button (magnifying glass icon)
- **Dropdown navigation** via keyboard arrows, Enter, Escape
- **Search history** display with "Clear all" and per-item removal buttons
- **Recent searches** chip section (clickable to re-run search, removable)
- **Suggested Creators** grid (up to 4) with follow/unfollow buttons per user
- **Result filter tabs** ("People" / "Posts") with counts
- **User result rows** with profile pic, name, username highlight, follow/friend action button
- **Post results** rendered via `HomeFeed` component
- **Loading skeletons** and error state display
- **Click outside** closes dropdown
- **URL pre-population**: reads `?q=` query param on mount

**All API endpoints called:**
- `GET /get-suggestions-feed?username=...` -- explore suggestions
- `GET /search-suggest?query=...&currentUsername=...` -- suggestions
- `GET /general/search?query=...&currentUsername=...` -- full search
- `POST /follow` or `POST /friend` -- relation changes (for both explore and search results)

**All hooks/state variables used:**
- `useState`: `query`, `focused`, `searchResults`, `showDropdown`, `error`, `activeTab`, `history`, `suggestions`, `loadingSuggestions`, `selectedIndex`, `searched`, `loadingResults`, `exploreSuggestions`, `loadingExploreSug`
- `useRef`: `inputRef`, `dropdownRef`
- Custom hook: `useDebounce(value, delay)` -- debounces search input by 260ms

**All sub-components rendered:**
- `HighlightMatch` (inline component -- highlights matching text)
- `HomeFeed` (imported from `../home/HomeFeed` -- renders posts results)
- `TrendingTopics` (imported but not rendered in the visible code)

---

## 2. `ActivityContent.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\activity\ActivityContent.jsx)

**What the page/screen does:**  
Notifications/activity feed page. Displays a real-time list of user notifications (likes, comments, follows, mentions, gifts, system messages, etc.) with read/unread tracking.

**All interactive features:**
- **"Clear all" button** in the header (shows confirmation banner)
- **"Cancel" / "Delete"** confirmation buttons for clearing all
- **Per-notification options dropdown** (3-dot menu) with "Open" link and "Delete" action
- **Notification rows** are clickable (navigates to the item's link)
- **"View post"** chip link on applicable notifications
- **Retry button** on error state
- **Close button** (if `onClose` prop is provided)
- **Escape** closes modals and menus
- **Auto-polling** every 30 seconds to refresh notifications

**All API endpoints called:**
- `GET /get-notifications?username=...`
- `POST /mark-notification-read` (batch marks as read)
- `POST /delete-notification`
- `POST /delete-all-notifications`

**All hooks/state variables used:**
- `useState`: `notifications`, `error`, `loading`, `showConfirm`, `clearing`, `openMenuId`
- `useRef`: `originalListRef`, `dropdownRefs` (object of refs), `markReadDone`
- `useEffect`: multiple effects for click-outside, keyboard escape, loading + polling

**All sub-components rendered (all inline):**
- `CloseButton`
- `SkeletonRow`
- `OptionsDropdown`
- `NotificationRow`
- `TypeBadge`

---

## 3. `PostContent.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\posts\PostContent.jsx)

**What the page/screen does:**  
Displays a single post detail page. Loads a post by ID from the URL path, shows the post card with full interaction capabilities (like, comment, react, poll vote), and lists all comments.

**All interactive features:**
- **Like toggle** on the post (optimistic update)
- **Reaction picker** (emoji reactions via `PostCard`)
- **Poll vote** (toggle vote on poll options)
- **Comment input** with mention/hashtag autocomplete (arrow navigation, Tab/Enter to select)
- **"Post" button** on comment input (appears when text is non-empty)
- **Comment list** (reversed chronologically), each comment is clickable to navigate to user profile
- **"Log in to comment"** button for guests
- **Socket listener** for real-time new comments
- **Group post access check**: fetches group info, shows "Access denied" for restricted groups

**All API endpoints called:**
- `GET /get-post?id=...`
- `GET /get-post-reactions?postId=...`
- `GET /groups/:groupId/light?username=...` (for group posts)
- `GET /search-users?q=...&limit=6` (for mention autocomplete)
- `POST /like-post`
- `POST /add-comment`
- `POST /vote-poll-option`
- `POST /react-post`

**All hooks/state variables used:**
- `useState`: `post`, `loading`, `error`, `group`, `accessDenied`, `reactionsOpenFor`, `reactionsCache`
- `useRef`: (within `CommentInput`) `inputRef`
- Custom hook: `useProfileCache` (for profile lookups in comments)

**All sub-components rendered:**
- `PostCard` (imported from `../../components/ui/PostCard`)
- `VerifiedBadge` (imported from `../../components/ui/VerifiedBadge`)
- `CommentItem` (inline)
- `CommentInput` (inline -- with autocomplete)

---

## 4. `MakePostContent.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\posts\MakePostContent.jsx)

**What the page/screen does:**  
Post creation composer with a full-screen modal. Supports rich text editing, media upload (images/video), polls, feeling/activity tags, quoted posts, and image editing with a Fabric.js canvas.

**All interactive features:**
- **Create post button** (opens the composer modal)
- **Back button** (closes/goes back)
- **Rich text editor** (contentEditable div with paste sanitization, emoji via twemoji)
- **Autocomplete dropdown** for @mentions and #hashtags (keyboard navigable)
- **Media upload** via file input (drag-and-drop on upload area, max 10 images or 1 video, 100MB limit)
- **Image editing modal** using Fabric.js canvas (add text overlay, change font/color/size/rotation/shadow, apply filters)
- **Feeling/activity picker** modal (grid of 15 emoji feelings)
- **Poll builder** (add/remove poll options, min 2, max 6 options)
- **Quoted post** embedding (fetches and displays the quoted post with dismiss button)
- **Post submission** with FormData (text, parsed HTML, media, poll options, quote, activity)
- **Text formatting** via `document.execCommand` (bold, italic, etc.)
- **Paste interception** (sanitizes clipboard text)
- **Error/success messages**

**All API endpoints called:**
- `GET /get-post?postId=...` (for fetching quoted post)
- `GET /search-users?q=...&currentUsername=...` (mention autocomplete)
- `GET /search-suggest?query=...&currentUsername=...` (hashtag autocomplete)
- `POST /create-post` (submits the new post as FormData)

**All hooks/state variables used:**
- `useState`: ~40 state variables tracking modal visibility, text content, media files, poll options, feeling, image editing state (text, color, font, size, rotation, shadow, filter), loading states, quoted post data, autocomplete suggestions/activeIndex
- `useRef`: multiple refs for contentEditable, file input, canvas, image elements
- `useEffect`: quoted post fetch, escape key handler, canvas initialization, media URL cleanup

**All sub-components rendered:**
- `AutocompleteDropdown` (imported from `../../components/layout/AutocompleteDropdown`)
- `ComposerSheet` (inline bottom sheet for feeling picker)
- `ComposerBtn` (inline icon button utility)

---

## 5. `SnapsContent.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\snaps\SnapsContent.jsx)

**What the page/screen does:**  
TikTok-style vertical video feed ("Snaps"). Displays a full-screen carousel of short videos with swipe/scroll navigation. Users can like, comment, share, send gifts, follow creators, and create new snaps.

**All interactive features:**
- **Vertical swipe/scroll** carousel (touch, wheel, keyboard arrows)
- **Video playback** per snap with play/pause toggle (tap to toggle)
- **Double-tap to like** (heart animation burst)
- **Single tap like** button (heart icon with counter animation)
- **Mute/unmute** toggle button
- **Comments panel** (bottom sheet with real-time comment list and input with @mention autocomplete)
- **Share** button (native share API or clipboard copy)
- **Gift Mobcoins** modal (`GiftCoinsModal`)
- **Follow/Unfollow** button per creator
- **"See more"** on long snap text
- **Keyboard navigation** (ArrowUp/Down, Escape)
- **Create snap** button (opens `NewSnapModal`)
- **Infinite scroll** / load more on reaching the last snaps
- **Progress bar** showing video playback progress
- **Up next** sidebar (desktop) showing previews of upcoming snaps
- **Error/retry** and **empty state** with create/login prompts

**All API endpoints called:**
- `GET /snaps-feed?username=...&limit=5`
- `GET /profile/:username` (profile cache lookups)
- `POST /friend` or `POST /follow` (follow/unfollow)
- `GET /follow-status?from=...&to=...`
- `POST /like-post`
- `POST /add-comment`
- `GET /search-users?q=...&limit=6`
- `GET /search-suggest?query=...&currentUsername=...`

**All hooks/state variables used:**
- `useState`: many states across `SnapsContent`, `SnapsCarousel`, `SnapItem`, `NewSnapModal`, `CommentsPanel`
- `useRef`: video refs, container refs, touch tracking, timers
- `useMemo`, `useCallback`
- Custom hooks: `useSnapUpload`, `useMentions`, `Nn` (profile cache hook)
- `createPortal` for `SuggestionsDropdown`

**All sub-components rendered:**
- `SnapItem` (inline -- full video player with overlay controls)
- `SnapText` (inline -- truncated text with "See more")
- `FollowButton` (inline)
- `NewSnapModal` (inline -- upload modal with progress ring)
- `CommentsPanel` (inline -- bottom sheet with comments)
- `CommentRow` (inline)
- `SuggestionsDropdown` (inline -- rendered via portal)
- `SnapsCarousel` (inline)
- `SnapPlayer` (exported separately for use in feeds)
- `GiftCoinsModal` (imported)

---

## 6. `StoriesPage.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\stories\StoriesPage.jsx)

**What the page/screen does:**  
Full-screen story viewer (Instagram-style). Displays media (image/video) stories from followed users with navigation between them.

**All interactive features:**
- **Story media display** (image or video, auto-play)
- **Progress bars** at top (one per story, filled for viewed, empty for upcoming)
- **Username display** at top-left
- **Left/right tap** to navigate between stories (prev/next)
- **Close button** (top-right)
- **"Go Back"** button on empty state
- **Story text overlay** at bottom

**All API endpoints called:**
- `GET /get-sparks?username=...`

**All hooks/state variables used:**
- `useState`: `stories`, `loading`, `activeIndex`
- `useEffect`: initial fetch

**All sub-components rendered:**
- No custom sub-components (all inline JSX)

---

## 7. `EventsContent.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\events\EventsContent.jsx)

**What the page/screen does:**  
Events listing page with accordion-style detail expansion. Shows upcoming/past community events with interest tracking.

**All interactive features:**
- **"+ Create" button** (link to `/events/new`)
- **Accordion toggle** on each event row to expand/collapse details
- **Like/Interest button** (toggle interest; disabled for ended events)
- **"Register / Learn more"** external link for events with `registration_url`
- **Loading skeleton** placeholders
- **Empty state** message
- **Click username** to navigate to profile

**All API endpoints called:**
- `GET /events-feed?username=...`
- `POST /like-post`

**All hooks/state variables used:**
- `useState`: `events`, `activeId`, `loading`
- `useEffect`: initial fetch

**All sub-components rendered:**
- No custom sub-components (all inline JSX)

---

## 8. `HallOfFameContent.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\halloffame\HallOfFameContent.jsx)

**What the page/screen does:**  
Leaderboard (Hall of Fame) showing top-ranked users by weekly engagement score. Users can view evidence breakdowns, send gifts, and learn about ranking.

**All interactive features:**
- **Refresh button** (re-fetches leaderboard)
- **"How to Rank" button** (opens tips modal)
- **Per-row "Evidence" button** (expands/collapses evidence drawer showing why they ranked, metrics, and featured impact post)
- **Per-row options menu** (3-dot) with "View Profile" and "Gift Mobcoins"
- **Gift Mobcoins modal** (amount input with validation, sends coins)
- **Rank Tips modal** (3 algorithmic tips with icons and descriptions)
- **Loading skeletons** and error/empty states
- **Keyboard Escape** closes all modals
- **Click outside** closes menus

**All API endpoints called:**
- `GET /leaderboard`
- `POST /t/send-mobcoins`

**All hooks/state variables used:**
- `useState`: `leaders`, `loading`, `errorMessage`, `refreshing`, `showRankTips`, `giftTarget`, `giftAmount`, `giftSending`, `giftStatus`, `mobileMenuIdx`, `expandedRank`
- `useRef`: `menuRefs` (object of refs)
- `useEffect`: initial fetch, keyboard/click-outside handlers

**All sub-components rendered:**
- `SkeletonRow` (inline)
- `GiftIcon` (imported)
- Medals/tier indicators (inline)

---

## 9. `ConnectionsContent.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\connections\ConnectionsContent.jsx)

**What the page/screen does:**  
Connections management page with tabs for Followers, Following, and Discover suggestions.

**All interactive features:**
- **Tab navigation** (Followers / Following / Discover) with counts
- **Per-user follow/unfollow button** (shows "Following" or "Follow"; hover shows red "Unfollow")
- **User row** with profile pic (fetched lazily if only username), name, and link to profile
- **Loading skeletons** and empty states per tab
- **Auth guard** (redirects to login if no currentUser)

**All API endpoints called:**
- `GET /profile/:username` (fetches profile with followers/following lists)
- `GET /profile-pic/:username` (lazy-loads profile pic for string-only entries)
- `GET /get-suggestions-feed?username=...`
- `POST /follow-status` (toggles follow)

**All hooks/state variables used:**
- `useState`: `tab`, `followers`, `following`, `suggestions`, `loading`
- `useEffect`: initial data load via `Promise.allSettled`

**All sub-components rendered:**
- `ConnectionRow` (inline)

---

## 10. `WalletContent.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\wallet\WalletContent.jsx)

**What the page/screen does:**  
Mobcoins wallet management page. Displays balance (Mobcoins or NGN equivalent), send/earn/redeem actions, payout history, and educational modals.

**All interactive features:**
- **Balance toggle** (show/hide balance)
- **Wallet/Live mode toggle** (displays Mobcoins or estimated NGN value)
- **Tab navigation** (Send/Earn / Redeem / History)
- **Send button** (opens send modal with user search, multi-select recipients, amount input)
- **Earn button** (opens coming-soon modal)
- **How to earn Mobcoins** button (opens educational modal with tips list)
- **Redeem for Airtime / Cash** buttons (opens redeem modal with form for bank/airtime details)
- **Payout history** list with status badges (COMPLETED/REJECTED/PENDING)
- **Send modal** with search, selected user chips, amount input, validation
- **Gift modal** (coming soon placeholder)
- **Redeem modal** with amount calculator, bank/airtime forms, validation
- **Earn modal** (coming soon)
- **Learn modal** (5 earning tips)
- **Info card** about "What are Mobcoins?"
- **Alert modal** utility
- **Auth guard**

**All API endpoints called:**
- `GET /t/wallet?userId=...`
- `GET /api/user/payouts?userId=...`
- `GET /search?query=...&currentUsername=...`
- `POST /t/send-mobcoins`
- `POST /api/redeem`

**All hooks/state variables used:**
- `useState`: 25+ states covering balance, user, modals, tabs, form fields, search, loading, etc.
- `useEffect`: initial load, global Escape key handler

**All sub-components rendered:**
- No custom sub-components (all inline JSX with conditional modal rendering)

---

## 11. `LoginForm.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\auth\LoginForm.jsx)

**What the page/screen does:**  
Login form with identifier (email/username/phone) and password fields, "Remember me" functionality, saved accounts management.

**All interactive features:**
- **Email/Username/Phone input** (`FormInput`)
- **Password input** (`FormInput` with type="password")
- **"Remember me" checkbox** (custom toggle)
- **"Forgot password?"** link
- **"Sign in" button** (with loading state)
- **"Create account"** button (switches to signup)
- **"Switch account"** button (mobile only, appears if saved accounts exist)
- **Saved account auto-login** via props
- **Remove saved account** via props
- **Login attempt tracking** (locks after 5 attempts)
- **Error notification** via `window.showNotification`

**All API endpoints called:**
- `POST /login`

**All hooks/state variables used:**
- `useState`: `identifier`, `password`, `rememberMe`, `loading`, `attempts`

**All sub-components rendered:**
- `FormInput` (imported)
- `PasswordStrengthIndicator` (imported but not used in this file)

---

## 12. `SignupForm.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\auth\SignupForm.jsx)

**What the page/screen does:**  
Multi-step registration form (3 steps): identity, contact info, and password. Includes validation, auto-username generation, and post-signup auto-login.

**All interactive features:**
- **Step indicator** (progress dots with step counter)
- **Form fields per step**: Full name, Username (auto-generated from full name), Email, Phone (optional), Profile type (Individual/Organisation select), Password, Confirm password
- **"Back" button** on steps 2 and 3
- **"Continue" button** to advance steps
- **"Join Textmob"** submit button on final step
- **"Sign in"** link to switch to login
- **Password strength indicator** (shown when password field has value)
- **Success modal** with account summary and "Go to Textmob" button
- **Auto-login** after successful signup
- **Error notification** via `window.showNotification`

**All API endpoints called:**
- `POST /signup` (FormData)
- `POST /login` (auto-login after signup)

**All hooks/state variables used:**
- `useState`: `step`, `loading`, `success`, `manualUsername`, `form` (object with all fields)
- `useEffect`: auto-generate username from fullname

**All sub-components rendered:**
- `FormInput` (imported)
- `PasswordStrengthIndicator` (imported)

---

## 13. `AccountsCenter.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\AccountsCenter.jsx)

**What the page/screen does:**  
Full account management dashboard (creator studio) with sidebar navigation. Contains tabs for Overview, Earnings (Monetization), Get Verified, Analytics, New Post (Composer), My Posts, Snaps Studio, Milestones, Preferences, and Log Out/Danger zone.

**All interactive features:**
- **Sidebar navigation** (desktop persistent, mobile toggle with overlay)
- **Overview tab**: hero card with followers/balance/interactions stats, quick actions grid (New Post, Earnings, Analytics, Profile), engagement bar, leaderboard rank link, verification/upgrade prompts
- **Monetization tab**: balance display, cash-out button (Professional only), accordion for earning tips, payout history table, redeem modal (bank/airtime)
- **Get Verified tab**: eligibility check (Professional + 50 posts), payment modal (OPay account details), request submission, status tracking (pending/verified)
- **Analytics tab**: Chart.js-powered charts (interactions bar, verification doughnut, growth line chart, monthly breakdown bar, audience composition)
- **Composer tab**: embeds `MakePostContent`
- **My Posts tab**: list of posts with edit (BottomSheet), delete, and link actions
- **Snaps Studio tab**: grid of user's snaps with preview and delete
- **Milestones tab**: progress cards for posts/followers/coins milestones, streak display, rank, tips, action buttons
- **Preferences tab**: theme (system/light/dark), notification toggles per category (in-app/email) with auto-save
- **Danger tab**: logout and account deletion with confirmation

**All API endpoints called:**
- `GET /profile/:username`
- `GET /get-user-posts?username=...`
- `GET /account-stats?username=...`
- `POST /profile/:username/update`
- `POST /profile/:username/change-password`
- `POST /profile/:username/update-type`
- `POST /api/migrate-friends`
- `POST /profile/:username/notification-prefs`
- `GET /api/verify-status?username=...`
- `POST /api/verify-request`
- `PUT /edit-post`
- `DELETE /delete-post?postId=...`
- `POST /deactivate-account`
- `GET /api/user/payouts?userId=...`
- `POST /api/redeem`

**All hooks/state variables used:**
- `useState`: `activeTab`, `profile`, `posts`, `stats`, `loading`, `sidebarOpen`, `alertModal`, plus many per-tab states (photoFile, photoPreview, saving, statusMsg, passwordFields, modals, etc.)
- `useRef`: `chartRef1..6`, plus form refs
- `useEffect`: initial data load, Escape key handler, sidebar body scroll lock, Chart.js initialization

**All sub-components rendered:**
- `OverviewTab` (inline)
- `MonetizationTab` (inline)
- `VerificationTab` (inline)
- `AnalyticsTab` (inline)
- `ComposerTab` (inline -- wraps `MakePostContent`)
- `EditProfileTab` (inline)
- `PostsTab` (inline)
- `SnapsTab` (inline)
- `GrowTab` (inline)
- `PrefsTab` (inline)
- `DangerTab` (inline)
- `Accordion` (inline)
- `StatusMsg` (inline)
- `CloseBtn` (inline)
- `Overlay` (inline)
- `SkeletonBlock` (inline)
- `ToggleBtn` (inline)
- `BottomSheet` (imported)
- `SkeletonRow` (imported)
- `RichText` (imported)
- `AutocompleteDropdown` (imported)
- `MakePostContent` (imported)

---

## 14. `LiveContent.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\live\LiveContent.jsx)

**What the page/screen does:**  
Full live streaming viewer page. Plays HLS-like live video via a video element, handles real-time chat, gift animations (confetti, overlays, floaters), stream paused/resumed states, and viewer count.

**All interactive features:**
- **Video player** with auto-play, time seeker (draggable progress bar), mute/unmute, pause/resume
- **Join/Leave stream** buttons
- **Viewer count** badge
- **Live chat** (socket-based) with message input and "Post"/"Send" button
- **Gift system** with tiered visual effects (screen flash, tier text, confetti bursts, floating gift icons)
- **Gift drawer** (mobile) or **inline gift panel** (desktop) with grid of gift items
- **Share link** and **Copy link** buttons
- **Fullscreen** toggle
- **Rewind 10s** button (desktop)
- **Chat toggle** (mobile)
- **Stream recovery**: auto-retry on stall/error (up to 3 attempts)
- **Adaptive playback**: adjusts `playbackRate` and seeks to live edge when lagging
- **Landscape/portrait** detection for `objectFit`
- **Pause overlay** when stream or user pauses
- **Pre-join overlay** (desktop) with "Join Stream" button

**All API endpoints called:**
- `GET /get-post?id=...`
- `POST /t/send-mobcoins` (for sending gifts)
- `GET /api/live-stream/:postId?live=1` (video source)

**All hooks/state variables used:**
- `useState`: 25+ states (joined, viewerCount, comments, inputText, errorMessage, streamPaused, userPaused, showGiftDrawer, confettis, giftOverlays, floaters, giftErrorMessage, giftSending, isMobile, isFullscreen, showChat, audioMuted, videoTime, videoDuration, isLandscapeStream)
- `useRef`: videoRef, peerRef, chatScrollRef, streamEndedReceivedRef, recoveryAttemptsRef, stallTimerRef, hasJoinedRef, seenCommentsSet
- `useEffect`: viewport check, fullscreen listener, socket event binding, initial join (mobile auto), cleanup on unmount

**All sub-components rendered:**
- `VideoSeeker` (inline -- draggable progress bar)
- `LiveCommentMessage` (inline -- chat message row)
- `ConfettiPart` (inline)
- `ConfettiBlast` (inline -- confetti particle system)
- `GiftOverlay` (inline -- tier text with flash)
- `FloatersGroup` (inline -- floating gift icons)
- `LiveLinkButtons` (inline)
- `GiftIcon` (imported)

---

## 15. `ProfileDesktop.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\profile\ProfileDesktop.jsx)

**What the page/screen does:**  
Desktop wrapper for the user profile page. Renders the shared `ProfileContent` component inside a `DesktopPageLayout`.

**All interactive features:**
- None directly (delegates to `ProfileContent`)

**All API endpoints called:**
- None directly (delegates to `ProfileContent`)

**All hooks/state variables used:**
- None directly

**All sub-components rendered:**
- `DesktopPageLayout` (imported)
- `ProfileContent` (imported from `./ProfileContent`)

---

## 16. `ProfileMobile.jsx` (C:\Users\Ismail\Desktop\Textmob\client\src\pages\profile\ProfileMobile.jsx)

**What the page/screen does:**  
Mobile wrapper for the user profile page. Renders the shared `ProfileContent` component inside a `MobilePageLayout` with a title and back button.

**All interactive features:**
- **Back button** via `onBack` prop (calls `window.history.back()`)

**All API endpoints called:**
- None directly (delegates to `ProfileContent`)

**All hooks/state variables used:**
- None directly

**All sub-components rendered:**
- `MobilePageLayout` (imported)
- `ProfileContent` (imported from `./ProfileContent`)