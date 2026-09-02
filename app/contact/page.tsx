const CONTACT_EMAIL = "olaishim5@gmail.com";
const CONTACT_PHONE = "0705 883 9192";

export default function ContactPage() {
  return (
    <div className="max-w-[480px] mx-auto py-12 pb-20">
      <h1 className="font-display text-[26px] font-bold mb-1.5">Contact us</h1>
      <p className="text-paperDim text-sm mb-8">
        Questions, event reports, or partnership ideas — reach out directly.
      </p>

      <div className="bg-panel border border-hairline rounded-card p-5 mb-8 space-y-3">
        <div>
          <div className="text-[11px] text-paperDim uppercase tracking-wide mb-1">Email</div>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-sm text-amber">{CONTACT_EMAIL}</a>
        </div>
        <div>
          <div className="text-[11px] text-paperDim uppercase tracking-wide mb-1">Phone</div>
          <a href={`tel:${CONTACT_PHONE.replace(/\s/g, "")}`} className="text-sm text-amber">{CONTACT_PHONE}</a>
        </div>
      </div>

      <div className="text-[13px] text-paperDim mb-3">Or send a message directly:</div>

      <form
        action={`mailto:${CONTACT_EMAIL}`}
        method="post"
        encType="text/plain"
        className="space-y-4"
      >
        <input className="field-input" name="name" placeholder="Your name" required />
        <input className="field-input" name="email" type="email" placeholder="Your email" required />
        <textarea className="field-input min-h-[120px]" name="message" placeholder="What's on your mind?" required />
        <button type="submit" className="btn-primary w-full">Send message</button>
        <p className="text-[12px] text-paperDim">
          This opens your email app with the message pre-filled to {CONTACT_EMAIL}.
        </p>
      </form>
    </div>
  );
}