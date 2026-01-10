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
  query HomePosts {
    posts(first: 4, where: { orderby: { field: DATE, order: DESC } }) {
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
      <section className="hero">
        <div className="hero-orbit">
          <nav className="orbit-nav" aria-label="Primary">
            <Link className="orbit-item orbit-item--top" href="/">
              Αρχική
            </Link>
            <Link className="orbit-item orbit-item--right" href="/articles">
              Άρθρα
            </Link>
            <Link className="orbit-item orbit-item--bottom" href="/about">
              Σχετικά
            </Link>
            <Link className="orbit-item orbit-item--left" href="/contact">
              Επικοινωνία
            </Link>
          </nav>
          <div className="hero-inner">
            <div className="hero-brand">
              <Image
                src="/logo.png"
                alt="theBlockchain 2.0 logo"
                width={64}
                height={64}
                className="hero-brand-logo"
                priority
              />
              <span className="hero-brand-text">theBlockchain 2.0</span>
            </div>
            <h1 className="hero-title">Crypto Trading & Charts</h1>
            <div className="hero-actions">
              <Link className="button button--primary" href="/chat">
                Let&#39;s Chat....
              </Link>
            </div>
          </div>
        </div>
      </section>
      <section className="section">
        <div className="section-header">
          <h2 className="section-title">Τελευταία άρθρα</h2>
          <Link className="section-link" href="/articles">
            Όλα τα άρθρα
          </Link>
        </div>
        {error ? <p>{error}</p> : null}
        {posts.length === 0 ? (
          <p>Δεν βρέθηκαν άρθρα.</p>
        ) : (
          <ul className="post-grid">
            {posts.map((post) => (
              <li key={post.slug}>
                <Link href={`/posts/${post.slug}`} className="post-card">
                  {post.featuredImage?.node?.sourceUrl ? (
                    <Image
                      src={post.featuredImage.node.sourceUrl}
                      alt={post.featuredImage.node.altText ?? post.title}
                      width={1200}
                      height={630}
                      sizes="(max-width: 768px) 100vw, 1200px"
                    />
                  ) : null}
                  <h3 className="post-title">{post.title}</h3>
                  <time className="post-date" dateTime={post.date}>
                    {post.date}
                  </time>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="section intro-section">
        <div className="intro-content">
          <blockquote className="intro-quote">
            "Ο φόβος και η απληστία είναι οι χειρότεροι σύμβουλοι ενός επενδυτή"
          </blockquote>
          <div className="intro-copy">
            <p>
              Στο TheBlockchain θα βρείτε μία σειρά θεμάτων. Επεξήγηση του
              Bitcoin, Web3, NFT και των κρυπτονομισμάτων γενικότερα. Πώς κινείται
              η αγορά; Θεωρία τεχνικής ανάλυσης αλλά και το πως εφαρμόζουμε εμείς
              αυτή τη θεωρία. Σκοπός μας στο TheBlockchain είναι να ενημερώσουμε.
              Θέλουμε να συμπτύξουμε την γνώση μας και να την μεταφέρουμε. Να σας
              δώσουμε όσα περισσότερα εργαλεία μπορούμε, ώστε να βγείτε στον
              δύσκολο κόσμο των αγορών προετοιμασμένοι. Ελάτε να μεγαλώσουμε την
              κοινότητα μας!
            </p>
            <p>
              Με άρθρα και σχετικό περιεχόμενο, αποκαλύπτουμε τα μυστικά των
              αγορών. Τόσο για την αγορά κρυπτονομισμάτων και τα χαρακτηριστικά
              της, όσο και για το Trading γενικότερα. Γιατί στο TheBlockchain,
              πιστεύουμε ότι η γνώση είναι το αντίβαρο της παραπλάνησης.
            </p>
            <p className="intro-cta">
              Μπορείτε να βοηθήσετε την κοινότητα να αναπτυχθεί, αν σας αρέσει το
              περιεχόμενο!
            </p>
          </div>
        </div>
      </section>
      <section id="contact" className="section contact-section">
        <div className="section-header">
          <h2 className="section-title">Επικοινωνία</h2>
          <p className="section-subtitle">
            Στείλε μας μήνυμα για συνεργασίες, απορίες ή θέματα που θέλεις να
            καλύψουμε.
          </p>
        </div>
        <form className="contact-form" action="/contact" method="get">
          <label className="field">
            <span>Ονοματεπώνυμο</span>
            <input type="text" name="name" placeholder="Το όνομά σου" />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" placeholder="you@example.com" />
          </label>
          <label className="field">
            <span>Μήνυμα</span>
            <textarea name="message" placeholder="Πες μας τι χρειάζεσαι..." />
          </label>
          <button type="submit" className="button button--primary">
            Αποστολή
          </button>
        </form>
      </section>
    </main>
  );
}
