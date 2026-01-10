type Post = {
  title: string;
  slug: string;
  date: string;
};

type GraphQLResponse = {
  data?: {
    posts?: {
      nodes?: Post[];
    };
  };
  errors?: Array<{ message: string }>;
};

const POSTS_QUERY = `
  query HomePosts {
    posts(first: 10) {
      nodes {
        title
        slug
        date
      }
    }
  }
`;

async function getPosts(): Promise<{ posts: Post[]; error: string | null }> {
  const endpoint = process.env.WORDPRESS_GRAPHQL_ENDPOINT;
  if (!endpoint) {
    return { posts: [], error: "Missing WORDPRESS_GRAPHQL_ENDPOINT." };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: POSTS_QUERY }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        posts: [],
        error: `Request failed with status ${response.status}.`,
      };
    }

    const payload = (await response.json()) as GraphQLResponse;
    if (payload.errors && payload.errors.length > 0) {
      return { posts: [], error: "GraphQL returned an error." };
    }

    return {
      posts: payload.data?.posts?.nodes ?? [],
      error: null,
    };
  } catch {
    return { posts: [], error: "Failed to fetch posts." };
  }
}

export default async function Home() {
  const { posts, error } = await getPosts();

  return (
    <main>
      <h1>Articles</h1>
      {error ? <p>{error}</p> : null}
      {posts.length === 0 ? (
        <p>No posts found.</p>
      ) : (
        <ul>
          {posts.map((post) => (
            <li key={post.slug}>
              <div>{post.title}</div>
              <div>{post.slug}</div>
              <time dateTime={post.date}>{post.date}</time>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
