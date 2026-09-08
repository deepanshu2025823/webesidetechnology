/**
 * Declarative definitions for the "simple" content types in the admin panel.
 * One definition drives the list table, the create/edit form, validation and
 * the server action, so adding a new managed collection is a data change.
 */

export type FieldType =
  | "text"
  | "textarea"
  | "richtext"
  | "number"
  | "boolean"
  | "select"
  | "image"
  | "url"
  | "email"
  | "date"
  | "icon"
  /// a document — PDF, Word, scan — stored like an upload and linked by URL
  | "file"
  /// string[] stored in a Json column
  | "taglist";

export type Field = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Show this column in the list table. */
  inList?: boolean;
  defaultValue?: string | number | boolean;
  colSpan?: 1 | 2;
};

export type Collection = {
  /** Prisma model key on the client, e.g. `testimonial`. */
  model: string;
  slug: string;
  /** Permission module that gates this collection; defaults to "website". */
  module?: string;
  title: string;
  singular: string;
  description: string;
  fields: Field[];
  orderBy?: Record<string, "asc" | "desc">;
  /** Field rendered as the row's primary label. */
  titleField: string;
  sortable?: boolean;
};

const ORDER_FIELD: Field = {
  name: "order",
  label: "Sort order",
  type: "number",
  defaultValue: 0,
  help: "Lower numbers appear first.",
};

const ACTIVE_FIELD: Field = {
  name: "isActive",
  label: "Visible on the site",
  type: "boolean",
  defaultValue: true,
  inList: true,
};

export const COLLECTIONS: Record<string, Collection> = {
  "hero": {
    model: "heroSlide",
    slug: "hero",
    title: "Hero slides",
    singular: "Slide",
    description: "The rotating headline block at the top of the home page.",
    titleField: "title",
    orderBy: { order: "asc" },
    sortable: true,
    fields: [
      { name: "eyebrow", label: "Eyebrow", type: "text", placeholder: "Full-service digital partner", colSpan: 2 },
      { name: "title", label: "Headline", type: "text", required: true, colSpan: 2, inList: true },
      { name: "subtitle", label: "Sub-headline", type: "textarea", colSpan: 2 },
      { name: "image", label: "Background image", type: "image", colSpan: 2, help: "Optional. Falls back to the brand mark." },
      { name: "ctaLabel", label: "Primary button text", type: "text", placeholder: "Book a free consultation" },
      { name: "ctaUrl", label: "Primary button link", type: "url", placeholder: "/contact" },
      { name: "altLabel", label: "Secondary button text", type: "text", placeholder: "Our services" },
      { name: "altUrl", label: "Secondary button link", type: "url", placeholder: "/services" },
      ACTIVE_FIELD,
      ORDER_FIELD,
    ],
  },

  "videos": {
    model: "videoSlide",
    slug: "videos",
    title: "Video carousel",
    singular: "Video",
    description:
      "The video strip on the home page. Paste a YouTube, Vimeo or direct video link — title and description are optional.",
    titleField: "title",
    orderBy: { order: "asc" },
    sortable: true,
    fields: [
      {
        name: "url",
        label: "Video link",
        type: "url",
        required: true,
        colSpan: 2,
        placeholder: "https://youtu.be/…",
        help: "A YouTube or Vimeo link, or a direct .mp4 URL. Videos are not uploaded to the site itself.",
      },
      { name: "title", label: "Title", type: "text", colSpan: 2, inList: true, help: "Optional." },
      { name: "description", label: "Description", type: "textarea", colSpan: 2, help: "Optional." },
      {
        name: "thumbnail",
        label: "Custom thumbnail",
        type: "image",
        colSpan: 2,
        help: "Optional. YouTube and Vimeo supply their own poster if this is left blank.",
      },
      ACTIVE_FIELD,
      ORDER_FIELD,
    ],
  },

  "stats": {
    model: "stat",
    slug: "stats",
    title: "Stats",
    singular: "Stat",
    description: "Headline numbers shown on the home and about pages.",
    titleField: "label",
    orderBy: { order: "asc" },
    sortable: true,
    fields: [
      { name: "value", label: "Value", type: "text", required: true, placeholder: "250", inList: true },
      { name: "suffix", label: "Suffix", type: "text", placeholder: "+", help: "e.g. +, %, k" },
      { name: "label", label: "Label", type: "text", required: true, placeholder: "Projects delivered", inList: true },
      { name: "icon", label: "Icon", type: "icon", defaultValue: "TrendingUp" },
      ACTIVE_FIELD,
      ORDER_FIELD,
    ],
  },

  "process": {
    model: "processStep",
    slug: "process",
    title: "Process steps",
    singular: "Step",
    description: "The 'how we work' timeline on the home and about pages.",
    titleField: "title",
    orderBy: { order: "asc" },
    sortable: true,
    fields: [
      { name: "title", label: "Step title", type: "text", required: true, inList: true },
      { name: "description", label: "Description", type: "textarea", colSpan: 2 },
      { name: "icon", label: "Icon", type: "icon", defaultValue: "Compass" },
      ACTIVE_FIELD,
      ORDER_FIELD,
    ],
  },

  "testimonials": {
    model: "testimonial",
    slug: "testimonials",
    title: "Testimonials",
    singular: "Testimonial",
    description: "Client quotes used across the site.",
    titleField: "authorName",
    orderBy: { order: "asc" },
    sortable: true,
    fields: [
      { name: "quote", label: "Quote", type: "textarea", required: true, colSpan: 2 },
      { name: "authorName", label: "Client name", type: "text", required: true, inList: true },
      { name: "authorRole", label: "Designation", type: "text", placeholder: "Founder" },
      { name: "company", label: "Company", type: "text", inList: true },
      {
        name: "rating",
        label: "Rating",
        type: "select",
        defaultValue: 5,
        options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} star${n > 1 ? "s" : ""}` })),
      },
      { name: "avatar", label: "Photo", type: "image", colSpan: 2 },
      { name: "isFeatured", label: "Feature on home page", type: "boolean", defaultValue: false },
      ACTIVE_FIELD,
      ORDER_FIELD,
    ],
  },

  "client-logos": {
    model: "clientLogo",
    slug: "client-logos",
    title: "Client logos",
    singular: "Client logo",
    description: "The logo strip beneath the hero.",
    titleField: "name",
    orderBy: { order: "asc" },
    sortable: true,
    fields: [
      { name: "name", label: "Client name", type: "text", required: true, inList: true },
      { name: "logo", label: "Logo", type: "image", required: true, colSpan: 2, help: "Transparent PNG or SVG works best." },
      { name: "websiteUrl", label: "Website", type: "url", colSpan: 2 },
      ACTIVE_FIELD,
      ORDER_FIELD,
    ],
  },

  "faqs": {
    model: "faq",
    slug: "faqs",
    title: "FAQs",
    singular: "FAQ",
    description: "Questions shown on the home page and, optionally, a service page.",
    titleField: "question",
    orderBy: { order: "asc" },
    sortable: true,
    fields: [
      { name: "question", label: "Question", type: "text", required: true, colSpan: 2, inList: true },
      { name: "answer", label: "Answer", type: "textarea", required: true, colSpan: 2 },
      { name: "group", label: "Group", type: "text", defaultValue: "General", inList: true, help: "Use 'General' for the home page." },
      ACTIVE_FIELD,
      ORDER_FIELD,
    ],
  },

  "team": {
    model: "teamMember",
    slug: "team",
    title: "Team",
    singular: "Team member",
    description: "People shown on the about page.",
    titleField: "name",
    orderBy: { order: "asc" },
    sortable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, inList: true },
      { name: "role", label: "Designation", type: "text", required: true, inList: true },
      { name: "bio", label: "Short bio", type: "textarea", colSpan: 2 },
      { name: "photo", label: "Photo", type: "image", colSpan: 2 },
      { name: "linkedin", label: "LinkedIn URL", type: "url" },
      { name: "email", label: "Email", type: "email" },
      ACTIVE_FIELD,
      ORDER_FIELD,
    ],
  },

  "service-categories": {
    model: "serviceCategory",
    slug: "service-categories",
    title: "Service groups",
    singular: "Service group",
    description: "Groupings used to organise the services page.",
    titleField: "name",
    orderBy: { order: "asc" },
    sortable: true,
    fields: [
      { name: "name", label: "Group name", type: "text", required: true, inList: true },
      { name: "slug", label: "URL slug", type: "text", required: true, inList: true, help: "Auto-filled from the name." },
      { name: "description", label: "Description", type: "textarea", colSpan: 2 },
      { name: "icon", label: "Icon", type: "icon", defaultValue: "Sparkles" },
      ACTIVE_FIELD,
      ORDER_FIELD,
    ],
  },

  "post-categories": {
    model: "postCategory",
    slug: "post-categories",
    title: "Blog categories",
    singular: "Category",
    description: "Categories used to file blog posts.",
    titleField: "name",
    orderBy: { order: "asc" },
    sortable: true,
    fields: [
      { name: "name", label: "Name", type: "text", required: true, inList: true },
      { name: "slug", label: "URL slug", type: "text", required: true, inList: true },
      { name: "description", label: "Description", type: "textarea", colSpan: 2 },
      ORDER_FIELD,
    ],
  },

  "menus": {
    model: "menuItem",
    slug: "menus",
    title: "Navigation",
    singular: "Menu link",
    description: "Header, footer and legal navigation links.",
    titleField: "label",
    orderBy: { order: "asc" },
    sortable: true,
    fields: [
      { name: "label", label: "Link text", type: "text", required: true, inList: true },
      { name: "url", label: "URL", type: "url", required: true, inList: true, placeholder: "/services" },
      {
        name: "location",
        label: "Where it appears",
        type: "select",
        defaultValue: "HEADER",
        inList: true,
        options: [
          { value: "HEADER", label: "Header" },
          { value: "FOOTER_SERVICES", label: "Footer — Services" },
          { value: "FOOTER_COMPANY", label: "Footer — Company" },
          { value: "LEGAL", label: "Footer — Legal strip" },
        ],
      },
      {
        name: "parentId",
        label: "Parent link",
        type: "select",
        help: "Leave blank for a top-level link. Only header links support dropdowns.",
        options: [],
      },
      { name: "isExternal", label: "Opens in a new tab", type: "boolean", defaultValue: false },
      ACTIVE_FIELD,
      ORDER_FIELD,
    ],
  },

  // ---------------------------------------------------------------- people

  "hr/employees": {
    model: "employee",
    slug: "hr/employees",
    title: "Employees",
    singular: "Employee",
    description: "The HR record for each team member — department, skills and reporting line.",
    titleField: "name",
    orderBy: { name: "asc" },
    module: "team",
    fields: [
      { name: "name", label: "Full name", type: "text", required: true, inList: true },
      { name: "code", label: "Employee code", type: "text", required: true, inList: true, placeholder: "EMP-001" },
      { name: "email", label: "Email", type: "email", required: true, inList: true },
      { name: "phone", label: "Phone", type: "text" },
      { name: "department", label: "Department", type: "text", inList: true, placeholder: "Delivery" },
      { name: "designation", label: "Designation", type: "text", placeholder: "Senior Developer" },
      { name: "skills", label: "Skills", type: "taglist", colSpan: 2, placeholder: "e.g. React" },
      { name: "joinedAt", label: "Joined on", type: "date" },
      { name: "exitedAt", label: "Exit date", type: "date", help: "Leave blank while they are with you." },
      { name: "isActive", label: "Currently employed", type: "boolean", defaultValue: true, inList: true },
    ],
  },

  "placements/partners": {
    model: "placementPartner",
    slug: "placements/partners",
    title: "Placement partners",
    singular: "Partner",
    description: "Companies we place candidates with — who to contact, what they hire for, and our fee.",
    titleField: "name",
    orderBy: { name: "asc" },
    module: "placements",
    fields: [
      { name: "name", label: "Company", type: "text", required: true, inList: true },
      { name: "industry", label: "Industry", type: "text", inList: true, placeholder: "IT services" },
      { name: "city", label: "City", type: "text", inList: true },
      { name: "website", label: "Website", type: "url" },
      {
        name: "hiringFor",
        label: "Hiring for",
        type: "taglist",
        colSpan: 2,
        placeholder: "e.g. React Developer",
        help: "Roles they are open for right now.",
      },
      { name: "contactName", label: "Contact person", type: "text" },
      { name: "contactEmail", label: "Contact email", type: "email", inList: true },
      { name: "contactPhone", label: "Contact phone", type: "text" },
      {
        name: "commissionPct",
        label: "Our fee %",
        type: "number",
        defaultValue: 0,
        help: "Percentage of the candidate's annual CTC, as agreed with them.",
      },
      { name: "agreementUrl", label: "Signed agreement", type: "file", colSpan: 2, help: "PDF, Word or a scan." },
      { name: "isActive", label: "Currently hiring", type: "boolean", defaultValue: true, inList: true },
      { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
    ],
  },

  // ---------------------------------------------------------------- growth network

  "influencers": {
    model: "influencer",
    slug: "influencers",
    title: "Influencers",
    singular: "Influencer",
    description: "The influencer master database — reach, rates, compliance and internal rating.",
    titleField: "name",
    orderBy: { name: "asc" },
    module: "influencers",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, inList: true },
      { name: "handle", label: "Handle", type: "text", inList: true, placeholder: "@handle" },
      { name: "platforms", label: "Platforms", type: "taglist", colSpan: 2, placeholder: "e.g. Instagram", inList: true },
      { name: "niche", label: "Niche", type: "text", inList: true, placeholder: "Fitness" },
      { name: "category", label: "Category", type: "text", placeholder: "Nano / Micro / Macro" },
      { name: "language", label: "Language", type: "text" },
      { name: "city", label: "City", type: "text" },
      { name: "audienceType", label: "Audience type", type: "text", placeholder: "18–34, urban" },
      { name: "audienceGeo", label: "Audience geography", type: "text" },
      { name: "followers", label: "Followers", type: "number", inList: true },
      { name: "avgViews", label: "Average views", type: "number" },
      { name: "engagementRate", label: "Engagement rate %", type: "number" },
      { name: "agencyContact", label: "Agency / contact", type: "text", colSpan: 2 },
      { name: "barterOk", label: "Accepts barter", type: "boolean", defaultValue: false },
      {
        name: "rating",
        label: "Overall rating",
        type: "select",
        defaultValue: 3,
        options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} / 5` })),
      },
      {
        name: "reliability",
        label: "Reliability",
        type: "select",
        defaultValue: 3,
        options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} / 5` })),
      },
      {
        name: "contentQuality",
        label: "Content quality",
        type: "select",
        defaultValue: 3,
        options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} / 5` })),
      },
      {
        name: "brandFit",
        label: "Brand fit",
        type: "select",
        defaultValue: 3,
        options: [5, 4, 3, 2, 1].map((n) => ({ value: String(n), label: `${n} / 5` })),
      },
      { name: "contractUrl", label: "Contract link", type: "text", colSpan: 2 },
      { name: "usageRights", label: "Usage rights", type: "textarea", colSpan: 2 },
      { name: "disclosureNote", label: "Disclosure requirements", type: "textarea", colSpan: 2 },
      { name: "taxRef", label: "PAN / tax reference", type: "text" },
      { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
    ],
  },

  "media-contacts": {
    model: "mediaContact",
    slug: "media-contacts",
    title: "Media contacts",
    singular: "Journalist",
    description: "Reporters and publications used when pitching PR stories.",
    titleField: "name",
    orderBy: { name: "asc" },
    module: "campaigns",
    fields: [
      { name: "name", label: "Name", type: "text", required: true, inList: true },
      { name: "publication", label: "Publication", type: "text", inList: true },
      { name: "beat", label: "Beat", type: "text", inList: true, placeholder: "Technology" },
      { name: "email", label: "Email", type: "email" },
      { name: "phone", label: "Phone", type: "text" },
      { name: "city", label: "City", type: "text" },
      { name: "notes", label: "Notes", type: "textarea", colSpan: 2 },
    ],
  },

  "reward-rules": {
    model: "rewardRule",
    slug: "reward-rules",
    title: "Reward rules",
    singular: "Reward rule",
    description: "How referral commission is calculated, and when it becomes payable.",
    titleField: "name",
    orderBy: { name: "asc" },
    module: "partners",
    fields: [
      { name: "name", label: "Rule name", type: "text", required: true, inList: true },
      {
        name: "type",
        label: "Calculation",
        type: "select",
        defaultValue: "PERCENTAGE",
        inList: true,
        options: [
          { value: "PERCENTAGE", label: "Percentage of deal" },
          { value: "FIXED", label: "Fixed amount" },
          { value: "SLAB", label: "Slab based" },
        ],
      },
      { name: "value", label: "Value", type: "number", inList: true, help: "Percentage, or rupees for a fixed reward." },
      {
        name: "triggerOn",
        label: "Payable when",
        type: "select",
        defaultValue: "INVOICE_PAID",
        inList: true,
        options: [
          { value: "INVOICE_PAID", label: "The invoice is paid" },
          { value: "DEAL_WON", label: "The deal is won" },
        ],
      },
      { name: "isActive", label: "Active", type: "boolean", defaultValue: true, inList: true },
    ],
  },

  // ---------------------------------------------------------------- chatbot

  "chatbot": {
    model: "chatAnswer",
    slug: "chatbot",
    title: "Chatbot training",
    singular: "Answer",
    description:
      "What the website assistant replies. Each row is one question: list the words a visitor might use, write the answer, and it goes live immediately. Services, pricing, portfolio and contact are answered from live site data unless a row overrides them.",
    titleField: "question",
    orderBy: { order: "asc" },
    module: "chats",
    sortable: true,
    fields: [
      {
        name: "question",
        label: "Question",
        type: "text",
        required: true,
        inList: true,
        colSpan: 2,
        placeholder: "Do you offer AMC / maintenance?",
        help: "Also matched against, so phrase it the way a visitor would.",
      },
      {
        name: "keywords",
        label: "Trigger words",
        type: "taglist",
        colSpan: 2,
        placeholder: "e.g. maintenance",
        help: "Any of these appearing in a visitor's message picks this answer. The longest match wins, so add specific phrases as well as single words.",
      },
      {
        name: "reply",
        label: "Answer",
        type: "textarea",
        required: true,
        colSpan: 2,
        help: "Plain text. Line breaks are kept, so a bulleted list works.",
      },
      {
        name: "followUps",
        label: "Follow-up chips",
        type: "taglist",
        colSpan: 2,
        placeholder: "e.g. What does it cost?",
        help: "Offered as tappable chips after the answer. Each one is sent back as if the visitor had typed it.",
      },
      {
        name: "intent",
        label: "Replaces built-in answer",
        type: "select",
        defaultValue: "",
        options: [
          { value: "", label: "Nothing — this is a new question" },
          { value: "greeting", label: "Greeting" },
          { value: "services", label: "What do you do" },
          { value: "pricing", label: "Pricing" },
          { value: "portfolio", label: "Our work" },
          { value: "contact", label: "Contact details" },
          { value: "timeline", label: "How long it takes" },
          { value: "calculator", label: "Cost calculator" },
          { value: "unknown", label: "When nothing matches" },
        ],
        help: "Use this to take over one of the built-in replies instead of adding a new question.",
      },
      {
        name: "isQuickReply",
        label: "Show as an opening chip",
        type: "boolean",
        defaultValue: false,
        help: "Offered before the visitor has typed anything. Leave off and the built-in chips are used.",
      },
      {
        name: "handsOff",
        label: "Hand over to a person after this",
        type: "boolean",
        defaultValue: false,
        help: "Asks for the visitor's details and queues the chat for the team.",
      },
      { name: "isActive", label: "Active", type: "boolean", defaultValue: true, inList: true },
      {
        name: "hits",
        label: "Times used",
        type: "number",
        defaultValue: 0,
        inList: true,
        help: "Counted automatically each time this answer is given — it shows which questions visitors actually ask.",
      },
      ORDER_FIELD,
    ],
  },

  "message-templates": {
    model: "messageTemplate",
    slug: "message-templates",
    title: "Message templates",
    singular: "Template",
    description: "Reusable email, WhatsApp and SMS copy. Use {{placeholders}} for values.",
    titleField: "name",
    orderBy: { key: "asc" },
    module: "integrations",
    fields: [
      { name: "name", label: "Template name", type: "text", required: true, inList: true },
      { name: "key", label: "Key", type: "text", required: true, inList: true, help: "Referenced in code, e.g. renewal_reminder." },
      {
        name: "channel",
        label: "Channel",
        type: "select",
        defaultValue: "EMAIL",
        inList: true,
        options: [
          { value: "EMAIL", label: "Email" },
          { value: "WHATSAPP", label: "WhatsApp" },
          { value: "SMS", label: "SMS" },
        ],
      },
      { name: "subject", label: "Subject", type: "text", colSpan: 2 },
      { name: "body", label: "Body", type: "textarea", required: true, colSpan: 2 },
      { name: "providerTemplateId", label: "Provider template id", type: "text", help: "Required for approved WhatsApp templates." },
      { name: "isActive", label: "Active", type: "boolean", defaultValue: true, inList: true },
    ],
  },
};

export function getCollection(slug: string): Collection | undefined {
  return COLLECTIONS[slug];
}
