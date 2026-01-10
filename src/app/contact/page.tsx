export default function ContactPage() {
  return (
    <main>
      <section className="section contact-section" id="contact">
        <div className="section-header">
          <h1 className="section-title">Επικοινωνία</h1>
          <p className="section-subtitle">
            Θα χαρούμε να ακούσουμε τα σχόλια και τις προτάσεις σου.
          </p>
        </div>
        <form className="contact-form" action="/contact" method="get">
          <label className="field">
            <span>Ονοματεπώνυμο</span>
            <input type="text" name="name" placeholder="Το όνομά σας" />
          </label>
          <label className="field">
            <span>Email</span>
            <input type="email" name="email" placeholder="you@example.com" />
          </label>
          <label className="field">
            <span>Μήνυμα</span>
            <textarea name="message" placeholder="Πείτε μας τι χρειάζεστε" />
          </label>
          <button type="submit" className="button button--primary">
            Αποστολή
          </button>
        </form>
      </section>
    </main>
  );
}
