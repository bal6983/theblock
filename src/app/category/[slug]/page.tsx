import Link from "next/link";
import Image from "next/image";

type Post = {
  title: string;
  slug: string;
  date: string;
  featuredImage?: {
    node?: {
      sourceUrl?: string | null;
      altText?: string | null;
    } | null;
  } | null;
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
  query CategoryPosts($slug: String!) {
    posts(where: { categoryName: $slug }) {
      nodes {
        title
        slug
        date
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
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

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug?: string | string[] }>;
}) {
  const resolvedParams = await params;
  const rawSlug = Array.isArray(resolvedParams.slug)
    ? resolvedParams.slug[0]
    : resolvedParams.slug;

  if (!rawSlug) {
    return <main>No posts in this category</main>;
  }

  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    return <main>No posts in this category</main>;
  }

  const { posts, error } = await getPosts(slug);

  return (
    <main>
      <section className="section">
        <div className="section-header">
          <h1 className="section-title">Κατηγορία: {slug}</h1>
        </div>
      </section>
      {error ? <p>{error}</p> : null}
      {posts.length === 0 ? (
        <p>No posts in this category</p>
      ) : (
        <ul className="post-grid">
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/posts/${post.slug}`} className="post-card">
                {post.featuredImage?.node?.sourceUrl ? (
                  <Image
                    src={post.featuredImage.node.sourceUrl}
                    alt={post.featuredImage.node.altText ?? ""}
                    width={1200}
                    height={630}
                    sizes="(max-width: 768px) 100vw, 1200px"
                  />
                ) : null}
                <h2 className="post-title">{post.title}</h2>
                <time className="post-date" dateTime={post.date}>
                  {post.date}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
