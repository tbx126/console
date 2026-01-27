import { Plus, MessageSquare, Trash2, Bot } from 'lucide-react';

const ConversationSidebar = ({
  conversations,
  currentId,
  onSelect,
  onCreate,
  onDelete
}) => {
  return (
    <div className="w-72 bg-white dark:bg-zinc-800 border-r border-zinc-200 dark:border-zinc-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center gap-2 mb-4">
          <Bot className="h-5 w-5 text-violet-600 dark:text-violet-400" />
          <span className="font-semibold text-zinc-900 dark:text-zinc-100">AI Assistant</span>
        </div>
        <button
          onClick={onCreate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition-colors text-sm font-medium text-white"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </button>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wider px-2 py-2">
          Recent Chats
        </div>
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all ${
              currentId === conv.id
                ? 'bg-violet-50 dark:bg-violet-900/30 border border-violet-200 dark:border-violet-700'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-700'
            }`}
            onClick={() => onSelect(conv.id)}
          >
            <MessageSquare className={`h-4 w-4 flex-shrink-0 ${
              currentId === conv.id ? 'text-violet-600' : 'text-zinc-400'
            }`} />
            <span className={`flex-1 truncate text-sm ${
              currentId === conv.id ? 'text-violet-900 dark:text-violet-300 font-medium' : 'text-zinc-700 dark:text-zinc-300'
            }`}>
              {conv.title || 'New Conversation'}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-zinc-200 rounded-lg transition-all"
            >
              <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-red-500" />
            </button>
          </div>
        ))}

        {conversations.length === 0 && (
          <div className="text-center py-12 text-zinc-400 text-sm">
            <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p>No conversations yet</p>
            <p className="text-xs mt-1">Start a new chat above</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConversationSidebar;
