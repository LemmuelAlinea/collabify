function SectionHeader({ title, description }) {
  return (
    <div className="mb-4">
      <h2 className="text-xl font-semibold">{title}</h2>

      {description && (
        <p className="text-sm text-gray-600 mt-1">
          {description}
        </p>
      )}
    </div>
  )
}

export default SectionHeader