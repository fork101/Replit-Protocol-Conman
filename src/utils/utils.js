import { lightfetch } from 'lightfetch-node';
import { FetchConnectionMetadataError } from '@replit/crosis';
import { GraphQLClient, gql } from 'graphql-request';

const fetchToken = async (token, id) => {
	const res = await lightfetch(
		`https://replit.com/data/repls/${id}/get_connection_metadata`,
		{
			method: 'POST',
			headers: {
				'X-Requested-With': 'RayhanADev',
				Referrer: 'https://replit.com',
				Cookie: `connect.sid=${token}`,
			},
			body: {
				clientVersion: '7561851',
				format: 'pbuf',
			},
		},
	);

	const text = await res.text();

	if (res.status > 399) {
		if (
			JSON.parse(text)
				.message?.toLowerCase()
				.indexOf('captcha failed') !== -1
		) {
			throw new Error(
				`Replit: ${res.status} Error Captcha Failed. Error: ${
					JSON.parse(text).message
				}`,
			);
		} else {
			throw new Error(
				`Replit: ${res.status} Error Failed to Open Repl. Error: ${
					JSON.parse(text).message
				}`,
			);
		}
	}

	let govalMetaData;
	try {
		govalMetaData = JSON.parse(text);
	} catch (error) {
		throw new Error(
			`Invalid JSON while fetching token for ${id}: ${JSON.stringify(
				text,
			)}`,
		);
	}

	return JSON.stringify(govalMetaData);
};

const getConnectionMetadata = async (token, id) => {
	if (!token) throw new Error('UserError: No connect.sid cookie provided.');
	let govalMetaData = {};
	let res = {};
	try {
		govalMetaData = JSON.parse(await fetchToken(token, id));
		res = {
			...govalMetaData,
			error: null,
		};

		return res;
	} catch (error) {
		if (error.name === 'AbortError') {
			res = { error: FetchConnectionMetadataError.Aborted };
		} else {
			console.warn(error);
			res = { error };
		}
		return res;
	}
};

const gqlClient = new GraphQLClient('https://replit.com/graphql/');
gqlClient.setHeaders({
	'X-Requested-With': 'Crosis4Furrets (replit/@RayhanADev)',
	'User-Agent': 'Crosis4Furrets (replit/@RayhanADev)',
	Referrer: 'https://replit.com/',
});

const CurrentUser = gql`
  query CurrentUser {
    currentUser {
      id
      username
      isHacker
    }
  }
`;

const Repl = gql`
  query Repl($id: String!) {
    repl(id: $id) {
      ... on Repl {
        id
        title
        slug
        description
        language
        isPrivate
        lang {
          id
          runner: canUseShellRunner
          packager3: supportsPackager3
          terminal: usesTerminal2
          interpreter: usesInterpreter
          engine
          mainFile
          supportsMultiFiles
        }
      }
    }
  }
`;

const CreateRepl = gql`
  mutation CreateRepl($input: CreateReplInput!) {
    createRepl(input: $input) {
      ... on Repl {
        id
        title
        slug
        description
        language
        isPrivate
        lang {
          id
          runner: canUseShellRunner
          packager3: supportsPackager3
          terminal: usesTerminal2
          interpreter: usesInterpreter
          engine
          mainFile
          supportsMultiFiles
        }
      }

      ... on UserError {
        message
      }

      __typename
    }
  }
`;

const gqlCurrentUser = async (userSid) => {
	const res = await gqlClient.request(
		CurrentUser,
		{},
		{ Cookie: 'connect.sid=' + userSid },
	);

	if (!res.currentUser) {
		throw new Error(
			`Unexpected GQL Response... Expected CurrentUser, recieved ${JSON.stringify(
				res,
			)}`,
		);
	}

	return res.currentUser;
};

const gqlRepl = async (userSid, id) => {
	const res = await gqlClient.request(
		Repl,
		{ id },
		{ Cookie: 'connect.sid=' + userSid },
	);

	if (!res.repl) {
		throw new Error(
			`Unexpected GQL Response... Expected Repl, recieved ${JSON.stringify(
				res,
			)}`,
		);
	}

	return res.repl;
};

const gqlCreateRepl = async (userSid, input) => {
	const res = await gqlClient.request(
		CreateRepl,
		{ input },
		{ Cookie: 'connect.sid=' + userSid },
	);

	if (!res.createRepl) {
		throw new Error(
			`Unexpected GQL Response... Expected CreateRepl, recieved ${JSON.stringify(
				res,
			)}`,
		);
	}

	return res.createRepl;
};

export {
	fetchToken,
	getConnectionMetadata,
	gqlCurrentUser,
	gqlRepl,
	gqlCreateRepl,
};
