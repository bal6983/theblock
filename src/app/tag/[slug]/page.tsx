import Link from "next/link";

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
  query TagPosts($slug: String!) {
    posts(where: { tag: $slug }) {
      nodes {
        title
        slug
        date
      }
    }
  }
`;

async function getPosts(
  slug: string
): Promise<{ posts: Post[]; error: string | null }> {
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
      body: JSON.stringify({ query: POSTS_QUERY, variables: { slug } }),
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

export default async function TagPage({
  params,
}: {
  params: Promise<{ slug?: string | string[] }>;
}) {
  const resolvedParams = await params;
  const rawSlug = Array.isArray(resolvedParams.slug)
    ? resolvedParams.slug[0]
    : resolvedParams.slug;

  if (!rawSlug) {
    return <main>No posts with this tag</main>;
  }

  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    return <main>No posts with this tag</main>;
  }

  const { posts, error } = await getPosts(slug);

  return (
    <main>
      <h1>Tag: {slug}</h1>
      {error ? <p>{error}</p> : null}
      {posts.length === 0 ? (
        <p>No posts with this tag</p>
      ) : (
        <ul>
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/posts/${post.slug}`}>{post.title}</Link>
              <div>{post.slug}</div>
              <time dateTime={post.date}>{post.date}</time>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
