import Image from "next/image";
import Link from "next/link";

export async function generateMetadata({
  params,
}: {
  params: { slug?: string | string[] } | Promise<{ slug?: string | string[] }>;
}) {
  const resolvedParams = await Promise.resolve(params);
  const rawSlug = Array.isArray(resolvedParams.slug)
    ? resolvedParams.slug[0]
    : resolvedParams.slug;
  if (!rawSlug) {
    return { title: "Post not found", description: "Post not found" };
  }

  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    return { title: "Post not found", description: "Post not found" };
  }

  const endpoint = process.env.WORDPRESS_GRAPHQL_ENDPOINT;
  if (!endpoint) {
    return { title: "Post not found", description: "Post not found" };
  }

  const encodedSlug = encodeURIComponent(slug);
  const query = `
    query PostMetaBySlug($slugDecoded: ID!, $slugEncoded: ID!) {
      postDecoded: post(id: $slugDecoded, idType: SLUG) {
        title
        content
        seo {
          title
          metaDesc
          opengraphTitle
          opengraphDescription
          opengraphImage {
            sourceUrl
          }
        }
      }
      postEncoded: post(id: $slugEncoded, idType: SLUG) {
        title
        content
        seo {
          title
          metaDesc
          opengraphTitle
          opengraphDescription
          opengraphImage {
            sourceUrl
          }
        }
      }
    }
  `;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      next: { revalidate: 0 },
      body: JSON.stringify({
        query,
        variables: { slugDecoded: slug, slugEncoded: encodedSlug },
      }),
    });
  } catch {
    return {
      title: "Post not found",
      description: "Post not found",
      alternates: { canonical: `/posts/${slug}` },
    };
  }

  if (!response.ok) {
    return {
      title: "Post not found",
      description: "Post not found",
      alternates: { canonical: `/posts/${slug}` },
    };
  }

  const json = (await response.json()) as {
    errors?: { message: string }[];
    data?: {
      postDecoded?: {
        title: string;
        content: string;
        seo?: {
          title?: string | null;
          metaDesc?: string | null;
          opengraphTitle?: string | null;
          opengraphDescription?: string | null;
          opengraphImage?: { sourceUrl?: string | null } | null;
        } | null;
      } | null;
      postEncoded?: {
        title: string;
        content: string;
        seo?: {
          title?: string | null;
          metaDesc?: string | null;
          opengraphTitle?: string | null;
          opengraphDescription?: string | null;
          opengraphImage?: { sourceUrl?: string | null } | null;
        } | null;
      } | null;
    };
  };

  if (json.errors?.length) {
    return {
      title: "Post not found",
      description: "Post not found",
      alternates: { canonical: `/posts/${slug}` },
    };
  }

  const post = json.data?.postDecoded ?? json.data?.postEncoded;
  if (!post) {
    return {
      title: "Post not found",
      description: "Post not found",
      alternates: { canonical: `/posts/${slug}` },
    };
  }

  const seo = post.seo ?? {};
  const plainText = (post.content || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const fallbackDescription = plainText.slice(0, 160);
  const title = (seo.title ?? "").trim() || post.title;
  const description =
    (seo.metaDesc ?? "").trim() || fallbackDescription || post.title;
  const ogTitle = (seo.opengraphTitle ?? "").trim() || title;
  const ogDescription =
    (seo.opengraphDescription ?? "").trim() || description;
  const ogImage = seo.opengraphImage?.sourceUrl ?? undefined;

  return {
    title,
    description,
    openGraph: {
      title: ogTitle,
      description: ogDescription,
      images: ogImage ? [ogImage] : undefined,
    },
    alternates: {
      canonical: `/posts/${slug}`,
    },
  };
}

export default async function PostPage({
  params,
}: {
  params: Promise<{ slug?: string | string[] }>;
}) {
  const resolvedParams = await params;
  const endpoint = process.env.WORDPRESS_GRAPHQL_ENDPOINT;
  if (!endpoint) {
    throw new Error("Missing WORDPRESS_GRAPHQL_ENDPOINT");
  }

  const rawSlug = Array.isArray(resolvedParams.slug)
    ? resolvedParams.slug[0]
    : resolvedParams.slug;
  if (!rawSlug) {
    return <main>Post not found</main>;
  }
  let slug: string;
  try {
    slug = decodeURIComponent(rawSlug);
  } catch {
    return <main>Post not found</main>;
  }
  const encodedSlug = encodeURIComponent(slug);
  const query = `
    query PostBySlug($slugDecoded: ID!, $slugEncoded: ID!) {
      postDecoded: post(id: $slugDecoded, idType: SLUG) {
        title
        date
        content
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        categories {
          nodes {
            name
            slug
          }
        }
        tags {
          nodes {
            name
            slug
          }
        }
      }
      postEncoded: post(id: $slugEncoded, idType: SLUG) {
        title
        date
        content
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        categories {
          nodes {
            name
            slug
          }
        }
        tags {
          nodes {
            name
            slug
          }
        }
      }
    }
  `;

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      cache: "no-store",
      next: { revalidate: 0 },
      body: JSON.stringify({
        query,
        variables: { slugDecoded: slug, slugEncoded: encodedSlug },
      }),
    });
  } catch {
    return <main>Failed to load post</main>;
  }

  if (!response.ok) {
    return <main>Failed to load post</main>;
  }

  const json = (await response.json()) as {
    errors?: { message: string }[];
    data?: {
      postDecoded?: {
        title: string;
        date: string;
        content: string;
        featuredImage?: {
          node?: {
            sourceUrl?: string | null;
            altText?: string | null;
          } | null;
        } | null;
        categories?: {
          nodes?: { name: string; slug: string }[];
        } | null;
        tags?: {
          nodes?: { name: string; slug: string }[];
        } | null;
      } | null;
      postEncoded?: {
        title: string;
        date: string;
        content: string;
        featuredImage?: {
          node?: {
            sourceUrl?: string | null;
            altText?: string | null;
          } | null;
        } | null;
        categories?: {
          nodes?: { name: string; slug: string }[];
        } | null;
        tags?: {
          nodes?: { name: string; slug: string }[];
        } | null;
      } | null;
    };
  };

  if (json.errors?.length) {
    return <main>Failed to load post</main>;
  }

  const post = json.data?.postDecoded ?? json.data?.postEncoded;

  if (!post) {
    return <main>Post not found</main>;
  }

  const featuredImageUrl = post.featuredImage?.node?.sourceUrl ?? null;
  const featuredImageAlt = post.featuredImage?.node?.altText ?? "";
  const categories = post.categories?.nodes ?? [];
  const tags = post.tags?.nodes ?? [];

  return (
    <main>
      <article>
        {featuredImageUrl ? (
          <Image
            src={featuredImageUrl}
            alt={featuredImageAlt}
            width={1200}
            height={630}
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        ) : null}
        <h1>{post.title}</h1>
        <time dateTime={post.date}>{post.date}</time>
        {categories.length > 0 ? (
          <div>
            <div>Categories:</div>
            <ul>
              {categories.map((category) => (
                <li key={category.slug}>
                  <Link href={`/category/${category.slug}`}>
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {tags.length > 0 ? (
          <div>
            <div>Tags:</div>
            <ul>
              {tags.map((tag) => (
                <li key={tag.slug}>
                  <Link href={`/tag/${tag.slug}`}>{tag.name}</Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div dangerouslySetInnerHTML={{ __html: post.content }} />
      </article>
    </main>
  );
}
