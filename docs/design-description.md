# Design Description

Visual identity, design system, UX principles, and component documentation for the Hellenic Directory of America. This guide applies to all four platforms: web (Next.js), iOS (SwiftUI), Android (Jetpack Compose), and the backend (email templates).

---

## Brand Identity

### Mission Statement in Design Terms

The Hellenic Directory of America serves a community rooted in heritage, Orthodox Christianity, and cultural pride. The design reflects this through:

- **Timeless over trendy** — serif headline typography, classical proportions, restrained decoration
- **Warmth over coldness** — warm navy and gold rather than corporate blue and gray
- **Community over enterprise** — intimate spacing, personal profiles, not a marketplace or data product

### Visual Character

The visual language draws from three sources:
1. Byzantine iconographic tradition — gold accents, deep navy, meander (Greek key) ornamental details
2. Classical Greek architecture — clean geometry, symmetry, dignified whitespace
3. Modern digital clarity — legible type sizes, clear hierarchy, touch-accessible interactive targets

---

## Color Palette

All colors are defined in code as named constants on every platform.

### Primary Palette

| Name | Hex | RGB | Usage |
|---|---|---|---|
| **Warm Navy** | `#0D1B2A` | 13, 27, 42 | Primary background, large surfaces, text on light backgrounds |
| **Byzantine Gold** | `#D4A574` | 212, 165, 116 | Primary accent, CTA buttons, links, icons, headings on dark |
| **Cream** | `#F5EDD6` | 245, 237, 214 | Body text on dark backgrounds, card surfaces on dark themes |
| **Muted** | `#8B9BAE` | 139, 155, 174 | Secondary text, placeholders, dividers, disabled states |

### Secondary / Semantic

| Name | Hex | Usage |
|---|---|---|
| **Surface White** | `#FFFFFF` | Card backgrounds on light theme |
| **Light Background** | `#F8F6F1` | Page background on light theme |
| **Error Red** | Material 3 error | Validation errors, destructive actions |
| **Success Green** | System green | Confirmation states |

### Usage Rules

- **Never** place Gold (`#D4A574`) on white — contrast ratio is insufficient for WCAG AA compliance
- **Always** use Gold on Navy (`#0D1B2A`) — 7.2:1 contrast ratio, passes WCAG AAA
- **Always** use Cream (`#F5EDD6`) on Navy — 13.9:1 contrast ratio
- **Do not** use pure black (`#000000`) for body text — use Warm Navy or near-black

### Platform Color Constants

**Web (Tailwind CSS custom values in `tailwind.config.ts`):**
```css
--color-navy:  #0D1B2A;
--color-gold:  #D4A574;
--color-cream: #F5EDD6;
--color-muted: #8B9BAE;
```

**iOS (`DesignSystem/HDColors.swift`):**
```swift
static let navy  = Color(hex: "#0D1B2A")
static let gold  = Color(hex: "#D4A574")
static let cream = Color(hex: "#F5EDD6")
static let muted = Color(hex: "#8B9BAE")
```

**Android (`ui/designsystem/Theme.kt`):**
```kotlin
val HDNavy  = Color(0xFF0D1B2A)
val HDGold  = Color(0xFFD4A574)
val HDCream = Color(0xFFF5EDD6)
val HDMuted = Color(0xFF8B9BAE)
```

---

## Typography

### Type Scale

The design uses two typefaces:

| Role | Typeface | Rationale |
|---|---|---|
| **Display / Headlines** | Cormorant Garamond (web) / Libre Baskerville (web fallback) | Classical serif with Greek cultural resonance; elegant at large sizes |
| **Body / UI** | Inter | High legibility at small sizes; neutral and modern |

The combination creates contrast between decorative and functional type — headlines feel ceremonial, body text feels clear and readable.

### Web Type Sizes (Tailwind + custom CSS variables)

```css
/* Headlines — Libre Baskerville (Google Fonts) */
h1: font-size: 2.25rem (36px); font-family: var(--font-libre-baskerville); line-height: 1.2;
h2: font-size: 1.875rem (30px); font-family: var(--font-libre-baskerville);
h3: font-size: 1.5rem (24px);   font-family: var(--font-libre-baskerville);

/* Body — Inter (Google Fonts) */
body: font-size: 1rem (16px);    font-family: var(--font-inter); line-height: 1.6;
small: font-size: 0.875rem (14px);
label: font-size: 0.75rem (12px); letter-spacing: 0.025em;
```

### iOS Typography (SwiftUI)

```swift
.headlineLarge  → Libre Baskerville 28pt (title screens)
.headlineMedium → Libre Baskerville 22pt (section headers)
.headlineSmall  → Libre Baskerville 18pt (card titles)
.titleMedium    → Inter SemiBold 16pt
.bodyMedium     → Inter Regular 14pt
.bodySmall      → Inter Regular 12pt
.labelMedium    → Inter Medium 12pt
.labelSmall     → Inter Regular 10pt
```

### Android Typography (Material 3 + custom)

Android uses Material 3's type scale with Inter as the default typeface (overriding Roboto) and Libre Baskerville for display-level text applied manually via `TextStyle`.

---

## Iconography

- **Style**: Material Symbols (outlined, 24dp)
- **Primary icon tint**: Byzantine Gold (`#D4A574`) on dark backgrounds; Warm Navy on light backgrounds
- **Secondary icon tint**: Muted (`#8B9BAE`)
- **Size**: 24dp standard, 20dp in dense lists, 48dp for hero/empty states

Common icons used throughout:
- Parishes: `church` / `place`
- Businesses: `store` / `work`
- Directories: `group` / `people`
- Messages: `email` / `forum`
- Profile: `person` / `account_circle`
- Settings: `settings`
- Add/Invite: `person_add`
- Logout: `exit_to_app`
- Delete: `delete_forever`

---

## Ornamental Elements

### Meander (Greek Key) Divider

The Greek key (meander) pattern appears as a decorative horizontal divider throughout the app. It is rendered as a simple gold-tinted `Divider` line — a visual nod to the pattern without the complexity of a full SVG rendering.

```swift
// iOS — HDMeanderDivider
Divider().foregroundColor(.gold.opacity(0.4))

// Android — HDMeanderDivider composable
Divider(thickness = 1.5.dp, color = HDGold.copy(alpha = 0.4f))

// Web — CSS border
border-bottom: 1.5px solid rgba(212, 165, 116, 0.4);
```

### Avatar Initials

When a user has no profile photo, their initials are displayed in a circular avatar with a navy background and cream text. Only the first one or two characters of the name are shown.

---

## Component Library

### Cards (`HDCard`)

Cards are the primary surface for displaying list items (parishes, businesses, members, messages).

- **Shape**: 12dp rounded corners
- **Background**: white / `Material.colorScheme.surface`
- **Elevation**: 1dp tonal elevation + 2dp shadow elevation (Android); `RoundedRectangle` + shadow (iOS)
- **Padding**: 16dp internal

### Primary Buttons (`HDPrimaryButton`)

Used for the most important action on a screen (register, sign in, send, create).

- **Background**: Byzantine Gold (`#D4A574`)
- **Text**: Warm Navy (`#0D1B2A`) — ensures contrast
- **Shape**: 10dp rounded corners
- **Height**: 50dp / 50pt
- **Loading state**: shows a circular progress indicator in navy
- **Disabled state**: opacity 50%

### Outlined Buttons

Used for secondary actions (cancel, back, essential-only cookie choice).

- **Border**: 1px gold/navy
- **Text**: gold/navy
- **Background**: transparent

### Destructive Buttons

Used for account deletion and other irreversible actions.

- **Background**: `MaterialTheme.colorScheme.error` (red)
- **Text**: white
- Always preceded by a confirmation dialog

### Search Bar (`HDSearchBar`)

- Leading search icon
- Trailing clear button (appears when query is non-empty)
- Gold focused border, muted unfocused border
- `ImeAction.Search` triggers the search callback

### Avatar (`HDAvatar`)

- Circular clip mask
- Loads from URL via Coil (Android) / `AsyncImage` (iOS)
- Falls back to initials on a navy background if no image

### Badge (`HDBadge`)

Small pill-shaped label used for roles and organization affiliations.

- Gold text, 12% opacity gold background
- `labelSmall` typography

### Section Header (`HDSectionHeader`)

Large serif headline followed by a meander divider. Used at the top of every major screen.

### Outlined Text Field (`HDOutlinedField`)

Custom-styled Material `OutlinedTextField`:
- Gold focused border
- Muted unfocused border
- Cream text on dark backgrounds (login/register screens)
- Password toggle handled via `PasswordVisualTransformation`

---

## Screen-by-Screen Design Notes

### Login / Register Screens

- Full-bleed Warm Navy background
- Centered content column with 32dp horizontal padding
- App name in large Byzantine Gold serif — "Hellenic Directory" + smaller "of America" below
- Meander divider separates branding from form
- Register screen includes three consent checkboxes — these must not be hidden, minimized, or pre-checked
- Submit button remains visually disabled (50% opacity) until all consents are checked

### Parish List / Search

- White/light background (public-facing, inviting)
- Full-width search bar at top
- Cards in a vertical `LazyColumn`/`List` with 8dp spacing
- Parish name in primary serif, address in muted body text
- Clergy name in gold label if present

### Parish Detail

- Map at the top (MapKit / Google Maps Compose)
- Church name as large headline over the map
- Address, phone, email in a card below
- Clergy section with avatar initials

### Business List

- Similar to parish list: search bar + card list
- Business logo in 48×48dp circle on left
- Category badge in gold on right

### Directory Member List

- Section header with member count
- Search bar for filtering
- Member cards: avatar + name + city + employer + org badges

### Inbox / Messages

- Two-panel layout (sidebar + chat) on tablets; single-column on phones
- Thread list on left: subject + preview text + unread indicator
- Chat area: bubble layout, sent messages right-aligned in navy, received left-aligned in surface variant
- Compose bar pinned to bottom

### Profile

- Centered avatar at top, large
- Name in serif headline, email in muted caption
- Role badge if non-default role
- Meander divider
- Info card with email/phone rows
- Logout button in error container color (red-tinted)
- Delete Account in outlined destructive style (below logout, visually distinct but not as prominent as logout to prevent accidents)

### Account Settings (Web)

- Clean, document-like layout, max-width 672px centered
- Data export section: outlined neutral button
- Account deletion section: red-bordered card with a list of consequences — deliberate friction before a destructive action

---

## Motion & Animation

- **Transitions**: system defaults — no custom animations beyond what the platform provides
- **Loading states**: circular progress indicators in Byzantine Gold
- **Feedback**: brief opacity changes on button press (system ripple on Android, system highlight on iOS)
- **No decorative animations** — keep performance consistent on older devices

---

## Accessibility

### WCAG 2.1 AA Requirements

All screens must meet WCAG 2.1 AA:

| Requirement | Implementation |
|---|---|
| Minimum contrast ratio 4.5:1 for body text | Gold on Navy: 7.2:1 ✓; Cream on Navy: 13.9:1 ✓ |
| Touch targets ≥ 44×44pt | All interactive elements 44pt/dp minimum |
| Focus indicators visible | Native platform focus rings retained |
| Screen reader compatibility | All images have `contentDescription` / `alt` text |
| Form labels | All inputs have associated labels |
| Error messages | All validation errors appear as text, not color alone |

### Screen Reader Notes

- All icons used decoratively have `contentDescription = null` to be skipped by screen readers
- All icons that convey meaning have a descriptive `contentDescription`
- Dialogs use `role="dialog"` and `aria-modal="true"` on web
- Cookie banner uses `role="dialog"` and `aria-live="polite"`

### Dynamic Type (iOS)

The app supports Dynamic Type. Text sizes scale with the user's system text size preference. All layouts use flexible `VStack`/`HStack` that accommodate larger text without clipping.

### Text Scaling (Android)

The app uses `sp` units for text sizes, respecting the user's font scale preference set in Android Accessibility settings.

---

## Email Templates

Email templates (backend `lib/mailer.ts`) follow the same visual identity:

- **Header**: Dark navy background with gold "Hellenic Directory" heading in Libre Baskerville
- **Body**: White background, Inter body text
- **CTA buttons**: Gold background, navy text, 8px rounded corners
- **Footer**: Muted text on navy, privacy policy link

All user-supplied content in email templates is HTML-escaped via `escapeHtml()` to prevent injection attacks. URLs are validated via `safeUrl()` to block `javascript:` and `data:` protocol injection.

---

## Design Anti-Patterns to Avoid

- **Pre-checked consent boxes** — consent must be an active affirmative action
- **Dark patterns on account deletion** — the confirmation flow must be clear, not confusing
- **Gold on white** — insufficient contrast
- **Clipping text at small sizes** — use `numberOfLines` / `maxLines` with ellipsis, not clipping
- **Hiding the Delete Account option** — required by App Store and Google Play policies; must be easily findable
- **Animated loading skeletons** — reserved for a future enhancement; current standard is a centered `CircularProgressIndicator`
