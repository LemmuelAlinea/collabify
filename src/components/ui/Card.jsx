function Card({ title, value, description, children }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-[#001A5A] p-5 text-white backdrop-blur shadow-xl">
      {title && (
        <p className="text-base font-black bg-gradient-to-r from-cyan-300 to-green-400 bg-clip-text text-transparent truncate">
          {title}
        </p>
      )}

      {value !== undefined && value !== null && (
        <h3 className="text-3xl font-black mb-1">
          {value}
        </h3>
      )}

      {description && (
        <p className="text-sm text-gray">
          {description}
        </p>
      )}

      {children}
    </div>
  )
}

export default Card