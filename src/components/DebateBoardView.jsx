import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useSubscription } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  GET_DEBATE_BOARD,
  ADD_ARGUMENT,
  VOTE,
  UPDATE_DEBATE_BOARD,
  DELETE_DEBATE_BOARD,
  DELETE_ARGUMENT,
  DEBATE_BOARD_UPDATED,
  ARGUMENT_ADDED,
  TOGGLE_FAVOURITE,
  TRANSLATE_CONTENT,
  RETRANSLATE_CONTENT,
  UPDATE_DEBATE_BOARD_FEATURES,
  RESPOND_TO_OCTAGON_INVITE,
} from '../lib/queries';
import ArgumentList from './ArgumentList';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

export default function DebateBoardView({ boardId }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tTag, language, targetLanguage } = useLanguage();
  const userId = user.id;
  const [newArgument, setNewArgument] = useState('');
  const [showRefine, setShowRefine] = useState(false);
  const [refineInstruction, setRefineInstruction] = useState('');
  const [isRefining, setIsRefining] = useState(false);
  const [argumentFilter, setArgumentFilter] = useState('all');
  const [sidebarHidden, setSidebarHidden] = useState(false);

  // Translation state
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedContent, setTranslatedContent] = useState(null);
  const [translatedTitle, setTranslatedTitle] = useState(null);
  const [translating, setTranslating] = useState(false);

  // Local optimistic favourite state (null = use server state)
  const [localFavState, setLocalFavState] = useState(null);

  // Only auto-translate on an actual language *change*, not on initial mount
  const hasLanguageChangedRef = useRef(false);

  // Admin re-translate state
  const [showRetranslate, setShowRetranslate] = useState(false);
  const [retranslateComment, setRetranslateComment] = useState('');
  const [retranslating, setRetranslating] = useState(false);

  // Admin features editing state
  const [editingFeatures, setEditingFeatures] = useState(false);
  const [editFeaturesText, setEditFeaturesText] = useState('');

  const { loading, error, data, refetch } = useQuery(GET_DEBATE_BOARD, {
    variables: { id: boardId },
    pollInterval: isRefining ? 5000 : 0,
  });

  const [addArgument] = useMutation(ADD_ARGUMENT, {
    onCompleted: () => {
      setNewArgument('');
      refetch();
    },
  });

  const [vote] = useMutation(VOTE, {
    onCompleted: () => refetch(),
  });

  const [updateDebateBoard] = useMutation(UPDATE_DEBATE_BOARD, {
    onCompleted: () => {
      setShowRefine(false);
      setRefineInstruction('');
      setIsRefining(true);
    },
  });

  const [deleteDebateBoard, { loading: deleting }] = useMutation(DELETE_DEBATE_BOARD, {
    onCompleted: () => {
      navigate('/');
    },
  });

  const [deleteArgument] = useMutation(DELETE_ARGUMENT, {
    onCompleted: () => refetch(),
  });

  const [toggleFavourite] = useMutation(TOGGLE_FAVOURITE);

  const [translateContent] = useMutation(TRANSLATE_CONTENT);
  const [retranslateContent] = useMutation(RETRANSLATE_CONTENT);

  const [updateDebateBoardFeatures] = useMutation(UPDATE_DEBATE_BOARD_FEATURES, {
    onCompleted: () => {
      setEditingFeatures(false);
      setEditFeaturesText('');
      refetch();
    },
  });

  const [respondToOctagonInvite] = useMutation(RESPOND_TO_OCTAGON_INVITE, {
    onCompleted: () => refetch(),
  });

  useSubscription(DEBATE_BOARD_UPDATED, {
    variables: { debateBoardID: boardId },
    onData: ({ data: subData }) => {
      if (subData?.data?.debateBoardUpdated) {
        setIsRefining(false);
        setShowTranslation(false);
        setTranslatedContent(null);
        setTranslatedTitle(null);
        refetch();
      }
    },
  });

  useSubscription(ARGUMENT_ADDED, {
    variables: { debateBoardID: boardId },
    onData: () => refetch(),
  });

  const effectiveFavState = localFavState ?? (data?.debateBoard?.isFavourited ?? false);

  const handleToggleFav = () => {
    setLocalFavState(!effectiveFavState);
    toggleFavourite({
      variables: { debateBoardID: boardId },
      onCompleted: () => {
        setLocalFavState(null);
        refetch();
      },
      onError: () => {
        setLocalFavState(null);
      },
    });
  };

  // Auto-translate when the user actively changes language.
  // Skips the initial mount so opening a board never auto-translates.
  useEffect(() => {
    if (!hasLanguageChangedRef.current) {
      // First run is always the initial mount — mark and skip.
      hasLanguageChangedRef.current = true;
      return;
    }
    setShowTranslation(false);
    setTranslatedContent(null);
    setTranslatedTitle(null);
    if (!data?.debateBoard?.content) return;

    let cancelled = false;
    const doTranslate = async () => {
      setTranslating(true);
      try {
        const [contentResult, titleResult] = await Promise.all([
          translateContent({ variables: { contentType: 'board', contentID: boardId, targetLanguage } }),
          translateContent({ variables: { contentType: 'board_title', contentID: boardId, targetLanguage } }),
        ]);
        if (!cancelled) {
          setTranslatedContent(contentResult.data.translateContent.translatedText);
          setTranslatedTitle(titleResult.data.translateContent.translatedText);
          setShowTranslation(true);
        }
      } catch (err) {
        if (!cancelled) console.error('Auto-translation failed:', err);
      } finally {
        if (!cancelled) setTranslating(false);
      }
    };
    doTranslate();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, targetLanguage]);

  const handleTranslateBoard = async () => {
    if (showTranslation) {
      setShowTranslation(false);
      return;
    }

    setTranslating(true);
    try {
      const [contentResult, titleResult] = await Promise.all([
        translateContent({ variables: { contentType: 'board', contentID: boardId, targetLanguage } }),
        translateContent({ variables: { contentType: 'board_title', contentID: boardId, targetLanguage } }),
      ]);
      setTranslatedContent(contentResult.data.translateContent.translatedText);
      setTranslatedTitle(titleResult.data.translateContent.translatedText);
      setShowTranslation(true);
    } catch (err) {
      console.error('Translation failed:', err);
    } finally {
      setTranslating(false);
    }
  };

  const handleRetranslateBoard = async (e) => {
    e.preventDefault();
    setRetranslating(true);
    try {
      const [contentResult, titleResult] = await Promise.all([
        retranslateContent({
          variables: {
            contentType: 'board',
            contentID: boardId,
            targetLanguage,
            previousTranslation: translatedContent || '',
            comment: retranslateComment,
          },
        }),
        retranslateContent({
          variables: {
            contentType: 'board_title',
            contentID: boardId,
            targetLanguage,
            previousTranslation: translatedTitle || '',
            comment: retranslateComment,
          },
        }),
      ]);
      setTranslatedContent(contentResult.data.retranslateContent.translatedText);
      setTranslatedTitle(titleResult.data.retranslateContent.translatedText);
      setShowTranslation(true);
      setShowRetranslate(false);
      setRetranslateComment('');
    } catch (err) {
      console.error('Re-translation failed:', err);
    } finally {
      setRetranslating(false);
    }
  };

  const handleSubmitArgument = (e) => {
    e.preventDefault();
    if (!newArgument.trim()) return;
    addArgument({
      variables: {
        debateBoardID: boardId,
        userID: userId,
        userAlias: user.alias,
        content: newArgument,
      },
    });
  };

  const handleVote = (argumentID, voteType) => {
    vote({
      variables: { argumentID, userID: userId, voteType },
    });
  };

  const handleRefine = (e) => {
    e.preventDefault();
    if (!refineInstruction.trim()) return;
    updateDebateBoard({
      variables: {
        id: boardId,
        instruction: refineInstruction,
      },
    });
  };

  const handleDelete = () => {
    if (window.confirm(t('board.confirmDelete'))) {
      deleteDebateBoard({ variables: { id: boardId } });
    }
  };

  const handleDeleteArgument = (id) => {
    if (window.confirm(t('board.confirmDeleteArg'))) {
      deleteArgument({ variables: { id } });
    }
  };

  const filteredArguments = useMemo(() => {
    const args = [...(data?.debateBoard?.arguments || [])].sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    );
    if (argumentFilter === 'all') return args;

    const AI_USER_ID = '00000000-0000-0000-0000-000000000001';

    const keptIds = new Set();
    for (const arg of args) {
      if (arg.userID === AI_USER_ID) continue;
      if (argumentFilter === 'mine-and-updates') {
        if (arg.userID === userId || (arg.features && arg.features.includes('caused_update'))) {
          keptIds.add(arg.id);
        }
      } else if (argumentFilter === 'mine') {
        if (arg.userID === userId) {
          keptIds.add(arg.id);
        }
      }
    }

    return args.filter(
      (arg) => keptIds.has(arg.id) || arg.userID === AI_USER_ID
    );
  }, [data, argumentFilter, userId]);

  const argCount = data?.debateBoard?.arguments?.length || 0;

  if (loading) return <div className="loading">{t('board.loadingBoard')}</div>;
  if (error) return <div className="error">Error: {error.message}</div>;
  if (!data?.debateBoard) return <div className="error">{t('board.boardNotFound')}</div>;

  const board = data.debateBoard;

  return (
    <div className={`debate-board-view board-mode-${board.mode}`}>
      <div className="board-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          &larr; {t('board.back')}
        </button>
        <div className="board-title-area">
          <div className="board-title-row">
            <h1>{showTranslation && translatedTitle ? translatedTitle : board.title}</h1>
            {board.mode === 'octagon' && <span className="mode-badge-octagon">{t('board.modeOctagon')}</span>}
            {board.mode === 'battle' && <span className="mode-badge-battle">{t('board.modeBattle')}</span>}
            <button
              className={`board-fav-toggle ${effectiveFavState ? 'starred' : ''}`}
              onClick={handleToggleFav}
              title={effectiveFavState ? t('board.removeFromFavourites') : t('board.addToFavourites')}
            >
              {effectiveFavState ? '\u2605' : '\u2606'}
            </button>
          </div>
          <div className="board-dates">
            <span>{t('board.created')} {new Date(board.createdAt).toLocaleDateString()}</span>
            {board.updatedAt !== board.createdAt && (
              <span> | {t('board.updated')} {new Date(board.updatedAt).toLocaleDateString()}</span>
            )}
          </div>
          {(board.features && board.features.length > 0 || user.isAdmin) && (
            <div className="board-card-tags">
              {(board.features || []).map(f => <span key={f} className="tag-chip">{tTag(f)}</span>)}
              {user.isAdmin && editingFeatures ? (
                <span className="inline-features-edit">
                  <input
                    type="text"
                    value={editFeaturesText}
                    onChange={(e) => setEditFeaturesText(e.target.value)}
                    placeholder="tag1, tag2, ..."
                    className="features-edit-input"
                    autoFocus
                  />
                  <button
                    className="btn-admin btn-small"
                    onClick={() => updateDebateBoardFeatures({ variables: { id: boardId, features: editFeaturesText.split(',').map(f => f.trim()).filter(Boolean) } })}
                  >&#10003;</button>
                  <button className="btn-secondary btn-small" onClick={() => setEditingFeatures(false)}>&#10005;</button>
                </span>
              ) : user.isAdmin && (
                <button
                  className="btn-edit-tags"
                  onClick={() => { setEditFeaturesText((board.features || []).join(', ')); setEditingFeatures(true); }}
                  title="Edit features"
                >&#9998;</button>
              )}
            </div>
          )}
        </div>
        {user.isAdmin && (
          <div className="board-actions">
            <button
              className="btn-secondary"
              onClick={() => setShowRefine(!showRefine)}
            >
              {showRefine ? t('board.cancel') : t('board.refineBoard')}
            </button>
            <button
              className="btn-danger"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? t('board.deleting') : t('board.deleteBoard')}
            </button>
          </div>
        )}
      </div>

      {showRefine && (
        <form className="refine-form" onSubmit={handleRefine}>
          <textarea
            placeholder={t('board.refinePlaceholder')}
            value={refineInstruction}
            onChange={(e) => setRefineInstruction(e.target.value)}
            rows={2}
            required
          />
          <button type="submit" className="btn-primary" disabled={isRefining}>
            {isRefining ? t('board.refining') : t('board.submitRefinement')}
          </button>
        </form>
      )}

      {isRefining && (
        <div className="refining-banner">
          <div className="refining-spinner"></div>
          <span>{t('board.aiRefining')}</span>
        </div>
      )}

      {board.mode === 'octagon' && board.octagonInfo && (
        <div className="octagon-pending-banner">
          {board.octagonInfo.status === 'pending' && (
            <p><strong>{t('board.octagonPending')}</strong></p>
          )}
          <div className="octagon-participant-lists">
            <span>{t('board.octagonAccepted')}: {(board.octagonInfo.acceptedUserIDs || []).length}</span>
            {' | '}
            <span>{t('board.octagonPendingCount')}: {(board.octagonInfo.pendingUserIDs || []).length}</span>
          </div>
          {board.octagonInfo.pendingUserIDs?.includes(userId) && (
            <div className="octagon-respond-btns">
              <button
                className="btn-octagon"
                onClick={() => respondToOctagonInvite({ variables: { boardID: boardId, accept: true } })}
              >
                {t('uc.accept')}
              </button>
              <button
                className="btn-secondary"
                style={{ marginLeft: '8px' }}
                onClick={() => respondToOctagonInvite({ variables: { boardID: boardId, accept: false } })}
              >
                {t('uc.decline')}
              </button>
            </div>
          )}
        </div>
      )}

      <div className={`board-layout ${board.mode === 'battle' || board.mode === 'octagon' ? 'battle-layout' : ''} ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
        <div className="board-content">
          {board.content && (
            <div className="content-translate-bar">
              <button
                className={`btn-translate ${showTranslation ? 'active' : ''}`}
                onClick={handleTranslateBoard}
                disabled={translating}
              >
                {translating ? t('translating') : showTranslation ? t('showOriginal') : t('translate')}
              </button>
              {user.isAdmin && showTranslation && (
                <button
                  className="btn-retranslate-inline"
                  onClick={() => setShowRetranslate(!showRetranslate)}
                  title={t('args.retranslate')}
                >
                  &#9998;
                </button>
              )}
            </div>
          )}
          {user.isAdmin && showRetranslate && (
            <form className="retranslate-form" onSubmit={handleRetranslateBoard}>
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
          <div className="content-body markdown-content">
            {board.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {showTranslation && translatedContent ? translatedContent : board.content}
              </ReactMarkdown>
            ) : (
              <div className="generating">
                <div className="refining-spinner"></div>
                <p>{t('board.contentGenerating')}</p>
              </div>
            )}
          </div>
        </div>

        {!sidebarHidden && (
          <div className="board-sidebar">
            <div className="arguments-section">
              <div className="arguments-section-header">
                <h2>{board.mode === 'info' ? t('board.comments') : t('board.arguments')} ({argCount})</h2>
                <button
                  className="btn-hide-sidebar"
                  onClick={() => setSidebarHidden(true)}
                  title={t('board.hideArguments')}
                >
                  &minus;
                </button>
              </div>

              <div className="argument-filters">
                <button
                  className={`filter-btn ${argumentFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setArgumentFilter('all')}
                >
                  {t('board.all')}
                </button>
                <button
                  className={`filter-btn ${argumentFilter === 'mine-and-updates' ? 'active' : ''}`}
                  onClick={() => setArgumentFilter('mine-and-updates')}
                >
                  {t('board.impactful')}
                </button>
                <button
                  className={`filter-btn ${argumentFilter === 'mine' ? 'active' : ''}`}
                  onClick={() => setArgumentFilter('mine')}
                >
                  {t('board.mine')}
                </button>
              </div>

              {board.mode === 'octagon' && board.octagonInfo?.status === 'active' &&
               !board.octagonInfo?.acceptedUserIDs?.includes(userId) ? (
                <p className="spectator-note">{t('board.octagonSpectator')}</p>
              ) : (
                <form className="argument-form" onSubmit={handleSubmitArgument}>
                  <textarea
                    placeholder={t('board.addArgPlaceholder')}
                    value={newArgument}
                    onChange={(e) => setNewArgument(e.target.value)}
                    rows={3}
                    required
                  />
                  <button type="submit" className="btn-primary">
                    {t('board.submitArgument')}
                  </button>
                </form>
              )}

              <div className="arguments-scroll-area">
                <ArgumentList
                  arguments={filteredArguments}
                  onVote={handleVote}
                  onDelete={handleDeleteArgument}
                  currentUserId={userId}
                  isAdmin={user.isAdmin}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {sidebarHidden && (
        <button
          className="cloud-bubble"
          onClick={() => setSidebarHidden(false)}
          title={t('board.showArguments')}
        >
          <span className="cloud-bubble-text">{argCount}</span>
          <span className="cloud-bubble-tail"></span>
        </button>
      )}
    </div>
  );
}
