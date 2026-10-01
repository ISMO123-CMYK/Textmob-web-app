import React, { useEffect, useRef } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { LoudaStoreProvider, useLoudaStore } from './store';
import { useLoudaTheme, ContextMenu } from './components/primitives';
import { ChatListPane } from './components/ChatListPane';
import { ChatThreadPane } from './components/ChatThreadPane';
import { BottomBar } from './components/BottomBar';
import { ForwardModal } from './components/ForwardModal';
import { MediaViewer } from './components/MediaViewer';
import { MessageInfoModal } from './components/MessageInfoModal';
import { UnifiedProfileView } from './components/UnifiedProfileView';
import { AddContactModal } from './components/AddContactModal';
import { CreateGroupModal } from './components/CreateGroupModal';
import { AddMembersModal } from './components/AddMembersModal';
import { SettingsScreen } from './components/SettingsScreen';
import { MediaGalleryTab } from './components/MediaGalleryTab';
import { StatusTab } from './components/StatusTab';
import { StatusCreator } from './components/StatusCreator';
import { StatusViewer } from './components/StatusViewer';

// Mobile replacement for the web CameraOverlay (LoudaApp.jsx:9469-9483):
// launch the native camera, hand the capture to the StatusCreator.
function StatusCameraLauncher() {
  const st = useLoudaStore();
  useEffect(() => {
    (async () => {
      try {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return;
        const res = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images', 'videos'],
          quality: 0.8,
        });
        if (!res.canceled && res.assets?.length) {
          const a = res.assets[0];
          const mime = a.mimeType || (a.type === 'video' ? 'video/mp4' : 'image/jpeg');
          st.setStatusCameraMedia({
            file: { uri: a.uri, fileName: a.fileName, mimeType: mime, type: mime },
            type: mime.startsWith('video/') ? 'video' : 'image',
            music: undefined,
          });
          st.setShowStatusCreator(true);
        }
      } catch (e) {
        console.error('Status camera failed', e);
      } finally {
        st.setShowStatusCamera(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

// Port of the MobileHome render tree (LoudaApp.jsx:8679-9522) — the shell
// that wires the chat list strip, chat window, bottom navigation and every
// root-level modal together. Mobile has no Sidebar: BottomBar (9458-9466)
// replaces it and is hidden while a chat is open unless settings are up.
function LoudaHome({ initialWithUsername }: { initialWithUsername?: string }) {
  const st = useLoudaStore();
  const { p } = useLoudaTheme();
  const navigation = useNavigation<any>();

  const onExit = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  // Quoted-status tap (ChatThreadPane sets viewerStatusId) → resolve the
  // owner and open the viewer anchored on that exact status (mobile-only;
  // the web app has no quoted-status deep link).
  useEffect(() => {
    if (!st.viewerStatusId) return;
    const status = st.statuses.find((x: any) => x.id === st.viewerStatusId);
    if (status) st.setViewerTarget(status.user_id);
  }, [st.viewerStatusId, st.statuses]);

  // Textmob deep link: navigation.navigate('Chats', { with: username })
  // (ProfileScreen.tsx:310) — open that chat once the store has booted.
  const didDeepLinkRef = useRef(false);
  useEffect(() => {
    if (!initialWithUsername || didDeepLinkRef.current) return;
    if (!st.user?.id) return;
    didDeepLinkRef.current = true;
    st.openChatWithUsername(initialWithUsername);
  }, [initialWithUsername, st.user, st.openChatWithUsername]);

  // Web 8680: first paint waits for the user object
  if (!st.user) {
    return (
      <View style={[s.boot, { backgroundColor: p.pageBg }]}>
        <ActivityIndicator size="large" color={p.accent} />
      </View>
    );
  }

  // Pane visibility (web 8895-8912, 9048-9050):
  //  - gallery/status tabs own the whole content area
  //  - chat list shows only when no chat is open
  //  - chat window shows only when a chat is open
  const statusTab = st.activeTab === 'status';
  const galleryTab = st.activeTab === 'gallery';
  const showList = !statusTab && !galleryTab && !st.selectedChat;
  const showThread = !statusTab && !galleryTab && !!st.selectedChat;
  // Web 9458: BottomBar visible while no chat is open, or settings overlay
  const showBottomBar = !st.selectedChat || st.showSettings;

  return (
    <SafeAreaView edges={['top']} style={[s.root, { backgroundColor: p.pageBg }]}>
      <View style={s.body}>
        {/* 18g: gallery tab (web 8895) */}
        {galleryTab && (
          <View style={s.fullPane}>
            <MediaGalleryTab
              userId={st.user.id}
              onViewMedia={(v) => st.setMediaView(v)}
              onShare={(payload) => st.setSharePayload(payload)}
            />
          </View>
        )}
        {/* 18h: status tab (web 8898-8910) */}
        {statusTab && (
          <View style={s.fullPane}>
            <StatusTab
              user={st.user}
              contacts={st.contacts}
              statuses={st.statuses}
              onOpenCreator={() => st.setShowStatusCreator(true)}
              onOpenViewer={(id) => {
                st.setViewerStatusId(null);
                st.setViewerTarget(id);
              }}
              onOpenCamera={() => st.setShowStatusCamera(true)}
            />
          </View>
        )}

        {(showList || showThread) && (
          <View style={s.panes}>
            {showList && (
              <View style={s.pane}>
                <ChatListPane />
              </View>
            )}
            {showThread && (
              <View style={s.pane}>
                <ChatThreadPane />
              </View>
            )}
          </View>
        )}
      </View>

      {/* Root context menu (web 9448-9455) */}
      {st.contextMenu && (
        <ContextMenu
          position={st.contextMenu.position}
          options={st.contextMenu.options}
          onClose={() => st.setContextMenu(null)}
        />
      )}

      {/* Forward pickers (web 9415-9430) */}
      {st.forwardPayload && (
        <ForwardModal
          isOpen
          onClose={() => st.setForwardPayload(null)}
          chats={st.memoizedChats}
          onForward={st.handleConfirmForward}
        />
      )}
      {st.sharePayload && (
        <ForwardModal
          isOpen
          onClose={() => st.setSharePayload(null)}
          chats={st.memoizedChats}
          onForward={st.handleConfirmShareMedia}
        />
      )}

      {/* Fullscreen media viewer (web 9432-9444) */}
      {st.mediaView && (
        <MediaViewer
          src={st.mediaView.src}
          type={st.mediaView.type}
          messages={st.messages}
          explicitMediaList={st.mediaView.mediaList}
          onClose={() => st.setMediaView(null)}
          onForwardMedia={(payload) => st.setForwardPayload(payload)}
        />
      )}

      {/* 18b: MessageInfoModal (web 9196-9204) */}
      {st.messageInfo && (
        <MessageInfoModal
          message={st.messageInfo}
          onClose={() => st.setMessageInfo(null)}
        />
      )}
      {/* 18d: AddContact (9207), CreateGroup (9348), AddMembers (9354) */}
      {st.showAddContact && <AddContactModal />}
      {st.showCreateGroup && (
        <CreateGroupModal
          onClose={() => st.setShowCreateGroup(false)}
          onCreate={st.createGroup}
          contacts={st.contacts}
        />
      )}
      {st.showAddMembers && (
        <AddMembersModal
          group={st.showAddMembers}
          onClose={() => st.setShowAddMembers(null)}
          onAdd={st.addGroupMembers}
          contacts={st.contacts}
        />
      )}
      {/* 18e: ChatInfo UnifiedProfileView (9360-9377) */}
      {st.showChatInfo && st.selectedChat && (
        <UnifiedProfileView
          key={st.selectedChat.id}
          chat={st.selectedChat}
          user={st.user}
          messages={st.messages}
          onClose={() => st.setShowChatInfo(false)}
          onAction={st.handleProfileAction}
          onUpdateField={st.handleUpdateField}
          onUploadAvatar={st.onUploadAvatar}
          contacts={st.contacts}
          groups={st.groups}
          isBlocked={st.blockedUsers.includes(String(st.selectedChat?.id))}
          onToggleBlock={st.toggleBlockUser}
        />
      )}
      {/* 18c: viewProfile UnifiedProfileView (9380-9399) */}
      {st.viewProfile && (
        <UnifiedProfileView
          key={st.viewProfile.id}
          chat={st.viewProfile}
          user={st.user}
          messages={st.viewProfile.id === st.selectedChat?.id ? st.messages : []}
          onClose={() => st.setViewProfile(null)}
          onAction={st.handleProfileAction}
          onUpdateField={st.handleUpdateField}
          onUploadAvatar={st.onUploadAvatar}
          contacts={st.contacts}
          groups={st.groups}
          isBlocked={st.blockedUsers.includes(String(st.viewProfile.id))}
          onToggleBlock={st.toggleBlockUser}
          initialViewState={st.viewProfile.initialViewState}
        />
      )}
      {/* 18f: SettingsScreen (9401-9412) */}
      {st.showSettings && (
        <SettingsScreen
          user={st.user}
          onSave={st.handleSave}
          onClose={st.closeSettings}
          blockedUsers={st.blockedUsers}
          onToggleBlock={st.toggleBlockUser}
          contacts={st.contacts}
          onUpdateProfile={st.handleUpdateProfile}
          onUploadAvatar={st.onUploadAvatar}
        />
      )}
      {/* 18h: StatusCreator (9486), StatusViewer (9498), CameraOverlay (9469) */}
      {st.showStatusCamera && <StatusCameraLauncher />}
      {st.showStatusCreator && (
        <StatusCreator
          user={st.user}
          onClose={() => {
            st.setShowStatusCreator(false);
            st.setStatusCameraMedia(null);
          }}
          initialMedia={st.statusCameraMedia}
          onStatusPosted={st.loadStatuses}
        />
      )}
      {st.viewerTarget && (
        <StatusViewer
          user={st.user}
          statuses={st.statuses}
          targetUserId={st.viewerTarget}
          contacts={st.contacts}
          initialStatusId={st.viewerStatusId}
          onClose={() => {
            st.setViewerTarget(null);
            st.setViewerStatusId(null);
          }}
        />
      )}

      {/* Mobile Bottom Navigation (web 9457-9466) */}
      {showBottomBar && (
        <BottomBar
          activeTab={st.activeTab}
          onTabChange={st.handleTabChange}
          onProfileClick={() => st.setViewProfile(st.user)}
          onBack={onExit}
          totalUnreadChats={st.totalUnreadChats}
          totalUnreadStatuses={st.totalUnreadStatuses}
        />
      )}
    </SafeAreaView>
  );
}

export default function LoudaHomeScreen({
  initialWithUsername,
}: {
  initialWithUsername?: string;
} = {}) {
  const navigation = useNavigation<any>();
  const onExit = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };
  return (
    <LoudaStoreProvider onExit={onExit}>
      <LoudaHome initialWithUsername={initialWithUsername} />
    </LoudaStoreProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  boot: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, overflow: 'hidden' },
  fullPane: { ...StyleSheet.absoluteFill, zIndex: 20 },
  panes: { flex: 1, flexDirection: 'row', overflow: 'hidden' },
  pane: { flex: 1, minWidth: 0 },
});
