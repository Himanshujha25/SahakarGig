export default function Field({ label, icon, type = "text", value, onChange, placeholder, name, autoComplete }) {
  return (
    <label className="block w-full">
      {label && (
        <span className="mb-1 block font-heading text-sm font-semibold text-on-surface-variant">{label}</span>
      )}
      <div className="relative w-full">
        {icon && (
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-outline">
            {icon}
          </span>
        )}
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-4 font-body-md text-body-md text-on-surface outline-none transition-colors focus:border-2 focus:border-primary"
          style={{ height: 48, paddingLeft: icon ? 44 : 16 }}
        />
      </div>
    </label>
  );
}
