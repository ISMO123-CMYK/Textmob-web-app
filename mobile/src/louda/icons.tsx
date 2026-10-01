import React from 'react';
import { Feather, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';

export type IconProps = {
  size?: number;
  color?: string;
  style?: any;
};

type FeatherName = keyof typeof Feather.glyphMap;
type MciName = keyof typeof MaterialCommunityIcons.glyphMap;
type IonName = keyof typeof Ionicons.glyphMap;

const feather =
  (name: FeatherName) =>
  ({ size = 20, color = '#6b7280', style }: IconProps) =>
    <Feather name={name} size={size} color={color} style={style} />;

const mci =
  (name: MciName) =>
  ({ size = 20, color = '#6b7280', style }: IconProps) =>
    <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;

const ion =
  (name: IonName) =>
  ({ size = 20, color = '#6b7280', style }: IconProps) =>
    <Ionicons name={name} size={size} color={color} style={style} />;

/** Mirrors Icons.* from client/src/louda/LoudaApp.jsx (lines 12-59). */
export const Icons = {
  chat: feather('message-circle'),
  archive: feather('archive'),
  play: feather('play'),
  pause: feather('pause'),
  mic: feather('mic'),
  music: feather('music'),
  send: feather('send'),
  attach: feather('paperclip'),
  image: feather('image'),
  video: feather('video'),
  x: feather('x'),
  more: feather('more-vertical'),
  search: feather('search'),
  lock: feather('lock'),
  chevronRight: feather('chevron-right'),
  phone: feather('phone'),
  edit: feather('edit-2'),
  block: feather('slash'),
  check: feather('check'),
  checkDouble: mci('check-all'),
  smile: feather('smile'),
  settings: feather('settings'),
  user: feather('user'),
  users: feather('users'),
  plus: feather('plus'),
  camera: feather('camera'),
  file: feather('file-text'),
  mapPin: feather('map-pin'),
  audio: feather('headphones'),
  trash: feather('trash-2'),
  arrowLeft: feather('arrow-left'),
  loading: feather('loader'),
  pin: mci('pin'),
  bell: feather('bell'),
  star: feather('star'),
  shieldPlus: mci('shield-plus'),
  shieldMinus: mci('shield-remove'),
  status: ion('radio-button-on'),
  logout: feather('log-out'),
  // Extras used by the mobile port (status, settings, gallery).
  download: feather('download'),
  share: feather('share-2'),
  copy: feather('copy'),
  eye: feather('eye'),
  refresh: feather('refresh-cw'),
  grid: feather('grid'),
  type: feather('type'),
  link: feather('link'),
  reply: feather('corner-up-left'),
  info: feather('info'),
  clock: feather('clock'),
  phoneCall: feather('phone-call'),
  userPlus: feather('user-plus'),
  folder: feather('folder'),
  image2: feather('image'),
  volume: feather('volume-2'),
  globe: feather('globe'),
  key: feather('key'),
  power: feather('power'),
  help: feather('help-circle'),
  filter: feather('filter'),
  bold: feather('bold'),
  italic: feather('italic'),
  list: feather('list'),
};

export type IconsType = typeof Icons;
