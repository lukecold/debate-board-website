import { gql } from '@apollo/client';

export const GET_DEBATE_BOARD = gql`
  query GetDebateBoard($id: ID!) {
    debateBoard(id: $id) {
      debateBoardID
      title
      content
      features
      isFavourited
      mode
      octagonInfo {
        octagonID
        status
        pendingUserIDs
        acceptedUserIDs
        rejectedUserIDs
      }
      arguments {
        id
        userID
        userAlias
        content
        votes
        features
        parentArgumentID
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_DEBATE_BOARDS = gql`
  query GetDebateBoards($search: String, $tags: [String!]) {
    debateBoards(search: $search, tags: $tags) {
      debateBoardID
      title
      content
      features
      isFavourited
      mode
      octagonInfo {
        octagonID
        status
        pendingUserIDs
        acceptedUserIDs
        rejectedUserIDs
        closeVoteUserIDs
      }
      createdAt
      updatedAt
    }
  }
`;

export const GET_MY_FAVOURITES = gql`
  query GetMyFavourites {
    myFavourites {
      debateBoardID
      title
      content
      features
      isFavourited
      mode
      createdAt
      updatedAt
    }
  }
`;

export const GET_ALL_TAGS = gql`
  query GetAllTags {
    allTags
  }
`;

export const TOGGLE_FAVOURITE = gql`
  mutation ToggleFavourite($debateBoardID: ID!) {
    toggleFavourite(debateBoardID: $debateBoardID)
  }
`;

export const CREATE_DEBATE_BOARD = gql`
  mutation CreateDebateBoard($title: String!, $features: [String!]!, $instruction: String!, $mode: BoardMode) {
    createDebateBoard(title: $title, features: $features, instruction: $instruction, mode: $mode)
  }
`;

export const CREATE_OCTAGON_BOARD = gql`
  mutation CreateOctagonBoard($title: String!, $features: [String!]!, $instruction: String!, $invitedAliases: [String!]!) {
    createOctagonBoard(title: $title, features: $features, instruction: $instruction, invitedAliases: $invitedAliases)
  }
`;

export const RESPOND_TO_OCTAGON_INVITE = gql`
  mutation RespondToOctagonInvite($boardID: ID!, $accept: Boolean!) {
    respondToOctagonInvite(boardID: $boardID, accept: $accept)
  }
`;

export const VOTE_TO_CLOSE_OCTAGON = gql`
  mutation VoteToCloseOctagon($boardID: ID!) {
    voteToCloseOctagon(boardID: $boardID)
  }
`;

export const GET_MY_OCTAGON_INVITES = gql`
  query GetMyOctagonInvites {
    myOctagonInvites {
      boardID
      boardTitle
      octagonID
    }
  }
`;

export const UPDATE_DEBATE_BOARD = gql`
  mutation UpdateDebateBoard($id: ID!, $title: String, $instruction: String) {
    updateDebateBoard(id: $id, title: $title, instruction: $instruction)
  }
`;

export const ADD_ARGUMENT = gql`
  mutation AddArgument($debateBoardID: ID!, $userID: ID!, $userAlias: String!, $content: String!) {
    addArgument(debateBoardID: $debateBoardID, userID: $userID, userAlias: $userAlias, content: $content) {
      id
      userID
      userAlias
      content
      votes
      features
      parentArgumentID
      createdAt
    }
  }
`;

export const VOTE = gql`
  mutation Vote($argumentID: ID!, $userID: ID!, $voteType: VoteType!) {
    vote(argumentID: $argumentID, userID: $userID, voteType: $voteType) {
      userID
      argumentID
      voteType
      createdAt
    }
  }
`;

export const DEBATE_BOARD_UPDATED = gql`
  subscription DebateBoardUpdated($debateBoardID: ID!) {
    debateBoardUpdated(debateBoardID: $debateBoardID) {
      debateBoardID
      title
      content
      features
      isFavourited
      mode
      arguments {
        id
        userID
        userAlias
        content
        votes
        features
        parentArgumentID
        createdAt
      }
      createdAt
      updatedAt
    }
  }
`;

export const DELETE_DEBATE_BOARD = gql`
  mutation DeleteDebateBoard($id: ID!) {
    deleteDebateBoard(id: $id)
  }
`;

export const ARGUMENT_ADDED = gql`
  subscription ArgumentAdded($debateBoardID: ID!) {
    argumentsAddedToBoard(debateBoardID: $debateBoardID) {
      id
      userID
      userAlias
      content
      votes
      features
      parentArgumentID
      createdAt
    }
  }
`;

export const DELETE_ARGUMENT = gql`
  mutation DeleteArgument($id: ID!) {
    deleteArgument(id: $id)
  }
`;

// ========== Proposals ==========

export const GET_PROPOSALS = gql`
  query GetProposals($status: String, $mode: BoardMode) {
    proposals(status: $status, mode: $mode) {
      id
      userID
      userAlias
      title
      description
      features
      mode
      status
      aiFeedback
      aiRecommendation
      votesFor
      votesAgainst
      userVote
      arguments {
        id
        userID
        userAlias
        content
        votes
        features
        parentArgumentID
        createdAt
      }
      createdDebateBoardID
      createdAt
    }
  }
`;

export const GET_PROPOSAL = gql`
  query GetProposal($id: ID!) {
    proposal(id: $id) {
      id
      userID
      userAlias
      title
      description
      features
      status
      aiFeedback
      aiRecommendation
      votesFor
      votesAgainst
      userVote
      arguments {
        id
        userID
        userAlias
        content
        votes
        features
        parentArgumentID
        createdAt
      }
      createdDebateBoardID
      createdAt
    }
  }
`;

export const CREATE_PROPOSAL = gql`
  mutation CreateProposal($title: String!, $description: String!, $features: [String!], $mode: BoardMode) {
    createProposal(title: $title, description: $description, features: $features, mode: $mode) {
      id
      title
      features
      mode
      status
    }
  }
`;

export const VOTE_ON_PROPOSAL = gql`
  mutation VoteOnProposal($proposalID: ID!, $voteType: String!) {
    voteOnProposal(proposalID: $proposalID, voteType: $voteType)
  }
`;

export const DELETE_PROPOSAL = gql`
  mutation DeleteProposal($id: ID!) {
    deleteProposal(id: $id)
  }
`;

export const ADMIN_ADOPT_PROPOSAL = gql`
  mutation AdminAdoptProposal($id: ID!) {
    adminAdoptProposal(id: $id)
  }
`;

export const ADMIN_REJECT_PROPOSAL = gql`
  mutation AdminRejectProposal($id: ID!) {
    adminRejectProposal(id: $id)
  }
`;

export const ADD_PROPOSAL_ARGUMENT = gql`
  mutation AddProposalArgument($proposalID: ID!, $userID: ID!, $userAlias: String!, $content: String!) {
    addProposalArgument(proposalID: $proposalID, userID: $userID, userAlias: $userAlias, content: $content) {
      id
      content
      createdAt
    }
  }
`;

export const UPDATE_PROPOSAL_FEATURES = gql`
  mutation UpdateProposalFeatures($id: ID!, $features: [String!]!) {
    updateProposalFeatures(id: $id, features: $features)
  }
`;

export const UPDATE_DEBATE_BOARD_FEATURES = gql`
  mutation UpdateDebateBoardFeatures($id: ID!, $features: [String!]!) {
    updateDebateBoardFeatures(id: $id, features: $features)
  }
`;

export const UPDATE_BOARD_MODE = gql`
  mutation UpdateBoardMode($boardID: ID!, $mode: BoardMode!) {
    updateBoardMode(boardID: $boardID, mode: $mode)
  }
`;

export const UPDATE_PROPOSAL_MODE = gql`
  mutation UpdateProposalMode($proposalID: ID!, $mode: BoardMode!) {
    updateProposalMode(proposalID: $proposalID, mode: $mode)
  }
`;

// ========== Translation ==========

export const TRANSLATE_CONTENT = gql`
  mutation TranslateContent($contentType: String!, $contentID: ID!, $targetLanguage: String!) {
    translateContent(contentType: $contentType, contentID: $contentID, targetLanguage: $targetLanguage) {
      translatedText
      fromCache
    }
  }
`;

export const RETRANSLATE_CONTENT = gql`
  mutation RetranslateContent($contentType: String!, $contentID: ID!, $targetLanguage: String!, $previousTranslation: String!, $comment: String!) {
    retranslateContent(contentType: $contentType, contentID: $contentID, targetLanguage: $targetLanguage, previousTranslation: $previousTranslation, comment: $comment) {
      translatedText
      fromCache
    }
  }
`;

// ========== User Activity ==========

export const GET_USER_ACTIVITY = gql`
  query GetUserActivity($userID: ID!) {
    getUserActivity(userID: $userID) {
      arguments {
        id
        userID
        userAlias
        content
        votes
        features
        parentArgumentID
        createdAt
      }
      proposals {
        id
        userID
        userAlias
        title
        description
        features
        status
        aiFeedback
        aiRecommendation
        votesFor
        votesAgainst
        createdDebateBoardID
        createdAt
      }
      boards {
        debateBoardID
        title
        content
        features
        isFavourited
        mode
        createdAt
        updatedAt
      }
      argumentVotes {
        argumentID
        voteType
        createdAt
      }
      proposalVotes {
        proposalID
        voteType
        createdAt
      }
    }
  }
`;

export const CHECK_OCTAGON_ELIGIBILITY = gql`
  query CheckOctagonEligibility {
    checkOctagonEligibility
  }
`;
