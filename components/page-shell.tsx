type PageShellProps = {
  badge: string;
  title: string;
  description: string;
  children: React.ReactNode;
};

export function PageShell({ badge, title, description, children }: PageShellProps) {
  return (
    <div className="space-y-8">
      <section className="rounded-3xl bg-slate-950 p-8 text-white shadow-sm">
        <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-blue-100">
          {badge}
        </span>
        <h1 className="mt-5 text-3xl font-bold tracking-tight md:text-4xl">{title}</h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">{description}</p>
      </section>
      {children}
    </div>
  );
}

export function WorkflowCard({ title, description, items }: { title: string; description: string; items: string[] }) {
  return (
    <section className="card">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
      <ul className="mt-5 grid gap-3">
        {items.map((item) => (
          <li key={item} className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
