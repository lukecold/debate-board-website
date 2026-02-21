import React, { useMemo, useState, useEffect } from 'react';
import { useMutation } from '@apollo/client';
import { useLanguage } from '../contexts/LanguageContext';
import { TRANSLATE_CONTENT, RETRANSLATE_CONTENT } from '../lib/queries';

const AI_USER_ID = '00000000-0000-0000-0000-000000000001';

function ArgumentCard({ arg, onVote, onDelete, currentUserId, isAdmin, onCollapse, t, targetLanguage }) {
  const canDelete = arg.userID === currentUserId || isAdmin;
  const causedUpdate = arg.features && arg.features.includes('caused_update');
  const isAI = arg.userID === AI_USER_ID;

  const [translatedText, setTranslatedText] = useState(null);
  const [showTranslated, setShowTranslated] = useState(false);
  const [translating, setTranslating] = useState(false);

  // Admin re-translate state
  const [showRetranslate, setShowRetranslate] = useState(false);
  const [retranslateComment, setRetranslateComment] = useState('');
  const [retranslating, setRetranslating] = useState(false);

  const [translateContent] = useMutation(TRANSLATE_CONTENT);
  const [retranslateContent] = useMutation(RETRANSLATE_CONTENT);

  // Reset cached translation when the target language changes
  useEffect(() => {
    setTranslatedText(null);
    setShowTranslated(false);
  }, [targetLanguage]);

  const handleTranslate = async () => {
    if (showTranslated) {
      setShowTranslated(false);
      return;
    }

    if (translatedText) {
      setShowTranslated(true);
      return;
    }

    setTranslating(true);
    try {
      const result = await translateContent({
        variables: { contentType: 'argument', contentID: arg.id, targetLanguage },
      });
      setTranslatedText(result.data.translateContent.translatedText);
      setShowTranslated(true);
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setTranslating(false);
    }
  };

  const handleRetranslate = async (e) => {
    e.preventDefault();
    setRetranslating(true);
    try {
      const result = await retranslateContent({
        variables: {
          contentType: 'argument',
          contentID: arg.id,
          targetLanguage,
          previousTranslation: translatedText || '',
          comment: retranslateComment,
        },
      });
      setTranslatedText(result.data.retranslateContent.translatedText);
      setShowTranslated(true);
      setShowRetranslate(false);
      setRetranslateComment('');
    } catch (err) {
      console.error('Re-translation failed:', err);
    } finally {
      setRetranslating(false);
    }
  };

  return (
    <div className={`argument-card ${isAI ? 'ai-reply-card' : ''}`}>
      <div className="arg-top-actions">
        {onCollapse && (
          <button
            className="btn-collapse-arg"
            onClick={onCollapse}
            title={t('args.collapse')}
          >
            &minus;
          </button>
        )}
        {canDelete && onDelete && (
          <button
            className="btn-delete-arg-inline"
            onClick={() => onDelete(arg.id)}
            title={t('args.deleteArgument')}
          >
            &times;
          </button>
        )}
      </div>
      {causedUpdate && (
        <span className="caused-update-badge" title={t('args.improvedArticle')}>&#128161;</span>
      )}
      {!isAI && (
        <div className="vote-controls">
          <button
            className="vote-btn upvote"
            onClick={() => onVote(arg.id, 'UPVOTE')}
            title={t('args.upvote')}
          >
            &#9650;
          </button>
          <span className={`vote-count ${arg.votes > 0 ? 'positive' : arg.votes < 0 ? 'negative' : ''}`}>
            {arg.votes}
          </span>
          <button
            className="vote-btn downvote"
            onClick={() => onVote(arg.id, 'DOWNVOTE')}
            title={t('args.downvote')}
          >
            &#9660;
          </button>
        </div>
      )}
      <div className="argument-body">
        <p className="argument-content">
          {showTranslated && translatedText ? translatedText : arg.content}
        </p>
        <div className="argument-meta">
          <span className="argument-author">
            {isAI && <span className="ai-sparkle" title="AI-generated">&#10024; </span>}
            {arg.userAlias || 'Anonymous'}
          </span>
          <span className="argument-time">
            {new Date(arg.createdAt).toLocaleString()}
          </span>
          <button
            className={`btn-translate-inline ${showTranslated ? 'active' : ''}`}
            onClick={handleTranslate}
            disabled={translating}
          >
            {translating ? t('translating') : showTranslated ? t('showOriginal') : t('translate')}
          </button>
          {isAdmin && showTranslated && (
            <button
              className="btn-retranslate-inline"
              onClick={() => setShowRetranslate(!showRetranslate)}
              title={t('args.retranslate')}
            >
              &#9998;
            </button>
          )}
        </div>
        {isAdmin && showRetranslate && (
          <form className="retranslate-form" onSubmit={handleRetranslate}>
            <textarea
              placeholder={t('args.retranslateComment')}
              value={retranslateComment}
              onChange={(e) => setRetranslateComment(e.target.value)}
              rows={2}
              required
            />
            <div className="retranslate-form-actions">
              <button type="submit" className="btn-primary btn-small" disabled={retranslating}>
                {retranslating ? t('args.retranslating') : t('args.retranslateSubmit')}
              </button>
              <button type="button" className="btn-secondary btn-small" onClick={() => setShowRetranslate(false)}>
                {t('home.cancel')}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function ArgumentThread({ arg, replies, onVote, onDelete, currentUserId, isAdmin, t, targetLanguage }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasReplies = replies && replies.length > 0;
  const replyCount = replies ? replies.length : 0;

  if (collapsed) {
    return (
      <div className="argument-thread">
        <button className="collapsed-summary" onClick={() => setCollapsed(false)}>
          <span className="collapsed-author">{arg.userAlias || 'Anonymous'}</span>
          <span className="collapsed-preview">{arg.content}</span>
          {replyCount > 0 && (
            <span className="collapsed-reply-count">+{replyCount}</span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="argument-thread">
      <ArgumentCard
        arg={arg}
        onVote={onVote}
        onDelete={onDelete}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onCollapse={() => setCollapsed(true)}
        t={t}
        targetLanguage={targetLanguage}
      />
      {hasReplies && (
        <div className="argument-thread-replies">
          {replies.map((reply) => (
            <ArgumentCard
              key={reply.id}
              arg={reply}
              onVote={onVote}
              onDelete={onDelete}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              t={t}
              targetLanguage={targetLanguage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ArgumentList({ arguments: args, onVote, onDelete, currentUserId, isAdmin }) {
  const { t, targetLanguage } = useLanguage();

  if (!args || args.length === 0) {
    return <div className="no-arguments">{t('args.noArguments')}</div>;
  }

  const threads = useMemo(() => {
    const userArgs = [];
    const aiWithParent = [];
    const aiOrphans = [];

    for (const arg of args) {
      if (arg.userID === AI_USER_ID) {
        if (arg.parentArgumentID) {
          aiWithParent.push(arg);
        } else {
          aiOrphans.push(arg);
        }
      } else {
        userArgs.push(arg);
      }
    }

    userArgs.sort((a, b) => b.votes - a.votes);

    const repliesByParent = {};
    for (const ai of aiWithParent) {
      if (!repliesByParent[ai.parentArgumentID]) {
        repliesByParent[ai.parentArgumentID] = [];
      }
      repliesByParent[ai.parentArgumentID].push(ai);
    }

    aiOrphans.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    const userArgsByTime = [...userArgs].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    for (const orphan of aiOrphans) {
      const orphanTime = new Date(orphan.createdAt);
      let bestMatch = null;
      for (const ua of userArgsByTime) {
        if (new Date(ua.createdAt) <= orphanTime) {
          bestMatch = ua;
        } else {
          break;
        }
      }
      if (bestMatch) {
        if (!repliesByParent[bestMatch.id]) {
          repliesByParent[bestMatch.id] = [];
        }
        repliesByParent[bestMatch.id].push(orphan);
      }
    }

    for (const key of Object.keys(repliesByParent)) {
      repliesByParent[key].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    return { userArgs, repliesByParent };
  }, [args]);

  return (
    <div className="argument-list">
      {threads.userArgs.map((arg) => (
        <ArgumentThread
          key={arg.id}
          arg={arg}
          replies={threads.repliesByParent[arg.id] || []}
          onVote={onVote}
          onDelete={onDelete}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          t={t}
          targetLanguage={targetLanguage}
        />
      ))}
    </div>
  );
}
