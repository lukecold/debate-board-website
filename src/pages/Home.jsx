import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import { useNavigate } from 'react-router-dom';
import {
  GET_DEBATE_BOARDS,
  GET_MY_FAVOURITES,
  GET_ALL_TAGS,
  GET_PROPOSALS,
  CREATE_DEBATE_BOARD,
  CREATE_PROPOSAL,
  TOGGLE_FAVOURITE,
  VOTE_ON_PROPOSAL,
  ADD_PROPOSAL_ARGUMENT,
  DELETE_PROPOSAL,
  ADMIN_ADOPT_PROPOSAL,
  ADMIN_REJECT_PROPOSAL,
  TRANSLATE_CONTENT,
} from '../lib/queries';
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
  const [proposalTab, setProposalTab] = useState('active');
  const [showProposalForm, setShowProposalForm] = useState(false);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [expandedProposal, setExpandedProposal] = useState(null);
  const [proposalArgText, setProposalArgText] = useState('');

  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, tTag, language, targetLanguage } = useLanguage();
  const isAdmin = user?.isAdmin;

  // Proposal translation state: map keyed by `${proposalId}_${field}`
  const [proposalTranslations, setProposalTranslations] = useState({});

  // ========== Data Queries ==========
  const { data: boardsData, loading: boardsLoading, error: boardsError, refetch: refetchBoards } = useQuery(GET_DEBATE_BOARDS, {
    variables: { search: search || undefined, tags: selectedTags.length > 0 ? selectedTags : undefined },
  });

  const { data: favsData, refetch: refetchFavs } = useQuery(GET_MY_FAVOURITES);

  const { data: tagsData } = useQuery(GET_ALL_TAGS);

  const { data: proposalsData, loading: proposalsLoading, refetch: refetchProposals } = useQuery(GET_PROPOSALS, {
    variables: { status: proposalTab === 'active' ? 'open' : proposalTab },
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

  const [toggleFavourite] = useMutation(TOGGLE_FAVOURITE, {
    onCompleted: () => {
      refetchFavs();
      refetchBoards();
    },
  });

  const [createProposal, { loading: creatingProposal }] = useMutation(CREATE_PROPOSAL, {
    onCompleted: () => {
      setShowProposalForm(false);
      setProposalTitle('');
      setProposalDescription('');
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

  const [translateContentMutation] = useMutation(TRANSLATE_CONTENT);

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
      },
    });
  };

  const handleToggleFavourite = (e, debateBoardID) => {
    e.stopPropagation();
    toggleFavourite({ variables: { debateBoardID } });
  };

  const handleToggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleCreateProposal = (e) => {
    e.preventDefault();
    if (!proposalTitle.trim() || !proposalDescription.trim()) return;
    createProposal({
      variables: { title: proposalTitle, description: proposalDescription },
    });
  };

  const handleVoteProposal = (proposalID, voteType) => {
    voteOnProposal({ variables: { proposalID, voteType } });
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
  const allTags = tagsData?.allTags || [];
  const proposals = proposalsData?.proposals || [];

  const AI_USER_ID = '00000000-0000-0000-0000-000000000001';

  const getUserArguments = (proposal) => {
    return (proposal.arguments || []).filter(arg => arg.userID !== AI_USER_ID);
  };

  const canVote = (proposal) => {
    if (proposal.status !== 'open') return false;
    if (proposal.userVote) return false;
    return true;
  };

  return (
    <div className="home">
      {/* ==================== SECTION 1: My Favourites ==================== */}
      <section className="home-section">
        <div className="home-section-header">
          <h2>{t('home.myFavourites')}</h2>
        </div>
        {favourites.length === 0 ? (
          <div className="favourites-empty">
            {t('home.starToAdd')}
          </div>
        ) : (
          <div className="favourites-row">
            {favourites.map((board) => (
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
          <h2>{t('home.debateBoards')}</h2>
          <div className="home-section-controls">
            <input
              type="text"
              placeholder={t('home.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
            {isAdmin && (
              <button className="btn-primary" onClick={() => setShowCreate(!showCreate)}>
                {showCreate ? t('home.cancel') : t('home.newBoard')}
              </button>
            )}
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="tag-filter-bar">
            {allTags.map(tag => (
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

        {boardsLoading && <div className="loading">{t('home.loadingBoards')}</div>}
        {boardsError && <div className="error">Error: {boardsError.message}</div>}

        <div className="boards-grid">
          {boards.map((board) => (
            <div
              key={board.debateBoardID}
              className="board-card"
              onClick={() => navigate(`/board/${board.debateBoardID}`)}
            >
              <button
                className={`board-card-star ${board.isFavourited ? 'starred' : ''}`}
                onClick={(e) => handleToggleFavourite(e, board.debateBoardID)}
                title={board.isFavourited ? t('home.removeFromFavourites') : t('home.addToFavourites')}
              >
                {board.isFavourited ? '\u2605' : '\u2606'}
              </button>
              <h3>{board.title}</h3>
              <p className="board-preview">
                {board.content ? board.content.substring(0, 150) + '...' : t('home.contentGenerating')}
              </p>
              {board.features && board.features.length > 0 && (
                <div className="board-card-tags">
                  {board.features.map(f => <span key={f} className="tag-chip">{tTag(f)}</span>)}
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
              </div>
            </div>
          ))}
          {boards.length === 0 && !boardsLoading && (
            <div className="empty-state">
              <p>{t('home.noBoards')}</p>
            </div>
          )}
        </div>
      </section>

      {/* ==================== SECTION 3: Proposals ==================== */}
      <section className="home-section">
        <div className="home-section-header">
          <h2>{t('home.proposals')}</h2>
          <button
            className="btn-primary"
            onClick={() => setShowProposalForm(!showProposalForm)}
          >
            {showProposalForm ? t('home.cancel') : t('home.proposeNewBoard')}
          </button>
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
      </section>
    </div>
  );
}
