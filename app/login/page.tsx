import { login } from "./actions";

type LoginPageProps = {
  searchParams: Promise<{ error?: string; next?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="auth-page">
      <section className="auth-panel" aria-labelledby="login-title">
        <div className="brand-mark" aria-hidden="true">CK</div>
        <div>
          <div className="eyebrow">CaseKit workspace</div>
          <h1 id="login-title">Sign in</h1>
          <p>Access your private cases and evidence workspace.</p>
        </div>

        {params.error ? <div className="auth-error" role="alert">{params.error}</div> : null}

        <form action={login} className="auth-form">
          <input type="hidden" name="next" value={params.next ?? "/home"} />
          <label>
            <span>Email</span>
            <input name="email" type="email" autoComplete="email" required />
          </label>
          <label>
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button className="primary-button" type="submit">Sign in</button>
        </form>

        <p className="auth-note">CaseKit does not make legal-rights determinations or promise complaint outcomes.</p>
      </section>
    </div>
  );
}
