import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  GET_DEBATE_BOARDS,
  GET_MY_FAVOURITES,
  GET_ALL_TAGS,
  GET_PROPOSALS,
  CREATE_DEBATE_BOARD,
  CREATE_OCTAGON_BOARD,
  VOTE_TO_CLOSE_OCTAGON,
  CREATE_PROPOSAL,
  TOGGLE_FAVOURITE,
  VOTE_ON_PROPOSAL,
  ADD_PROPOSAL_ARGUMENT,
  DELETE_PROPOSAL,
  ADMIN_ADOPT_PROPOSAL,
  ADMIN_REJECT_PROPOSAL,
  TRANSLATE_CONTENT,
  UPDATE_PROPOSAL_FEATURES,
  UPDATE_BOARD_MODE,
  UPDATE_PROPOSAL_MODE,
  CHECK_OCTAGON_ELIGIBILITY,
} from '../lib/queries';
import { SEARCH_USERS_BY_ALIAS_PREFIX } from '../lib/userQueries';
import { userServiceClient } from '../lib/apollo';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import ArgumentList from '../components/ArgumentList';

export default function Home() {
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newInstruction, setNewInstruction] = useState('');
  const [newFeatures, setNewFeatures] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const viewMode = searchParams.get('mode') || 'info';
  const setViewMode = (mode) => setSearchParams({ mode });
  const [octagonTab, setOctagonTab] = useState('active'); // initiating | active | archived
  // OCTAGON creation form state
  const [showOctagonCreate, setShowOctagonCreate] = useState(false);
  const [octagonTitle, setOctagonTitle] = useState('');
  const [octagonInstruction, setOctagonInstruction] = useState('');
  const [octagonFeatures, setOctagonFeatures] = useState('');
  const [octagonAliases, setOctagonAliases] = useState('');
  const [aliasSuggestions, setAliasSuggestions] = useState([]);
  const [showAliasSuggestions, setShowAliasSuggestions] = useState(false);
  const [octagonAliasError, setOctagonAliasError] = useState('');
  const aliasDebounceRef = useRef(null);
  const [proposalTab, setProposalTab] = useState('active');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalFeatures, setProposalFeatures] = useState('');
  const [expandedProposal, setExpandedProposal] = useState(null);
  const [proposalArgText, setProposalArgText] = useState('');
  const [editingFeaturesProposalId, setEditingFeaturesProposalId] = useState(null);
  const [editFeaturesText, setEditFeaturesText] = useState('');
  const [pendingFavChanges, setPendingFavChanges] = useState({});

  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tTag, language, targetLanguage } = useLanguage();
  const isAdmin = user?.isAdmin;

  // Proposal translation state: map keyed by `${proposalId}_${field}`
  const [proposalTranslations, setProposalTranslations] = useState({});

  // ========== Data Queries ==========

  // Octagon eligibility from backend (only when in octagon mode and logged in)
  const { data: eligibilityData } = useQuery(CHECK_OCTAGON_ELIGIBILITY, {
    skip: !user || viewMode !== 'octagon',
  });
  const isOctagonEligible = !!(eligibilityData?.checkOctagonEligibility);

  // Lazy alias prefix search (user-service)
  const [searchAliasPrefix, { data: aliasSuggestionData }] = useLazyQuery(
    SEARCH_USERS_BY_ALIAS_PREFIX,
    { client: userServiceClient, fetchPolicy: 'network-only' }
  );

  useEffect(() => {
    const results = aliasSuggestionData?.searchUsersByAliasPrefix || [];
    setAliasSuggestions(results);
    setShowAliasSuggestions(results.length > 0);
  }, [aliasSuggestionData]);

  const { data: boardsData, loading: boardsLoading, error: boardsError, refetch: refetchBoards } = useQuery(GET_DEBATE_BOARDS, {
    variables: { search: search || undefined, tags: selectedTags.length > 0 ? selectedTags : undefined },
  });

  const { data: favsData, refetch: refetchFavs } = useQuery(GET_MY_FAVOURITES);

  const { data: tagsData } = useQuery(GET_ALL_TAGS);

  const { data: proposalsData, loading: proposalsLoading, refetch: refetchProposals } = useQuery(GET_PROPOSALS, {
    variables: {
      status: proposalTab === 'active' ? 'open' : proposalTab,
      mode: viewMode !== 'octagon' ? viewMode : undefined,
    },
  });

  // ========== Mutations ==========
  const [createDebateBoard, { loading: creating }] = useMutation(CREATE_DEBATE_BOARD, {
    onCompleted: (data) => {
      const boardId = data.createDebateBoard;
      setShowCreate(false);
      setNewTitle('');
      setNewInstruction('');
      setNewFeatures('');
      refetchBoards();
      navigate(`/board/${boardId}`);
    },
  });

  const [createOctagonBoard, { loading: creatingOctagon }] = useMutation(CREATE_OCTAGON_BOARD, {
    onCompleted: (data) => {
      const boardId = data.createOctagonBoard;
      setShowOctagonCreate(false);
      setOctagonTitle('');
      setOctagonInstruction('');
      setOctagonFeatures('');
      setOctagonAliases('');
      refetchBoards();
      navigate(`/board/${boardId}`);
    },
  });

  const [voteToCloseOctagon] = useMutation(VOTE_TO_CLOSE_OCTAGON, {
    onCompleted: () => refetchBoards(),
  });

  const [toggleFavourite] = useMutation(TOGGLE_FAVOURITE);

  const [createProposal, { loading: creatingProposal, error: proposalError }] = useMutation(CREATE_PROPOSAL, {
    onCompleted: () => {
      setShowProposalForm(false);
      setProposalTitle('');
      setProposalDescription('');
      setProposalFeatures('');
      refetchProposals();
    },
  });

  const [voteOnProposal] = useMutation(VOTE_ON_PROPOSAL, {
    onCompleted: () => refetchProposals(),
  });

  const [addProposalArgument] = useMutation(ADD_PROPOSAL_ARGUMENT, {
    onCompleted: () => {
      setProposalArgText('');
      refetchProposals();
    },
  });

  const [deleteProposal] = useMutation(DELETE_PROPOSAL, {
    onCompleted: () => refetchProposals(),
  });

  const [adminAdoptProposal] = useMutation(ADMIN_ADOPT_PROPOSAL, {
    onCompleted: () => refetchProposals(),
  });

  const [adminRejectProposal] = useMutation(ADMIN_REJECT_PROPOSAL, {
    onCompleted: () => refetchProposals(),
  });

  const [updateProposalFeatures] = useMutation(UPDATE_PROPOSAL_FEATURES, {
    onCompleted: () => {
      setEditingFeaturesProposalId(null);
      setEditFeaturesText('');
      refetchProposals();
    },
  });

  const [translateContentMutation] = useMutation(TRANSLATE_CONTENT);

  const [updateBoardMode] = useMutation(UPDATE_BOARD_MODE, {
    onCompleted: () => refetchBoards(),
  });

  const [updateProposalMode] = useMutation(UPDATE_PROPOSAL_MODE, {
    onCompleted: () => refetchProposals(),
  });

  // Reset translations when language changes
  useEffect(() => {
    setProposalTranslations({});
  }, [language]);

  // ========== Handlers ==========
  const handleCreate = (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newInstruction.trim()) return;
    createDebateBoard({
      variables: {
        title: newTitle,
        features: newFeatures.split(',').map(f => f.trim()).filter(Boolean),
        instruction: newInstruction,
        mode: viewMode,
      },
    });
  };

  // Extract the current alias token being typed (text after the last comma)
  const getCurrentAliasToken = (value) => {
    const lastComma = value.lastIndexOf(',');
    return value.slice(lastComma + 1).trim();
  };

  const handleOctagonAliasesChange = (e) => {
    const value = e.target.value;
    setOctagonAliases(value);
    setOctagonAliasError('');

    const token = getCurrentAliasToken(value);
    if (aliasDebounceRef.current) clearTimeout(aliasDebounceRef.current);

    if (token.length >= 2 && !token.includes('#')) {
      aliasDebounceRef.current = setTimeout(() => {
        searchAliasPrefix({ variables: { prefix: token, limit: 8 } });
      }, 200);
    } else {
      setShowAliasSuggestions(false);
      setAliasSuggestions([]);
    }
  };

  const handleAliasSuggestionClick = (alias) => {
    const lastComma = octagonAliases.lastIndexOf(',');
    const before = lastComma >= 0 ? octagonAliases.slice(0, lastComma + 1) + ' ' : '';
    setOctagonAliases(before + alias);
    setShowAliasSuggestions(false);
    setAliasSuggestions([]);
  };

  const handleCreateOctagon = (e) => {
    e.preventDefault();
    if (!octagonTitle.trim() || !octagonInstruction.trim()) return;

    // Validate each alias: the part before '#' must be at least 2 characters
    const aliases = octagonAliases.split(',').map(a => a.trim()).filter(Boolean);
    for (const alias of aliases) {
      const hashIdx = alias.indexOf('#');
      const base = hashIdx >= 0 ? alias.slice(0, hashIdx) : alias;
      if (base.length < 2) {
        setOctagonAliasError(t('home.aliasBaseTooShort'));
        return;
      }
    }

    createOctagonBoard({
      variables: {
        title: octagonTitle,
        features: octagonFeatures.split(',').map(f => f.trim()).filter(Boolean),
        instruction: octagonInstruction,
        invitedAliases: aliases,
      },
    });
  };

  const handleToggleFavourite = (e, debateBoardID) => {
    e.stopPropagation();
    const currentlyFav = isEffectivelyFavourited(debateBoardID);
    setPendingFavChanges(prev => ({ ...prev, [debateBoardID]: !currentlyFav }));
    toggleFavourite({
      variables: { debateBoardID },
      onCompleted: () => {
        setPendingFavChanges(prev => {
          const next = { ...prev };
          delete next[debateBoardID];
          return next;
        });
        refetchFavs();
        refetchBoards();
      },
      onError: () => {
        setPendingFavChanges(prev => {
          const next = { ...prev };
          delete next[debateBoardID];
          return next;
        });
      },
    });
  };

  const handleToggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleCreateProposal = (e) => {
    e.preventDefault();
    if (!proposalTitle.trim() || !proposalDescription.trim()) return;
    const featuresArray = proposalFeatures.split(',').map(f => f.trim()).filter(Boolean);
    createProposal({
      variables: {
        title: proposalTitle,
        description: proposalDescription,
        features: featuresArray.length > 0 ? featuresArray : undefined,
        mode: viewMode !== 'octagon' ? viewMode : 'info',
      },
    });
  };

  const handleVoteProposal = (proposalID, voteType) => {
    voteOnProposal({ variables: { proposalID, voteType } });
  };

  const handleEditFeatures = (proposal) => {
    setEditingFeaturesProposalId(proposal.id);
    setEditFeaturesText((proposal.features || []).join(', '));
  };

  const handleSaveProposalFeatures = (proposalId) => {
    const features = editFeaturesText.split(',').map(f => f.trim()).filter(Boolean);
    updateProposalFeatures({ variables: { id: proposalId, features } });
  };

  const handleDeleteProposal = (proposalID) => {
    if (window.confirm(t('home.confirmDeleteProposal'))) {
      deleteProposal({ variables: { id: proposalID } });
    }
  };

  const handleAdminAdopt = (proposalID) => {
    if (window.confirm(t('home.confirmAdopt'))) {
      adminAdoptProposal({ variables: { id: proposalID } });
    }
  };

  const handleAdminReject = (proposalID) => {
    if (window.confirm(t('home.confirmReject'))) {
      adminRejectProposal({ variables: { id: proposalID } });
    }
  };

  const handleAddProposalArgument = (e, proposalID) => {
    e.preventDefault();
    if (!proposalArgText.trim()) return;
    addProposalArgument({
      variables: {
        proposalID,
        userID: user.id,
        userAlias: user.alias,
        content: proposalArgText,
      },
    });
  };

  const handleTranslateProposalField = async (proposalId, field, contentType) => {
    const key = `${proposalId}_${field}`;
    const current = proposalTranslations[key];

    if (current?.showing) {
      setProposalTranslations(prev => ({ ...prev, [key]: { ...prev[key], showing: false } }));
      return;
    }

    if (current?.text) {
      setProposalTranslations(prev => ({ ...prev, [key]: { ...prev[key], showing: true } }));
      return;
    }

    setProposalTranslations(prev => ({ ...prev, [key]: { loading: true, text: null, showing: false } }));
    try {
      const result = await translateContentMutation({
        variables: { contentType, contentID: proposalId, targetLanguage },
      });
      setProposalTranslations(prev => ({
        ...prev,
        [key]: { loading: false, text: result.data.translateContent.translatedText, showing: true },
      }));
    } catch (err) {
      console.error('Translation failed:', err);
      setProposalTranslations(prev => ({ ...prev, [key]: { loading: false, text: null, showing: false } }));
    }
  };

  // ========== Data ==========
  const favourites = favsData?.myFavourites || [];
  const boards = boardsData?.debateBoards || [];
  const modeBoards = boards.filter(b => b.mode === viewMode);
  // For OCTAGON! mode, further filter by octagon sub-tab status
  const octagonStatusMap = { initiating: 'pending', active: 'active', archived: 'archived' };
  const filteredBoards = viewMode === 'octagon'
    ? modeBoards.filter(b => b.octagonInfo?.status === octagonStatusMap[octagonTab])
    : modeBoards;
  // Tags relevant to the current mode only (derived from boards in this mode)
  const modeTags = useMemo(() => {
    const tagSet = new Set();
    modeBoards.forEach(b => (b.features || []).forEach(f => tagSet.add(f)));
    return Array.from(tagSet).sort();
  }, [modeBoards]);
  const proposals = proposalsData?.proposals || [];

  const isEffectivelyFavourited = (boardId) => {
    if (boardId in pendingFavChanges) return pendingFavChanges[boardId];
    if (favourites.some(f => f.debateBoardID === boardId)) return true;
    const board = boards.find(b => b.debateBoardID === boardId);
    return board?.isFavourited ?? false;
  };

  const effectiveFavourites = useMemo(() => {
    let result = favourites.filter(f =>
      !(f.debateBoardID in pendingFavChanges && !pendingFavChanges[f.debateBoardID])
    );
    for (const [boardId, isFav] of Object.entries(pendingFavChanges)) {
      if (isFav && !favourites.some(f => f.debateBoardID === boardId)) {
        const board = boards.find(b => b.debateBoardID === boardId);
        if (board) result = [board, ...result];
      }
    }
    return result;
  }, [favourites, pendingFavChanges, boards]);

  const AI_USER_ID = '00000000-0000-0000-0000-000000000001';

  const getUserArguments = (proposal) => {
    return (proposal.arguments || []).filter(arg => arg.userID !== AI_USER_ID);
  };

  const canVote = (proposal) => {
    if (proposal.status !== 'open') return false;
    if (proposal.userVote) return false;
    return true;
  };

  const filteredFavourites = effectiveFavourites.filter(f => f.mode === viewMode);
  const userId = user?.id;

  const boardsSectionTitle = viewMode === 'battle'
    ? t('home.battleBoards')
    : viewMode === 'octagon'
      ? t('home.thePits')
      : t('home.debateBoards');

  return (
    <div className={`home home-mode-${viewMode}`}>

      {/* ==================== MODE SWITCHER ==================== */}
      <div className="mode-switcher">
        {[
          { key: 'info',    labelKey: 'home.modeInfo',    descKey: 'home.modeInfoDesc' },
          { key: 'battle',  labelKey: 'home.modeBattle',  descKey: 'home.modeBattleDesc' },
          { key: 'octagon', labelKey: 'board.modeOctagon', descKey: 'home.modeOctagonDesc' },
        ].map(({ key, labelKey, descKey }) => (
          <button
            key={key}
            className={`mode-tab mode-tab-${key}${viewMode === key ? ' active' : ''}`}
            onClick={() => { setViewMode(key); setShowCreate(false); setShowOctagonCreate(false); setSelectedTags([]); }}
          >
            <span className="mode-tab-name">{t(labelKey)}</span>
            <span className="mode-tab-desc">{t(descKey)}</span>
          </button>
        ))}
      </div>

      {/* ==================== SECTION 1: My Favourites ==================== */}
      <section className="home-section">
        <div className="home-section-header">
          <h2>{t('home.myFavourites')}</h2>
        </div>
        {filteredFavourites.length === 0 ? (
          <div className="favourites-empty">
            {t('home.starToAdd')}
          </div>
        ) : (
          <div className="favourites-row">
            {filteredFavourites.map((board) => (
              <div
                key={board.debateBoardID}
                className="board-card fav-card"
                onClick={() => navigate(`/board/${board.debateBoardID}`)}
              >
                <button
                  className="board-card-star starred"
                  onClick={(e) => handleToggleFavourite(e, board.debateBoardID)}
                  title={t('home.removeFromFavourites')}
                >
                  &#9733;
                </button>
                {board.mode === 'octagon' && <span className="mode-badge-octagon">{t('board.modeOctagon')}</span>}
                {board.mode === 'battle' && <span className="mode-badge-battle">{t('board.modeBattle')}</span>}
                <h3>{board.title}</h3>
                <p className="board-preview">
                  {board.content ? board.content.substring(0, 100) + '...' : t('home.contentGenerating')}
                </p>
                {board.features && board.features.length > 0 && (
                  <div className="board-card-tags">
                    {board.features.map(f => <span key={f} className="tag-chip">{tTag(f)}</span>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ==================== SECTION 2: Debate Boards ==================== */}
      <section className="home-section">
        <div className="home-section-header">
          <h2>{boardsSectionTitle}</h2>
          <div className="home-section-controls">
            <input
              type="text"
              placeholder={t('home.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            {isAdmin && viewMode !== 'octagon' && (
              <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
                {showCreate ? t('home.cancel') : t('home.newBoard')}
              </button>
            )}
          </div>
        </div>

        {modeTags.length > 0 && (
          <div className="tag-filter-bar">
            {modeTags.map(tag => (
              <button
                key={tag}
                className={`tag-pill ${selectedTags.includes(tag) ? 'active' : ''}`}
                onClick={() => handleToggleTag(tag)}
              >
                {tTag(tag)}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button className="tag-pill tag-pill-clear" onClick={() => setSelectedTags([])}>
                {t('home.clear')}
              </button>
            )}
          </div>
        )}

        {isAdmin && showCreate && (
          <form className="create-form" onSubmit={handleCreate}>
            <input
              type="text"
              placeholder={t('home.boardTitlePlaceholder')}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              required
            />
            <textarea
              placeholder={t('home.boardInstructionPlaceholder')}
              value={newInstruction}
              onChange={(e) => setNewInstruction(e.target.value)}
              rows={3}
              required
            />
            <input
              type="text"
              placeholder={t('home.boardFeaturesPlaceholder')}
              value={newFeatures}
              onChange={(e) => setNewFeatures(e.target.value)}
            />
            <button type="submit" className="btn-primary" disabled={creating}>
              {creating ? t('home.creating') : t('home.createBoard')}
            </button>
          </form>
        )}

        {/* OCTAGON! board creation — visible to all in octagon mode, disabled if ineligible */}
        {viewMode === 'octagon' && user && (
          <div className="octagon-create-section">
            <button
              className="btn-octagon"
              disabled={!isOctagonEligible}
              title={!isOctagonEligible ? t('home.octagonNotEligible') : undefined}
              onClick={() => isOctagonEligible && setShowOctagonCreate(!showOctagonCreate)}
            >
              {showOctagonCreate ? t('home.cancel') : t('home.createOctagonBtn')}
            </button>
            {!isOctagonEligible && (
              <p className="octagon-ineligible-hint">{t('home.octagonNotEligible')}</p>
            )}
            {showOctagonCreate && isOctagonEligible && (
              <form className="create-form" onSubmit={handleCreateOctagon}>
                <input
                  type="text"
                  placeholder={t('home.boardTitlePlaceholder')}
                  value={octagonTitle}
                  onChange={(e) => setOctagonTitle(e.target.value)}
                  required
                />
                <textarea
                  placeholder={t('home.boardInstructionPlaceholder')}
                  value={octagonInstruction}
                  onChange={(e) => setOctagonInstruction(e.target.value)}
                  rows={3}
                  required
                />
                <input
                  type="text"
                  placeholder={t('home.boardFeaturesPlaceholder')}
                  value={octagonFeatures}
                  onChange={(e) => setOctagonFeatures(e.target.value)}
                />
                <div className="alias-autocomplete-wrapper">
                  <textarea
                    placeholder={t('home.octagonAliases')}
                    value={octagonAliases}
                    onChange={handleOctagonAliasesChange}
                    onBlur={() => setTimeout(() => setShowAliasSuggestions(false), 150)}
                    rows={2}
                  />
                  {showAliasSuggestions && (
                    <div className="alias-suggestions">
                      {aliasSuggestions.map((alias) => (
                        <div
                          key={alias}
                          className="alias-suggestion-item"
                          onMouseDown={() => handleAliasSuggestionClick(alias)}
                        >
                          {alias}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {octagonAliasError && <p className="auth-error">{octagonAliasError}</p>}
                <button type="submit" className="btn-octagon" disabled={creatingOctagon}>
                  {creatingOctagon ? t('home.creating') : t('home.createOctagonBtn')}
                </button>
              </form>
            )}
          </div>
        )}

        {/* OCTAGON! sub-tabs: Initiating / Active / Archived */}
        {viewMode === 'octagon' && (
          <div className="octagon-tabs">
            {[
              { key: 'initiating', label: t('home.octagonInitiating') },
              { key: 'active',     label: t('home.octagonActive') },
              { key: 'archived',   label: t('home.octagonArchived') },
            ].map(({ key, label }) => (
              <button
                key={key}
                className={`octagon-tab${octagonTab === key ? ' active' : ''}`}
                onClick={() => setOctagonTab(key)}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {boardsLoading && <div className="loading">{t('home.loadingBoards')}</div>}
        {boardsError && <div className="error">Error: {boardsError.message}</div>}

        <div className="boards-grid">
          {filteredBoards.map((board) => (
            <div
              key={board.debateBoardID}
              className="board-card"
              onClick={() => navigate(`/board/${board.debateBoardID}`)}
            >
              <button
                className={`board-card-star ${isEffectivelyFavourited(board.debateBoardID) ? 'starred' : ''}`}
                onClick={(e) => handleToggleFavourite(e, board.debateBoardID)}
                title={isEffectivelyFavourited(board.debateBoardID) ? t('home.removeFromFavourites') : t('home.addToFavourites')}
              >
                {isEffectivelyFavourited(board.debateBoardID) ? '\u2605' : '\u2606'}
              </button>
              {board.mode === 'octagon' && <span className="mode-badge-octagon">{t('board.modeOctagon')}</span>}
              {board.mode === 'battle' && <span className="mode-badge-battle">{t('board.modeBattle')}</span>}
              <h3>{board.title}</h3>
              <p className="board-preview">
                {board.content ? board.content.substring(0, 150) + '...' : t('home.contentGenerating')}
              </p>
              {board.features && board.features.length > 0 && (
                <div className="board-card-tags">
                  {board.features.map(f => <span key={f} className="tag-chip">{tTag(f)}</span>)}
                </div>
              )}
              {/* Vote-to-close for active OCTAGON! boards where user is an accepted fighter */}
              {board.mode === 'octagon' && board.octagonInfo?.status === 'active' &&
               board.octagonInfo?.acceptedUserIDs?.includes(userId) && (
                <div className="octagon-close-vote" onClick={e => e.stopPropagation()}>
                  <button
                    className="btn-close-vote"
                    disabled={board.octagonInfo.closeVoteUserIDs?.includes(userId)}
                    onClick={() => voteToCloseOctagon({ variables: { boardID: board.debateBoardID } })}
                  >
                    {board.octagonInfo.closeVoteUserIDs?.includes(userId)
                      ? t('home.closedVoted')
                      : t('home.voteToClose')}
                  </button>
                  <span>{board.octagonInfo.closeVoteUserIDs?.length || 0}/{board.octagonInfo.acceptedUserIDs?.length} {t('home.closeVotes')}</span>
                </div>
              )}
              <div className="board-meta">
                <span className="date">
                  {new Date(board.createdAt).toLocaleDateString()}
                </span>
                {board.updatedAt !== board.createdAt && (
                  <span className="updated">
                    {t('board.updated')} {new Date(board.updatedAt).toLocaleDateString()}
                  </span>
                )}
                {isAdmin && board.mode !== 'octagon' && (
                  <button
                    className="btn-admin btn-small"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateBoardMode({
                        variables: {
                          boardID: board.debateBoardID,
                          mode: board.mode === 'info' ? 'battle' : 'info',
                        },
                      });
                    }}
                  >
                    {board.mode === 'info' ? t('home.moveToBattle') : t('home.moveToInfo')}
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredBoards.length === 0 && !boardsLoading && (
            <div className="empty-state">
              <p>{t('home.noBoards')}</p>
            </div>
          )}
        </div>
      </section>

      {/* ==================== SECTION 3: Proposals (info + battle modes) ==================== */}
      {viewMode !== 'octagon' && <section className="home-section">
        <div className="home-section-header">
          <h2>{t('home.proposals')}</h2>
          {user && (
            <button
              className="btn-primary"
              onClick={() => setShowProposalForm(!showProposalForm)}
            >
              {showProposalForm ? t('home.cancel') : t('home.proposeNewBoard')}
            </button>
          )}
        </div>

        {showProposalForm && (
          <form className="proposal-form" onSubmit={handleCreateProposal}>
            <input
              type="text"
              placeholder={t('home.proposalTitlePlaceholder')}
              value={proposalTitle}
              onChange={(e) => setProposalTitle(e.target.value)}
              required
            />
            <textarea
              placeholder={t('home.proposalDescPlaceholder')}
              value={proposalDescription}
              onChange={(e) => setProposalDescription(e.target.value)}
              rows={4}
              required
            />
            <input
              type="text"
              placeholder={t('home.boardFeaturesPlaceholder')}
              value={proposalFeatures}
              onChange={(e) => setProposalFeatures(e.target.value)}
            />
            {proposalError && (
              <p className="auth-error">{proposalError.message}</p>
            )}
            <button type="submit" className="btn-primary" disabled={creatingProposal}>
              {creatingProposal ? t('home.submitting') : t('home.submitProposal')}
            </button>
          </form>
        )}

        <div className="proposal-tabs">
          <button
            className={`proposal-tab ${proposalTab === 'active' ? 'active' : ''}`}
            onClick={() => setProposalTab('active')}
          >
            {t('home.active')}
          </button>
          <button
            className={`proposal-tab ${proposalTab === 'adopted' ? 'active' : ''}`}
            onClick={() => setProposalTab('adopted')}
          >
            {t('home.adopted')}
          </button>
          <button
            className={`proposal-tab ${proposalTab === 'rejected' ? 'active' : ''}`}
            onClick={() => setProposalTab('rejected')}
          >
            {t('home.rejected')}
          </button>
        </div>

        {proposalsLoading && <div className="loading">{t('home.loadingProposals')}</div>}

        <div className="proposals-list">
          {proposals.map((proposal) => (
            <div key={proposal.id} className="proposal-card">
              <div className="proposal-card-header">
                <div className="proposal-card-title-area">
                  <h3>{proposal.title}</h3>
                  <span className="proposal-author">
                    by {proposal.userAlias || 'Anonymous'} &middot; {new Date(proposal.createdAt).toLocaleDateString()}
                  </span>
                  {(proposal.features && proposal.features.length > 0 || isAdmin) && (
                    <div className="board-card-tags">
                      {(proposal.features || []).map(f => <span key={f} className="tag-chip">{tTag(f)}</span>)}
                      {isAdmin && editingFeaturesProposalId === proposal.id ? (
                        <span className="inline-features-edit">
                          <input
                            type="text"
                            value={editFeaturesText}
                            onChange={(e) => setEditFeaturesText(e.target.value)}
                            placeholder="tag1, tag2, ..."
                            className="features-edit-input"
                            autoFocus
                          />
                          <button className="btn-admin btn-small" onClick={() => handleSaveProposalFeatures(proposal.id)}>&#10003;</button>
                          <button className="btn-secondary btn-small" onClick={() => setEditingFeaturesProposalId(null)}>&#10005;</button>
                        </span>
                      ) : isAdmin && (
                        <button className="btn-edit-tags" onClick={() => handleEditFeatures(proposal)} title="Edit features">&#9998;</button>
                      )}
                    </div>
                  )}
                </div>
                <div className="proposal-card-badges">
                  {proposal.aiRecommendation && (
                    <span className={`ai-recommendation-stamp ${
                      proposal.aiRecommendation === 'adopt'
                        ? 'ai-recommendation-adopt'
                        : 'ai-recommendation-reject'
                    }`}>
                      {proposal.aiRecommendation === 'adopt'
                        ? t('home.recommendAdopt')
                        : t('home.recommendReject')}
                    </span>
                  )}
                  {proposal.status === 'pending_review' && (
                    <span className="proposal-status-badge pending">{t('home.aiReviewing')}</span>
                  )}
                  {isAdmin && (
                    <div className="admin-proposal-actions">
                      {proposal.status !== 'adopted' && (
                        <button
                          className="btn-admin btn-admin-adopt"
                          onClick={() => handleAdminAdopt(proposal.id)}
                          title={`Admin: ${t('home.adopt')}`}
                        >
                          {t('home.adopt')}
                        </button>
                      )}
                      {proposal.status !== 'rejected' && proposal.status !== 'adopted' && (
                        <button
                          className="btn-admin btn-admin-reject"
                          onClick={() => handleAdminReject(proposal.id)}
                          title={`Admin: ${t('home.reject')}`}
                        >
                          {t('home.reject')}
                        </button>
                      )}
                      <button
                        className="btn-admin btn-admin-delete"
                        onClick={() => handleDeleteProposal(proposal.id)}
                        title={`Admin: ${t('home.delete')}`}
                      >
                        {t('home.delete')}
                      </button>
                      <button
                        className="btn-admin btn-small"
                        onClick={() => updateProposalMode({
                          variables: {
                            proposalID: proposal.id,
                            mode: proposal.mode === 'info' ? 'battle' : 'info',
                          },
                        })}
                      >
                        {proposal.mode === 'info' ? t('home.moveToBattle') : t('home.moveToInfo')}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="proposal-description-area">
                <p className="proposal-description">
                  {proposalTranslations[`${proposal.id}_desc`]?.showing
                    ? proposalTranslations[`${proposal.id}_desc`].text
                    : proposal.description}
                </p>
                <button
                  className={`btn-translate-inline ${proposalTranslations[`${proposal.id}_desc`]?.showing ? 'active' : ''}`}
                  onClick={() => handleTranslateProposalField(proposal.id, 'desc', 'proposal_desc')}
                  disabled={proposalTranslations[`${proposal.id}_desc`]?.loading}
                >
                  {proposalTranslations[`${proposal.id}_desc`]?.loading
                    ? t('translating')
                    : proposalTranslations[`${proposal.id}_desc`]?.showing
                      ? t('showOriginal')
                      : t('translate')}
                </button>
              </div>

              {proposal.aiFeedback && (
                <div className="ai-feedback-section">
                  <div className="ai-feedback-label">
                    <span className="ai-sparkle">&#10024;</span> {t('home.aiFeedback')}
                    <button
                      className={`btn-translate-inline ${proposalTranslations[`${proposal.id}_feedback`]?.showing ? 'active' : ''}`}
                      onClick={() => handleTranslateProposalField(proposal.id, 'feedback', 'proposal_feedback')}
                      disabled={proposalTranslations[`${proposal.id}_feedback`]?.loading}
                    >
                      {proposalTranslations[`${proposal.id}_feedback`]?.loading
                        ? t('translating')
                        : proposalTranslations[`${proposal.id}_feedback`]?.showing
                          ? t('showOriginal')
                          : t('translate')}
                    </button>
                  </div>
                  <p className="ai-feedback-text">
                    {proposalTranslations[`${proposal.id}_feedback`]?.showing
                      ? proposalTranslations[`${proposal.id}_feedback`].text
                      : proposal.aiFeedback}
                  </p>
                </div>
              )}

              <div className="proposal-card-footer">
                <div className="proposal-vote-area">
                  {proposal.status === 'open' && (
                    <>
                      <button
                        className={`proposal-vote-btn proposal-vote-for ${proposal.userVote === 'for' ? 'proposal-voted-for' : ''}`}
                        onClick={() => handleVoteProposal(proposal.id, 'for')}
                        disabled={!canVote(proposal)}
                        title={proposal.userVote ? t('home.alreadyVoted') : t('home.voteFor')}
                      >
                        {proposal.userVote === 'for' ? `\u2713 ${t('home.for')}` : `\u2191 ${t('home.for')}`}
                      </button>
                      <span className="proposal-vote-count">{proposal.votesFor}</span>
                      <button
                        className={`proposal-vote-btn proposal-vote-against ${proposal.userVote === 'against' ? 'proposal-voted-against' : ''}`}
                        onClick={() => handleVoteProposal(proposal.id, 'against')}
                        disabled={!canVote(proposal)}
                        title={proposal.userVote ? t('home.alreadyVoted') : t('home.voteAgainst')}
                      >
                        {proposal.userVote === 'against' ? `\u2713 ${t('home.against')}` : `\u2193 ${t('home.against')}`}
                      </button>
                      <span className="proposal-vote-count">{proposal.votesAgainst}</span>
                    </>
                  )}
                  {proposal.status === 'adopted' && proposal.createdDebateBoardID && (
                    <button
                      className="btn-secondary btn-small"
                      onClick={() => navigate(`/board/${proposal.createdDebateBoardID}`)}
                    >
                      {t('home.viewBoard')} &rarr;
                    </button>
                  )}
                </div>
                <button
                  className="btn-link"
                  onClick={() => setExpandedProposal(
                    expandedProposal === proposal.id ? null : proposal.id
                  )}
                >
                  {expandedProposal === proposal.id ? t('home.hideDiscussion') : `${t('home.discussion')} (${getUserArguments(proposal).length})`}
                </button>
              </div>

              {expandedProposal === proposal.id && (
                <div className="proposal-discussion">
                  {proposal.status === 'open' && (
                    <form
                      className="proposal-arg-form"
                      onSubmit={(e) => handleAddProposalArgument(e, proposal.id)}
                    >
                      <textarea
                        placeholder={t('home.addArgPlaceholder')}
                        value={proposalArgText}
                        onChange={(e) => setProposalArgText(e.target.value)}
                        rows={2}
                        required
                      />
                      <button type="submit" className="btn-primary btn-small">
                        {t('home.submit')}
                      </button>
                    </form>
                  )}
                  <ArgumentList
                    arguments={getUserArguments(proposal)}
                    onVote={() => {}}
                    onDelete={() => {}}
                    currentUserId={user.id}
                    isAdmin={isAdmin}
                  />
                </div>
              )}
            </div>
          ))}
          {proposals.length === 0 && !proposalsLoading && (
            <div className="empty-state">
              <p>
                {proposalTab === 'active'
                  ? t('home.noActiveProposals')
                  : proposalTab === 'adopted'
                    ? t('home.noAdoptedProposals')
                    : t('home.noRejectedProposals')}
              </p>
            </div>
          )}
        </div>
      </section>}
    </div>
  );
}
