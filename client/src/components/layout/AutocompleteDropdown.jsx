import { createPortal } from 'react-dom';
import { cn } from '../../utils/classNames';

export default function AutocompleteDropdown({ items, onSelect, activeIndex }) {
 if (!items || items.length === 0) {
 return null;
 }

 return createPortal(
 <div className="fixed inset-0 z-[2147483647] pointer-events-none flex flex-col justify-end md:justify-start md:items-center">
 <div className="pointer-events-auto w-full md:w-[450px] md:mt-20 bg-white md:bg-white/95 md: md:backdrop-blur-xl rounded-t-[32px] md:rounded-2xl border-t md:border border-gray-100 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] md:shadow-2xl overflow-hidden max-h-[60vh] md:max-h-[400px] flex flex-col transform transition-transform animate-in slide-in-from-bottom duration-300">
 <div className="p-4 md:p-3 space-y-0.5">
 {/* Mobile swipe handle indicator */}
 <div className="flex justify-center mb-4 md:hidden">
 <div className="w-12 h-1.5 rounded-full bg-gray-200 " />
 </div>

 <div className="flex items-center justify-between px-3 pb-2 border-b border-gray-50 mb-2">
 <p className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600 ">
 Suggestions
 </p>
 <span className="text-[9px] text-gray-400 uppercase font-black tracking-widest hidden md:block">
 {items.length} MATCHES
 </span>
 </div>

 <div className="space-y-1 overflow-y-auto pr-1">
 {items.map((item, idx) => {
 const active = idx === activeIndex;
 const isUser = item.type === 'user';
 const symbol = isUser ? '@' : item.type === 'phrase' ? '»' : '#';

 return (
 <div
 onMouseDown={e => {
 e.preventDefault();
 onSelect(item);
 }}
 className={cn(
 "flex items-center gap-3 px-4 py-3 md:py-2.5 rounded-xl cursor-pointer transition-all duration-200 group",
 active
 ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
 : "hover:bg-gray-50 text-gray-800 "
 )}
 key={isUser ? `user-${item.username}-${idx}` : `term-${item.query || idx}-${idx}`}
 >
 <div
 className={cn(
 "w-10 h-10 md:w-8 md:h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0 text-sm overflow-hidden",
 active
 ? "bg-white/25 text-white"
 : "bg-gray-100 text-gray-400 "
 )}
 >
 {isUser && item.profile_pic ? (
 <img src={item.profile_pic} className="w-full h-full object-cover" alt="" />
 ) : (
 symbol
 )}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-sm font-bold truncate">
 {isUser ? `@${item.username}` : (item.query || '').replace(/^[#@]/, '')}
 </p>
 {isUser && item.fullname && (
 <p className={cn("text-[10px] truncate opacity-80", active ? "text-blue-100" : "text-gray-400 ")}>
 {item.fullname}
 </p>
 )}
 {!isUser && item.count > 0 && item.type === 'hashtag' && (
 <p className={cn("text-[10px] truncate opacity-80 uppercase font-black tracking-widest", active ? "text-blue-100" : "text-gray-400")}>
 Trending topic
 </p>
 )}
 </div>
 {active && (
 <span className="px-2 py-0.5 rounded-lg bg-white/20 text-[9px] font-black uppercase tracking-widest hidden md:block">
 Keep Typing
 </span>
 )}
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>,
 document.body
 );
}
