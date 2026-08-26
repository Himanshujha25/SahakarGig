import Icon from "./Icon";

export default function Field({ label, icon, type = "text", value, onChange, placeholder, name, autoComplete }) {
  return (
    <label className="block w-full">
      {label && (
        <span className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-1.5">{label}</span>
      )}
      <div className="relative w-full">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-outline">
            <Icon name={icon} className="text-[20px]" />
          </div>
        )}
        <input
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="w-full py-3 bg-surface border border-outline-variant rounded-xl text-on-surface font-body-md text-sm focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all outline-none"
          style={{ paddingLeft: icon ? 44 : 16, paddingRight: 16 }}
        />
      </div>
    </label>
  );
}
