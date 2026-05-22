export const projectTypes = [
  {
    value: 'software_development',
    label: 'Software Development',
    description: 'Web systems, apps, platforms, and software projects.',
  },
  {
    value: 'mobile_application',
    label: 'Mobile Application',
    description: 'Android, iOS, Flutter, React Native, or mobile app projects.',
  },
  {
    value: 'website',
    label: 'Website',
    description: 'Informational websites, portfolios, landing pages, and web pages.',
  },
  {
    value: 'research_project',
    label: 'Research Project',
    description: 'Academic research, thesis, studies, and papers.',
  },
  {
    value: 'business_plan',
    label: 'Business Plan',
    description: 'Business proposals, startup plans, and entrepreneurship projects.',
  },
  {
    value: 'case_study',
    label: 'Case Study',
    description: 'Analysis of real-world cases, organizations, problems, or scenarios.',
  },
  {
    value: 'marketing_campaign',
    label: 'Marketing Campaign',
    description: 'Branding, advertisements, audience research, and campaign plans.',
  },
  {
    value: 'lesson_plan',
    label: 'Lesson Plan',
    description: 'Education projects, instructional planning, and teaching materials.',
  },
  {
    value: 'documentary',
    label: 'Documentary',
    description: 'Video documentary, interviews, scripts, and production planning.',
  },
  {
    value: 'feasibility_study',
    label: 'Feasibility Study',
    description: 'Market, technical, financial, and operational feasibility projects.',
  },
  {
    value: 'engineering_prototype',
    label: 'Engineering Prototype',
    description: 'Hardware, design, prototype, testing, and engineering outputs.',
  },
  {
    value: 'multimedia_project',
    label: 'Multimedia Project',
    description: 'Graphics, video, audio, animation, and media production.',
  },
  {
    value: 'event_planning',
    label: 'Event Planning',
    description: 'Programs, event logistics, budgeting, promotion, and execution.',
  },
  {
    value: 'architectural_design',
    label: 'Architectural Design',
    description: 'Design boards, plans, models, site analysis, and presentations.',
  },
  {
    value: 'generic_group_project',
    label: 'Generic Group Project',
    description: 'General academic group projects that do not fit other categories.',
  },
]

export function getProjectTypeLabel(value) {
  return projectTypes.find((type) => type.value === value)?.label || value
}

export function getProjectTypeDescription(value) {
  return projectTypes.find((type) => type.value === value)?.description || ''
}