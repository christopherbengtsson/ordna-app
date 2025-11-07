# i18n (Internationalization) Setup

## Overview

This project uses **react-i18next** for multi-language support with full TypeScript type safety and autocomplete for translation keys.

## Current Languages

- **English** (`en`) - Default
- **Swedish** (`sv`)

## Architecture

### Directory Structure

```
frontend/src/locales/
├── en/
│   ├── common.json          # Shared UI elements (~30 strings)
│   ├── game-setup.json      # Pre-game flow (~50 strings) [DEFAULT]
│   ├── gameplay.json        # Active gameplay (~40 strings)
│   ├── results.json         # Outcomes & history (~50 strings)
│   └── validation.json      # Errors & toasts (~25 strings)
├── sv/
│   └── [same structure]
├── i18n.ts                  # Configuration
└── README.md                # This file

frontend/src/@types/
└── i18next.d.ts             # TypeScript type definitions
```

### Key Concepts

- **UI Language** (locale): Language of the interface (buttons, labels, messages)
- **Game Dictionary Language**: Which word list to validate against (set per game)
- **These are INDEPENDENT** - you can have Swedish UI and play English word games

### Namespace Strategy

We use **5 namespaces** organized by semantic purpose:

#### **1. `common` (Fallback Namespace)**

Reusable UI elements used across the entire app.

**Contains:**

- Language switcher
- Navigation ("Back to Games", "Close")
- Generic buttons ("Start", "Cancel", "Create")
- Loading states
- Shared terminology

**Why:** Prevents missing translations, always available as fallback

---

#### **2. `game-setup` (Default Namespace)**

Pre-game flow - most frequently accessed.

**Features:** create-game, game-list, lobby, invitation

**Contains:**

- Game creation forms
- Game list sections
- Lobby system
- Empty states

**Why:** Most users start here, set as default for optimal performance

---

#### **3. `gameplay`**

Active gameplay interface.

**Features:** in-game, waiting-room

**Contains:**

- Action buttons
- Timer messages
- Turn instructions
- Scoreboard

**Why:** Logical grouping by game state, can lazy-load when game starts

---

#### **4. `results`**

Turn outcomes and game completion.

**Features:** move-result, game-over, game-history

**Contains:**

- Move result messages (40+ variations)
- Game over screen
- Round history

**Why:** Complex conditional logic, many variations

---

#### **5. `validation`**

Error messages and validation.

**Contains:**

- Toast success/error messages
- Form validation errors
- Error pages (404, etc.)

**Why:** Centralized error handling, matches i18next best practice

---

## Translation Resolution

When you request a translation, i18next follows this hierarchy:

```
1. Current namespace (default: game-setup)
2. Fallback namespace (common)
3. Current language (en/sv)
4. Fallback language (en)
5. Return key itself if not found
```

**Example:**

```tsx
const { t } = useTranslation(); // Uses default namespace (game-setup)
t('navigation.close'); // Not in game-setup → checks common → found!
```

This means:

- ✅ Most common translations resolve instantly (game-setup)
- ✅ Shared UI always available (common fallback)
- ✅ No "key not found" errors for common elements

---

## How to Use

### Basic Usage (Default Namespace)

```tsx
import { useTranslation } from 'react-i18next';

function GameListPage() {
  const { t } = useTranslation(); // Uses default namespace: game-setup

  return (
    <div>
      <h1>{t('gameList.title')}</h1>
      <p>{t('gameList.empty.description')}</p>
    </div>
  );
}
```

### Specific Namespace

```tsx
function ActionButtons() {
  const { t } = useTranslation('gameplay'); // Specify namespace

  return (
    <div>
      <button>{t('actions.callBluff')}</button>
      <button>{t('actions.fold')}</button>
    </div>
  );
}
```

### Multiple Namespaces

```tsx
function GameOver() {
  // Load multiple namespaces
  const { t } = useTranslation(['results', 'common']);

  return (
    <div>
      <h1>{t('gameOver.title', { nickname: 'Alice' })}</h1>
      <button>{t('common:navigation.close')}</button> {/* Explicit namespace */}
    </div>
  );
}
```

### Access Non-Default Namespace

```tsx
function MyComponent() {
  const { t } = useTranslation(); // Uses default (game-setup)

  return (
    <div>
      {/* Access common namespace with ns option */}
      <button>{t('language.label', { ns: 'common' })}</button>

      {/* Or with namespace prefix */}
      <button>{t('common:navigation.close')}</button>
    </div>
  );
}
```

---

## Best Practices

### 1. Interpolation Strategy

**✅ GOOD - Runtime Values (User Names, Timestamps)**

```json
{
  "markedPlayer": "{{nickname}} got a mark.",
  "timeLeft": "Time left: {{seconds}}s"
}
```

```tsx
t('markedPlayer', { nickname: 'Alice' }); // "Alice got a mark."
```

**❌ BAD - Known Values**

```json
{
  // DON'T DO THIS
  "payment": "Charged to {{paymentType}}"
}
```

Why? Different languages have different grammar rules. In German, this requires different articles ("der" vs "dem") based on the value, breaking localization.

**✅ BETTER - Separate Complete Keys**

```json
{
  "paymentCredit": "Charged to credit card",
  "paymentPaypal": "Charged to PayPal"
}
```

**Our Policy:**

- ✅ Player names/nicknames → **Must use interpolation** (runtime values)
- ✅ Counts/numbers → **Use interpolation**
- ✅ Timestamps → **Use interpolation**
- ❌ Game settings/options → **Use separate keys**
- ❌ Static content → **No interpolation**

---

### 2. Interpolation with Pluralization

i18next handles plurals automatically:

```json
{
  "action": "{{count}} action",
  "action_plural": "{{count}} actions"
}
```

```tsx
t('action', { count: 1 }); // "1 action"
t('action', { count: 5 }); // "5 actions"
```

Swedish follows the same pattern:

```json
{
  "action": "{{count}} handling",
  "action_plural": "{{count}} handlingar"
}
```

---

### 3. Key Naming Convention

**✅ Use nested structure:**

```json
{
  "create": {
    "title": "Create New Game",
    "form": {
      "nickname": "Your Nickname"
    },
    "actions": {
      "create": "Create Game"
    }
  }
}
```

**❌ Don't use flat keys:**

```json
{
  "createTitle": "Create New Game",
  "createFormNickname": "Your Nickname"
}
```

**Why:** Nested keys provide context and better TypeScript autocomplete.

---

### 4. Namespace Selection Guide

| Need to translate... | Use namespace | Example key                   |
| -------------------- | ------------- | ----------------------------- |
| Navigation, buttons  | `common`      | `navigation.close`            |
| Language switcher    | `common`      | `language.label`              |
| Game creation form   | `game-setup`  | `create.form.nickname`        |
| Game list            | `game-setup`  | `gameList.status.yourTurn`    |
| Lobby/invitation     | `game-setup`  | `lobby.startGame`             |
| Game actions         | `gameplay`    | `actions.callBluff`           |
| Timer/sequence       | `gameplay`    | `timer.timeLeft`              |
| Move results         | `results`     | `moveResult.titles.wordValid` |
| Game over screen     | `results`     | `gameOver.title`              |
| Toast messages       | `validation`  | `toast.success.gameCreated`   |
| Form validation      | `validation`  | `form.fillAllFields`          |
| Error pages          | `validation`  | `errors.notFound.title`       |

---

## Adding New Translations

### Step 1: Choose the Right Namespace

Ask yourself:

1. Is it shared UI used everywhere? → `common`
2. Is it pre-game flow? → `game-setup`
3. Is it during active gameplay? → `gameplay`
4. Is it about outcomes/results? → `results`
5. Is it an error/toast? → `validation`

### Step 2: Add to English File

Edit `frontend/src/locales/en/[namespace].json`:

```json
{
  "mySection": {
    "greeting": "Hello {{name}}!",
    "farewell": "Goodbye!"
  }
}
```

### Step 3: Add to Swedish File

Edit `frontend/src/locales/sv/[namespace].json`:

```json
{
  "mySection": {
    "greeting": "Hej {{name}}!",
    "farewell": "Hejdå!"
  }
}
```

### Step 4: Use in Component

```tsx
const { t } = useTranslation('[namespace]');
return <div>{t('mySection.greeting', { name: 'Alice' })}</div>;
```

**TypeScript will autocomplete** `mySection.greeting` for you!

---

## Language Persistence

- Language choice is saved in **localStorage** (key: `dansk-ui-language`)
- On first visit: Auto-detects from browser language
- User can manually switch using `<LanguageSwitcher />` component
- Choice persists across sessions
- Independent from game dictionary language

**Resolution order:**

1. localStorage (if user previously selected)
2. Browser language (`navigator.language`)
3. Fallback to English

---

## TypeScript Support

### Autocomplete

Translation keys have full autocomplete support:

```tsx
const { t } = useTranslation('gameplay');
t('actions.'); // IDE will suggest: callBluff, callComplete, fold, startTurn, resolveBluff
```

### Type Safety

Invalid keys show TypeScript errors:

```tsx
t('invalid.key'); // ❌ TypeScript error
t('actions.callBluff'); // ✅ Valid
```

### Adding Types for New Keys

Types are automatically generated from JSON files. No manual updates needed!

The TypeScript declaration file (`@types/i18next.d.ts`) imports resources directly:

```typescript
import { resources, defaultNS } from '../locales/i18n';

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: typeof defaultNS;
    resources: (typeof resources)['en'];
    returnNull: false;
  }
}
```

This means when you add keys to JSON files, TypeScript immediately knows about them.

---

## Migration Examples

### Example 1: Game Creation Form

**Before:**

```tsx
<Label htmlFor="playerName">Your Nickname</Label>
<Input placeholder="Enter your nickname" />
<Button>{isCreating ? 'Creating...' : 'Create Game'}</Button>
```

**After:**

```tsx
const { t } = useTranslation('game-setup');

<Label htmlFor="playerName">{t('create.form.nickname')}</Label>
<Input placeholder={t('create.form.nicknamePlaceholder')} />
<Button>
  {isCreating ? t('create.actions.creating') : t('create.actions.create')}
</Button>
```

---

### Example 2: Action Buttons

**Before:**

```tsx
<Button onClick={handleCallBluff}>
  <span>Call Bluff</span>
</Button>
<Button onClick={handleFold}>
  <span>Fold</span>
</Button>
```

**After:**

```tsx
const { t } = useTranslation('gameplay');

<Button onClick={handleCallBluff}>
  <span>{t('actions.callBluff')}</span>
</Button>
<Button onClick={handleFold}>
  <span>{t('actions.fold')}</span>
</Button>
```

---

### Example 3: Toast Notifications

**Before:**

```tsx
toast.success('Game created successfully!');
toast.error(`Failed to create game: ${error.message}`);
```

**After:**

```tsx
const { t } = useTranslation('validation');

toast.success(t('toast.success.gameCreated'));
toast.error(t('toast.error.createGameFailed', { message: error.message }));
```

---

### Example 4: Complex Move Results

**Before:**

```tsx
if (wasEliminated) {
  return isUserMarked
    ? 'You called a valid word. The previous player has been eliminated.'
    : `${markedPlayerNickname} was eliminated for completing the word.`;
}
```

**After:**

```tsx
const { t } = useTranslation('results');

if (wasEliminated) {
  return isUserMarked
    ? t('moveResult.descriptions.callWord.valid.eliminatedYou')
    : t('moveResult.descriptions.callWord.valid.eliminatedOther', {
        nickname: markedPlayerNickname,
      });
}
```

---

## Testing

### Test Language Switching

1. Navigate to the game list page
2. Click the language dropdown in the header
3. Select "Swedish" or "English"
4. Verify translations update immediately
5. Refresh the page - language should persist

### Test Namespace Resolution

```tsx
// Test default namespace
const { t } = useTranslation();
console.log(t('gameList.title')); // Should work (default namespace)

// Test fallback
console.log(t('navigation.close')); // Should work (fallback to common)

// Test explicit namespace
const { t: tGame } = useTranslation('gameplay');
console.log(tGame('actions.callBluff')); // Should work
```

### Test Browser Detection

1. Clear localStorage: `localStorage.removeItem('dansk-ui-language')`
2. Set browser language to Swedish
3. Refresh the page
4. UI should load in Swedish

---

## Performance Considerations

### Current Setup

- All namespaces load upfront
- Total size: ~200 strings across 5 files
- Very fast, no noticeable delay

### Future Optimization (If Needed)

If the app grows significantly, you can enable lazy loading:

```typescript
// In component
const { t } = useTranslation('gameplay', { useSuspense: true });
```

This loads the namespace on-demand when the component mounts.

**When to consider:**

- Total translations exceed ~1000 strings
- Individual namespaces exceed 300 strings
- Users complain about initial load time

For now, loading all upfront is simpler and performs well.

---

## Translator Notes

### Grammar Considerations

When translating interpolated strings, remember:

**English:**

- "{{nickname}} got a mark" works for all names

**Swedish:**

- May need gender/case adjustments
- Consider: "{{nickname}} fick ett märke"

**For complex cases:**

- Use separate keys for different grammar forms
- Avoid interpolation when grammar varies significantly

### Context is Important

Translation files include nested structure for context:

```json
{
  "actions": {
    "callBluff": "Call Bluff" // In-game action
  },
  "form": {
    "nickname": "Nickname" // Form label
  }
}
```

The nesting tells you where/how the string is used.

---

## Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)
- [i18next TypeScript Guide](https://www.i18next.com/overview/typescript)
- [i18next Best Practices](https://www.i18next.com/principles/best-practices)
- [i18next Namespaces](https://www.i18next.com/principles/namespaces)

---

## Summary

✅ **5 namespaces** organized by semantic purpose
✅ **game-setup** as default namespace (most accessed)
✅ **common** as fallback namespace (shared UI)
✅ **Minimize interpolation** - only for runtime values
✅ **Full TypeScript support** with autocomplete
✅ **Translation resolution** optimized for performance
✅ **~200 strings** ready to migrate incrementally

The infrastructure is production-ready. Migrate components one at a time!
