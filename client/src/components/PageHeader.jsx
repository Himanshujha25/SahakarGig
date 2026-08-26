// Shared page header — standardizes title/subtitle/actions across every page
// so all screens share the same alignment, spacing and type scale as the
// redesigned Admin Dashboard.
export default function PageHeader({ title, subtitle, actions, description }) {
  return (
    <header className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
      <div className="min-w-0">
        <h1 className="font-heading font-bold tracking-tight text-[1.75rem] leading-9 text-on-background md:text-4xl md:leading-10">
          {title}
        </h1>
        {(subtitle || description) && (
          <p className="mt-1 font-body-md text-body-md text-on-surface-variant md:text-body-lg">
            {subtitle || description}
          </p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </header>
  );
}