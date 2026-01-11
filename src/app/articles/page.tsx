import Link from "next/link";
import { ImageSwiper } from "@/components/ui/image-swiper";

export const dynamic = "force-dynamic";


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

type Category = {
  name: string;
  slug: string;
  posts?: {
    nodes?: Post[];
  } | null;
};

type GraphQLResponse = {
  data?: {
    categories?: {
      nodes?: Category[];
    };
  };
  errors?: Array<{ message: string }>;
};

const CATEGORIES_QUERY = `
  query ArticlesByCategory {
    categories(first: 20, where: { hideEmpty: true }) {
      nodes {
        name
        slug
        posts(first: 8, where: { orderby: { field: DATE, order: DESC } }) {
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
    }
  }
`;

async function getCategories(): Promise<{
  categories: Category[];
  error: string | null;
}> {
  const endpoint = process.env.WORDPRESS_GRAPHQL_ENDPOINT;
  if (!endpoint) {
    return { categories: [], error: "Missing WORDPRESS_GRAPHQL_ENDPOINT." };
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: CATEGORIES_QUERY }),
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        categories: [],
        error: `Request failed with status ${response.status}.`,
      };
    }

    const payload = (await response.json()) as GraphQLResponse;
    if (payload.errors && payload.errors.length > 0) {
      return { categories: [], error: "GraphQL returned an error." };
    }

    return {
      categories: payload.data?.categories?.nodes ?? [],
      error: null,
    };
  } catch {
    return { categories: [], error: "Failed to fetch categories." };
  }
}

export default async function ArticlesPage() {
  const { categories, error } = await getCategories();
  const visibleCategories = categories.filter(
    (category) => (category.posts?.nodes ?? []).length > 0
  );

  return (
    <main>
      <section className="section">
        <div className="section-header">
          <h1 className="section-title">Άρθρα</h1>
          <p className="section-subtitle">Όλα τα άρθρα ανά κατηγορία.</p>
        </div>
      </section>
      {error ? <p>{error}</p> : null}
      {visibleCategories.length === 0 ? (
        <p>Δεν βρέθηκαν άρθρα.</p>
      ) : (
        visibleCategories.map((category) => {
          const swiperItems = (category.posts?.nodes ?? [])
            .filter((post) => post.featuredImage?.node?.sourceUrl)
            .slice(0, 8)
            .map((post) => ({
              src: post.featuredImage?.node?.sourceUrl as string,
              alt: post.featuredImage?.node?.altText ?? post.title,
              title: post.title,
              href: `/posts/${post.slug}`,
            }));

          return (
            <section key={category.slug} className="category-block">
              <div className="section-header">
                <h2 className="section-title">
                  <Link href={`/category/${category.slug}`}>
                    {category.name}
                  </Link>
                </h2>
                <Link
                  className="section-link"
                  href={`/category/${category.slug}`}
                >
                  
Προβολή
                </Link>
              </div>
              {swiperItems.length > 0 ? (
                <ImageSwiper
                  items={swiperItems}
                  cardWidth={240}
                  cardHeight={320}
                  className="image-swiper"
                />
              ) : (
                <p className="page-subtitle">
                  Δεν υπάρχουν άρθρα σε αυτή την κατηγορία.
                </p>
              )}
            </section>
          );
        })
      )}
    </main>
  );
}
