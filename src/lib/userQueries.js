import { gql } from '@apollo/client';

// Step 1: user submits their email only.
export const REGISTER = gql`
  mutation Register($email: String!) {
    register(email: $email)
  }
`;

// Step 2: user clicks the link, then submits alias + password.
export const COMPLETE_REGISTRATION = gql`
  mutation CompleteRegistration($token: String!, $alias: String!, $password: String!) {
    completeRegistration(token: $token, alias: $alias, password: $password) {
      token
      user {
        id
        email
        alias
        role
        contributionScore
        battlePoints
        createdAt
      }
    }
  }
`;

export const LOGIN = gql`
  mutation Login($email: String!, $password: String!) {
    login(email: $email, password: $password) {
      token
      user {
        id
        email
        alias
        role
        contributionScore
        battlePoints
        createdAt
      }
    }
  }
`;

export const ME = gql`
  query Me {
    me {
      id
      email
      alias
      role
      contributionScore
      battlePoints
      createdAt
    }
  }
`;

// Public profile of any user (no email).
export const GET_PUBLIC_USER = gql`
  query GetPublicUser($userID: ID!) {
    getUser(userID: $userID) {
      id
      alias
      role
      contributionScore
      battlePoints
      createdAt
    }
  }
`;

// How many days until the logged-in user can change alias again (0 = can change now).
export const GET_ALIAS_COOLDOWN = gql`
  query AliasChangeCooldown {
    aliasChangeCooldown
  }
`;

// Request a password-change email (requires auth).
export const REQUEST_PASSWORD_CHANGE = gql`
  mutation RequestPasswordChange {
    requestPasswordChange
  }
`;

// Verify email token and set new password (no auth required — token is the credential).
export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($token: String!, $newPassword: String!) {
    changePassword(token: $token, newPassword: $newPassword)
  }
`;

// Change alias (requires auth, 30-day cooldown enforced by server).
export const CHANGE_ALIAS = gql`
  mutation ChangeAlias($newAliasBase: String!) {
    changeAlias(newAliasBase: $newAliasBase) {
      newAlias
      daysUntilNextChange
    }
  }
`;

// Autocomplete: find full aliases matching a prefix.
export const SEARCH_USERS_BY_ALIAS_PREFIX = gql`
  query SearchUsersByAliasPrefix($prefix: String!, $limit: Int) {
    searchUsersByAliasPrefix(prefix: $prefix, limit: $limit)
  }
`;
