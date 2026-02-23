import { gql } from '@apollo/client';

export const GET_DEBATE_BOARD = gql`
  query GetDebateBoard($id: ID!) {
    debateBoard(id: $id) {
      debateBoardID
      title
      content
      features
      isFavourited
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
  mutation CreateDebateBoard($title: String!, $features: [String!]!, $instruction: String!) {
    createDebateBoard(title: $title, features: $features, instruction: $instruction)
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
  query GetProposals($status: String) {
    proposals(status: $status) {
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
  mutation CreateProposal($title: String!, $description: String!, $features: [String!]) {
    createProposal(title: $title, description: $description, features: $features) {
      id
      title
      features
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
