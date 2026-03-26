import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useSubscription, useLazyQuery } from '@apollo/client';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { userServiceClient } from '../lib/apollo';
import {
  GET_MEETING_ROOM, GET_MEETING_MESSAGES, GET_MEETING_SUMMARY,
  SEND_MEETING_MESSAGE, DELETE_MEETING_ROOM,
  MEETING_MESSAGE_ADDED, MEETING_SUMMARY_UPDATED,
  TOGGLE_MEETING_REACTION
} from '../lib/queries';
import { SEARCH_ORG_MEMBERS_BY_ALIAS_PREFIX } from '../lib/userQueries';
import EMOJI_DATA, { QUICK_EMOJIS } from '../lib/emojiData';

function highlightMentions(text) {
  return text.replace(/@([\w]+(?:#[a-f0-9]+)?)/g, '<span class="mention">@$1</span>');
}

function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toLocaleString();
}

function displayAlias(alias) {
  if (!alias) return '';
  return alias.replace(/#[a-f0-9]+$/i, '');
}

function isSameUser(msg, prevMsg) {
  if (!prevMsg) return false;
  return msg.userID === prevMsg.userID && !msg.isAIResponse === !prevMsg.isAIResponse;
}

function renderMessageContent(msg) {
  if (msg.isAIResponse) {
    return (
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {msg.content}
      </ReactMarkdown>
    );
  }
  return <span dangerouslySetInnerHTML={{ __html: highlightMentions(msg.content) }} />;
}

function aliasColor(alias) {
  let hash = 0;
  for (let i = 0; i < alias.length; i++) {
    hash = alias.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 55%, 45%)`;
}

export default function MeetingRoomPage() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  // UI state
  const [showSummary, setShowSummary] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [replyToThread, setReplyToThread] = useState(null);
  const [expandedThreads, setExpandedThreads] = useState({});

  // Track optimistic message IDs so subscription can detect replacements
  const optimisticIdsRef = useRef(new Set());

  // Emoji picker state
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState(null);
  const [emojiSearch, setEmojiSearch] = useState('');

  // Mention autocomplete state
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionCursorStart, setMentionCursorStart] = useState(null);
  const textareaRef = useRef(null);
  const messagesEndRef = useRef(null);
  const mentionDropdownRef = useRef(null);

  // Derive email domain for org search
  const emailDomain = user?.email?.split('@')[1] || '';

  // --- Queries ---
  const { data: roomData, loading: roomLoading } = useQuery(GET_MEETING_ROOM, {
    variables: { id: roomId },
  });
  const room = roomData?.meetingRoom;

  const { data: messagesData, loading: messagesLoading } = useQuery(GET_MEETING_MESSAGES, {
    variables: { roomID: roomId, threadParentID: null },
    fetchPolicy: 'network-only',
  });
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (messagesData?.meetingMessages) {
      setMessages(messagesData.meetingMessages);
    }
  }, [messagesData]);

  const { data: summaryData } = useQuery(GET_MEETING_SUMMARY, {
    variables: { roomID: roomId },
    skip: !showSummary,
  });
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (summaryData?.meetingSummary) {
      setSummary(summaryData.meetingSummary);
    }
  }, [summaryData]);

  // --- Thread messages ---
  const [threadMessages, setThreadMessages] = useState({});

  const [fetchThreadMessages] = useLazyQuery(GET_MEETING_MESSAGES, {
    fetchPolicy: 'network-only',
    onCompleted: (data) => {
      if (data?.meetingMessages?.length > 0) {
        const parentId = data.meetingMessages[0].parentMessageID;
        if (parentId) {
          setThreadMessages((prev) => ({ ...prev, [parentId]: data.meetingMessages }));
        }
      }
    },
  });

  // --- Mutations ---
  const [sendMessage] = useMutation(SEND_MEETING_MESSAGE);
  const [deleteRoom] = useMutation(DELETE_MEETING_ROOM);
  const [toggleReaction] = useMutation(TOGGLE_MEETING_REACTION);

  // --- Subscriptions ---
  useSubscription(MEETING_MESSAGE_ADDED, {
    variables: { roomID: roomId },
    onData: ({ data: subData }) => {
      const newMsg = subData?.data?.meetingMessageAdded;
      if (!newMsg) return;

      if (!newMsg.parentMessageID) {
        // Top-level message — replace optimistic or append
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          // Replace matching optimistic message from same user
          const optimisticIdx = prev.findIndex(
            (m) => m.__optimistic && m.content === newMsg.content && m.userID === newMsg.userID
          );
          if (optimisticIdx !== -1) {
            optimisticIdsRef.current.delete(prev[optimisticIdx].id);
            const next = [...prev];
            next[optimisticIdx] = newMsg;
            return next;
          }
          return [...prev, newMsg];
        });
      } else {
        // Thread message — replace optimistic or append, track if it was a replacement
        let replacedOptimistic = false;
        setThreadMessages((prev) => {
          const parentId = newMsg.parentMessageID;
          const existing = prev[parentId];
          if (!existing) return prev;
          if (existing.some((m) => m.id === newMsg.id)) return prev;
          const optimisticIdx = existing.findIndex(
            (m) => m.__optimistic && m.content === newMsg.content && m.userID === newMsg.userID
          );
          if (optimisticIdx !== -1) {
            replacedOptimistic = true;
            optimisticIdsRef.current.delete(existing[optimisticIdx].id);
            const next = [...existing];
            next[optimisticIdx] = newMsg;
            return { ...prev, [parentId]: next };
          }
          return { ...prev, [parentId]: [...existing, newMsg] };
        });
        // Only bump reply count if this wasn't replacing an optimistic message
        if (!replacedOptimistic) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === newMsg.parentMessageID
                ? { ...m, replyCount: (m.replyCount || 0) + 1 }
                : m
            )
          );
        }
      }
    },
  });

  useSubscription(MEETING_SUMMARY_UPDATED, {
    variables: { roomID: roomId },
    skip: !showSummary,
    onData: ({ data: subData }) => {
      const updated = subData?.data?.meetingSummaryUpdated;
      if (updated) {
        setSummary(updated);
      }
    },
  });

  // --- Mention autocomplete ---
  const [searchOrgMembers, { data: mentionData }] = useLazyQuery(
    SEARCH_ORG_MEMBERS_BY_ALIAS_PREFIX,
    { client: userServiceClient, fetchPolicy: 'network-only' }
  );

  const mentionResults = React.useMemo(() => {
    const results = ['assistant'];
    if (mentionData?.searchOrgMembersByAliasPrefix) {
      results.push(...mentionData.searchOrgMembersByAliasPrefix);
    }
    return results;
  }, [mentionData]);

  const handleTextareaChange = useCallback((e) => {
    const value = e.target.value;
    setMessageText(value);

    const cursorPos = e.target.selectionStart;
    // Find @ before cursor
    const textBeforeCursor = value.slice(0, cursorPos);
    const atMatch = textBeforeCursor.match(/@([\w]*)$/);

    if (atMatch) {
      const prefix = atMatch[1];
      setMentionCursorStart(cursorPos - prefix.length - 1); // position of @
      setMentionQuery(prefix);
      setMentionIndex(0);
      if (prefix.length > 0 && emailDomain) {
        searchOrgMembers({ variables: { emailDomain, prefix, limit: 8 } });
      }
    } else {
      setMentionQuery(null);
      setMentionCursorStart(null);
    }
  }, [emailDomain, searchOrgMembers]);

  const insertMention = useCallback((alias) => {
    if (mentionCursorStart == null) return;
    const before = messageText.slice(0, mentionCursorStart);
    const cursorPos = textareaRef.current?.selectionStart || messageText.length;
    const after = messageText.slice(cursorPos);
    const inserted = `@${alias} `;
    setMessageText(before + inserted + after);
    setMentionQuery(null);
    setMentionCursorStart(null);
    // Focus textarea
    setTimeout(() => {
      if (textareaRef.current) {
        const newPos = before.length + inserted.length;
        textareaRef.current.focus();
        textareaRef.current.selectionStart = newPos;
        textareaRef.current.selectionEnd = newPos;
      }
    }, 0);
  }, [mentionCursorStart, messageText]);

  const handleTextareaKeyDown = useCallback((e) => {
    if (mentionQuery != null && mentionResults.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, mentionResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        insertMention(mentionResults[mentionIndex]);
      } else if (e.key === 'Escape') {
        setMentionQuery(null);
      }
      return;
    }

    // Enter to send (without Shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [mentionQuery, mentionResults, mentionIndex, insertMention]);

  // --- Click outside to cancel empty reply ---
  useEffect(() => {
    if (!replyToThread) return;
    const handleClickOutside = (e) => {
      const threadInput = document.querySelector('.meeting-thread-reply-input');
      if (threadInput && !threadInput.contains(e.target) && !messageText.trim()) {
        setReplyToThread(null);
        setExpandedThreads((prev) => {
          const next = { ...prev };
          delete next[replyToThread];
          return next;
        });
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [replyToThread, messageText]);

  // --- Auto-scroll ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- Send message ---
  const handleSend = useCallback(async () => {
    const content = messageText.trim();
    if (!content) return;

    // Extract mentions
    const mentionMatches = content.match(/@[\w]+(?:#[a-f0-9]+)?/g) || [];
    const mentionSet = [...new Set(mentionMatches.map((m) => m.slice(1)))]; // remove @
    // Also check for @assistant
    if (content.includes('@assistant') && !mentionSet.includes('assistant')) {
      mentionSet.push('assistant');
    }

    // Optimistic UI: show message immediately
    const optimisticId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimisticMsg = {
      id: optimisticId,
      meetingRoomID: roomId,
      userID: user?.id || '',
      userAlias: user?.alias || user?.email?.split('@')[0] || 'me',
      userAvatarUrl: user?.avatarUrl || null,
      content,
      parentMessageID: replyToThread || null,
      isAIResponse: false,
      mentions: mentionSet,
      replyCount: 0,
      reactions: [],
      createdAt: new Date().toISOString(),
      __optimistic: true,
    };

    optimisticIdsRef.current.add(optimisticId);
    if (!replyToThread) {
      setMessages((prev) => [...prev, optimisticMsg]);
    } else {
      setThreadMessages((prev) => {
        const existing = prev[replyToThread] || [];
        return { ...prev, [replyToThread]: [...existing, optimisticMsg] };
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === replyToThread
            ? { ...m, replyCount: (m.replyCount || 0) + 1 }
            : m
        )
      );
    }

    setMessageText('');
    setReplyToThread(null);

    try {
      await sendMessage({
        variables: {
          roomID: roomId,
          content,
          parentMessageID: replyToThread || undefined,
          mentions: mentionSet.length > 0 ? mentionSet : undefined,
          userAvatarUrl: user?.avatarUrl || undefined,
        },
      });
    } catch (err) {
      console.error('Failed to send message:', err);
      // Remove the optimistic message on failure
      if (!optimisticMsg.parentMessageID) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      } else {
        setThreadMessages((prev) => {
          const parentId = optimisticMsg.parentMessageID;
          const existing = prev[parentId];
          if (!existing) return prev;
          return { ...prev, [parentId]: existing.filter((m) => m.id !== optimisticId) };
        });
        setMessages((prev) =>
          prev.map((m) =>
            m.id === optimisticMsg.parentMessageID
              ? { ...m, replyCount: Math.max(0, (m.replyCount || 0) - 1) }
              : m
          )
        );
      }
    }
  }, [messageText, roomId, replyToThread, sendMessage, user]);

  // --- Toggle thread ---
  const toggleThread = useCallback((messageId) => {
    setExpandedThreads((prev) => {
      const next = { ...prev };
      if (next[messageId]) {
        delete next[messageId];
        if (replyToThread === messageId) setReplyToThread(null);
      } else {
        next[messageId] = true;
        fetchThreadMessages({ variables: { roomID: roomId, threadParentID: messageId } });
      }
      return next;
    });
  }, [roomId, fetchThreadMessages, replyToThread]);

  // --- Delete room ---
  const canDelete = room && (
    room.createdBy === user?.id ||
    ['admin', 'org_admin', 'owner'].includes(user?.role)
  );

  const handleDelete = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete this meeting room? This cannot be undone.')) {
      return;
    }
    try {
      await deleteRoom({ variables: { id: roomId } });
      navigate('/?mode=meetings');
    } catch (err) {
      console.error('Failed to delete room:', err);
    }
  }, [roomId, deleteRoom, navigate]);

  // --- Emoji reactions ---
  const handleToggleReaction = useCallback(async (messageID, emoji) => {
    try {
      const { data } = await toggleReaction({ variables: { messageID, emoji } });
      if (data?.toggleMeetingReaction) {
        const updateReactions = (msgs) => msgs.map(m =>
          m.id === messageID ? { ...m, reactions: data.toggleMeetingReaction } : m
        );
        setMessages(updateReactions);
        setThreadMessages(prev => {
          const updated = {};
          for (const [key, msgs] of Object.entries(prev)) {
            updated[key] = updateReactions(msgs);
          }
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
    setEmojiPickerMessageId(null);
    setEmojiSearch('');
  }, [toggleReaction]);

  // Close emoji picker on outside click
  useEffect(() => {
    if (!emojiPickerMessageId) return;
    const handler = (e) => {
      if (!e.target.closest('.meeting-emoji-picker') && !e.target.closest('.meeting-hover-more-emoji')) {
        setEmojiPickerMessageId(null);
        setEmojiSearch('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [emojiPickerMessageId]);

  const renderEmojiPicker = (messageId) => {
    const filtered = emojiSearch
      ? EMOJI_DATA.filter(e =>
          e.emoji.includes(emojiSearch) ||
          e.keywords.some(k => k.toLowerCase().includes(emojiSearch.toLowerCase()))
        )
      : EMOJI_DATA;

    return (
      <div className="meeting-emoji-picker" onClick={(e) => e.stopPropagation()}>
        <div className="meeting-emoji-picker-header">
          <span>Find a reaction</span>
          <button className="meeting-emoji-picker-close" onClick={() => { setEmojiPickerMessageId(null); setEmojiSearch(''); }}>&times;</button>
        </div>
        <input
          type="text"
          className="meeting-emoji-search"
          placeholder="Search emoji..."
          value={emojiSearch}
          onChange={(e) => setEmojiSearch(e.target.value)}
          autoFocus
        />
        <div className="meeting-emoji-grid">
          {filtered.slice(0, 60).map(({ emoji }) => (
            <button key={emoji} onClick={() => handleToggleReaction(messageId, emoji)}>
              {emoji}
            </button>
          ))}
          {filtered.length === 0 && <div className="meeting-emoji-empty">No emoji found</div>}
        </div>
      </div>
    );
  };

  const renderReactions = (msg) => {
    const reactions = msg.reactions || [];
    if (reactions.length === 0) return null;

    return (
      <div className="meeting-reactions">
        {reactions.map(r => (
          <button
            key={r.emoji}
            className={`meeting-reaction-pill ${r.userReacted ? 'active' : ''}`}
            onClick={() => handleToggleReaction(msg.id, r.emoji)}
            title={r.users.join(', ')}
          >
            {r.emoji}{r.count > 1 && <span className="meeting-reaction-count">{r.count}</span>}
          </button>
        ))}
      </div>
    );
  };

  const renderHoverActions = (msg) => (
    <>
      <div className="meeting-message-hover-actions">
        <button onClick={() => handleToggleReaction(msg.id, '👍')} title="👍">👍</button>
        <button onClick={() => handleToggleReaction(msg.id, '😂')} title="😂">😂</button>
        <button onClick={() => handleToggleReaction(msg.id, '✅')} title="✅">✅</button>
        <button onClick={() => handleToggleReaction(msg.id, '❌')} title="❌">❌</button>
        <button onClick={() => handleToggleReaction(msg.id, '👀')} title="👀">👀</button>
        <button
          className="meeting-hover-more-emoji"
          title="Find another reaction"
          onClick={(e) => { e.stopPropagation(); setEmojiPickerMessageId(emojiPickerMessageId === msg.id ? null : msg.id); }}
        >…
        </button>
      </div>
      {emojiPickerMessageId === msg.id && renderEmojiPicker(msg.id)}
    </>
  );

  // --- Render helpers ---
  const renderAvatar = (msg) => {
    if (msg.isAIResponse) {
      return (
        <div className="meeting-message-avatar meeting-message-avatar-ai">
          &#10022;
        </div>
      );
    }
    if (msg.userAvatarUrl) {
      return <img className="meeting-message-avatar meeting-message-avatar-img" src={msg.userAvatarUrl} alt={msg.userAlias} />;
    }
    const letter = (msg.userAlias || '?')[0].toUpperCase();
    return (
      <div
        className="meeting-message-avatar"
        style={{ backgroundColor: aliasColor(msg.userAlias || '') }}
      >
        {letter}
      </div>
    );
  };

  // --- Render ---
  if (roomLoading) {
    return (
      <div className="meeting-room-page">
        <div className="meeting-loading">Loading...</div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="meeting-room-page">
        <div className="meeting-error">
          Meeting room not found.
        </div>
      </div>
    );
  }

  return (
    <div className="meeting-room-page">
      {/* Header */}
      <div className="meeting-header">
        <button className="meeting-back-btn" onClick={() => navigate('/?mode=meetings')}>
          &larr; {t('meetings.backToRooms')}
        </button>
        <div className="meeting-header-info">
          <h2 className="meeting-room-name">{room.name}</h2>
          {room.description && (
            <p className="meeting-room-desc">{room.description}</p>
          )}
        </div>
        <div className="meeting-header-actions">
          <button
            className={`meeting-summary-toggle ${showSummary ? 'active' : ''}`}
            onClick={() => setShowSummary((v) => !v)}
          >
            {showSummary ? t('meetings.hideSummary') : t('meetings.showSummary')}
          </button>
          {canDelete && (
            <button className="meeting-delete-btn" onClick={handleDelete}>
              {t('meetings.deleteRoom')}
            </button>
          )}
        </div>
      </div>

      {/* Main content area */}
      <div className={`meeting-body ${showSummary ? 'meeting-body-with-summary' : ''}`}>
        {/* Summary panel */}
        {showSummary && (
          <div className="meeting-summary-panel">
            <div className="meeting-summary-header">
              <h3>Summary</h3>
              <button onClick={() => setShowSummary(false)}>&times;</button>
            </div>

            {summary?.status === 'generating' && (
              <div className="meeting-summary-generating">
                Generating summary...
              </div>
            )}

            {summary?.content ? (
              <div className="meeting-summary-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {summary.content}
                </ReactMarkdown>
              </div>
            ) : summary?.status !== 'generating' && (
              <div className="meeting-summary-empty">
                {t('meetings.noSummary')}
              </div>
            )}

            {summary?.updatedAt && (
              <div className="meeting-summary-meta">
                {summary.messageCount} messages &middot; Last updated {formatTime(summary.updatedAt)}
              </div>
            )}
          </div>
        )}

        {/* Messages area */}
        <div className="meeting-messages-area">
          <div className="meeting-messages-list">
            {messagesLoading && (
              <div className="meeting-loading">Loading messages...</div>
            )}

            {!messagesLoading && messages.length === 0 && (
              <div className="meeting-messages-empty">
                <p>No messages yet. Start the conversation!</p>
              </div>
            )}

            {messages.map((msg, idx) => {
              const prevMsg = idx > 0 ? messages[idx - 1] : null;
              const continuation = isSameUser(msg, prevMsg);
              return (
              <div
                key={msg.id}
                className={`meeting-message ${msg.isAIResponse ? 'meeting-message-ai' : ''}${emojiPickerMessageId === msg.id ? ' meeting-message-picker-open' : ''}${continuation ? ' meeting-message-continuation' : ''}`}
              >
                {renderHoverActions(msg)}
                {!continuation ? (
                  <div className="meeting-message-header">
                    {renderAvatar(msg)}
                    <span className={`meeting-message-alias ${msg.isAIResponse ? 'meeting-message-alias-ai' : ''}`}>
                      {displayAlias(msg.userAlias)}
                    </span>
                    <span className="meeting-message-time">{formatTime(msg.createdAt)}</span>
                  </div>
                ) : null}
                <div className="meeting-message-body">
                  <div className="meeting-message-footer">
                    <button
                      className="meeting-reply-btn"
                      onClick={() => {
                        setReplyToThread(msg.id);
                        setExpandedThreads((prev) => ({ ...prev, [msg.id]: true }));
                        setTimeout(() => textareaRef.current?.focus(), 50);
                      }}
                    >
                      {t('meetings.reply')}
                    </button>
                  </div>
                  <div className="meeting-message-body-right">
                    <div className="meeting-message-content-row">
                      <div className="meeting-message-content">
                        {renderMessageContent(msg)}
                      </div>
                      {continuation && (
                        <span className="meeting-message-time-hover">
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    {renderReactions(msg)}
                    {msg.replyCount > 0 && (
                      <button
                        className="meeting-thread-toggle"
                        onClick={() => toggleThread(msg.id)}
                      >
                        {expandedThreads[msg.id]
                          ? t('meetings.hideReplies')
                          : `${msg.replyCount} ${t('meetings.replies')}`}
                      </button>
                    )}
                  </div>
                </div>

                {/* Thread expansion */}
                {expandedThreads[msg.id] && (
                  <div className="meeting-thread">
                    {(threadMessages[msg.id] || []).map((reply) => (
                      <div
                        key={reply.id}
                        className={`meeting-message ${reply.isAIResponse ? 'meeting-message-ai' : ''}`}
                      >
                        {renderHoverActions(reply)}
                        <div className="meeting-message-header">
                          {renderAvatar(reply)}
                          <span className={`meeting-message-alias ${reply.isAIResponse ? 'meeting-message-alias-ai' : ''}`}>
                            {displayAlias(reply.userAlias)}
                          </span>
                          <span className="meeting-message-time">
                            {formatTime(reply.createdAt)}
                          </span>
                        </div>
                        <div className="meeting-message-content">
                          {renderMessageContent(reply)}
                        </div>
                        {renderReactions(reply)}
                      </div>
                    ))}
                    {replyToThread === msg.id ? (
                      <div className="meeting-thread-reply-input">
                        <textarea
                          ref={textareaRef}
                          className="meeting-textarea"
                          value={messageText}
                          onChange={handleTextareaChange}
                          onKeyDown={handleTextareaKeyDown}
                          placeholder={t('meetings.typeMessage')}
                          rows={1}
                          autoFocus
                        />
                        <div className="meeting-thread-reply-actions">
                          <button className="meeting-send-btn meeting-send-btn-small" onClick={handleSend} disabled={!messageText.trim()}>
                            {t('meetings.send')}
                          </button>
                          <button className="meeting-reply-cancel-btn" onClick={() => { setReplyToThread(null); setMessageText(''); }}>
                            {t('meetings.cancelReply')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        className="meeting-reply-btn"
                        onClick={() => {
                          setReplyToThread(msg.id);
                        }}
                      >
                        {t('meetings.reply')}
                      </button>
                    )}
                  </div>
                )}
              </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input — only for top-level messages (thread replies use inline input) */}
          {!replyToThread && (
          <div className="meeting-input-area">
            <div className="meeting-input-row">
              <div className="meeting-textarea-wrapper">
                <textarea
                  ref={textareaRef}
                  className="meeting-textarea"
                  value={messageText}
                  onChange={handleTextareaChange}
                  onKeyDown={handleTextareaKeyDown}
                  placeholder={t('meetings.typeMessage')}
                  rows={1}
                />
                {/* Mention dropdown */}
                {mentionQuery != null && mentionResults.length > 0 && (
                  <div className="meeting-mention-dropdown" ref={mentionDropdownRef}>
                    {mentionResults.map((alias, idx) => (
                      <div
                        key={alias}
                        className={`meeting-mention-option ${
                          idx === mentionIndex ? 'meeting-mention-option-active' : ''
                        }`}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          insertMention(alias);
                        }}
                      >
                        @{alias}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                className="meeting-send-btn"
                onClick={handleSend}
                disabled={!messageText.trim()}
              >
                {t('meetings.send')}
              </button>
            </div>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}
