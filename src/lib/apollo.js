import { ApolloClient, InMemoryCache, HttpLink, split } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { getMainDefinition } from '@apollo/client/utilities';
import { createClient } from 'graphql-ws';

const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('authToken');
  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

// Clear stale session when the server rejects our token
const authErrorLink = onError(({ graphQLErrors }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      if (
        err.message === 'unauthorized: authentication required' ||
        err.message === 'unauthorized'
      ) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        window.location.href = '/login';
        break;
      }
    }
  }
});

const debateBoardApiUrl = import.meta.env.VITE_DEBATE_BOARD_API_URL || 'http://localhost:8080/query';
const debateBoardWsUrl = import.meta.env.VITE_DEBATE_BOARD_WS_URL || 'ws://localhost:8080/query';

const httpLink = new HttpLink({
  uri: debateBoardApiUrl,
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: debateBoardWsUrl,
  })
);

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  authErrorLink.concat(authLink.concat(httpLink))
);

export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

// Separate client for user-service (auth operations)
const userServiceApiUrl = import.meta.env.VITE_USER_SERVICE_API_URL || 'http://localhost:8081/query';
const userHttpLink = new HttpLink({
  uri: userServiceApiUrl,
});

export const userServiceClient = new ApolloClient({
  link: authLink.concat(userHttpLink),
  cache: new InMemoryCache(),
});
