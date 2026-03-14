# Company Trade Dropdown Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the free-text trade input on the Companies page with a dropdown of standard Singapore construction trades, plus an "Other (specify)" option that reveals a text input.

**Architecture:** Single-file UI change to `src/app/projects/[id]/companies/page.tsx`. Add a `TRADES` constant and extract a `TradeSelect` inline helper that manages dropdown + conditional text input state. No API, DB, or test changes needed — trade is already stored as free text.

**Tech Stack:** React (useState), TypeScript, Tailwind CSS

---

### Task 1: Add TRADES constant and TradeSelect component

**Files:**
- Modify: `src/app/projects/[id]/companies/page.tsx`

**Step 1: Add the TRADES constant after the existing `COMPANY_ROLE_LABELS` block (around line 26)**

Add this immediately after `COMPANY_ROLE_LABELS`:

```ts
const TRADES = [
  'General Building',
  'Civil Engineering',
  'Structural Steel',
  'Electrical',
  'Mechanical & Plumbing',
  'Air-Conditioning & Mechanical Ventilation (ACMV)',
  'Fire Protection',
  'Scaffolding',
  'Painting & Decorating',
  'Tiling & Marble',
  'Carpentry & Joinery',
  'Roofing',
  'Waterproofing',
  'Demolition',
  'Piling',
  'Glazing',
  'Landscaping',
] as const
```

**Step 2: Add a TradeSelect helper component after the TRADES constant**

```tsx
function TradeSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const isOther = value !== '' && !TRADES.includes(value as typeof TRADES[number])
  const selectValue = isOther ? '__other__' : value

  return (
    <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
      <select
        value={selectValue}
        onChange={(e) => {
          if (e.target.value === '__other__') {
            onChange('')
          } else {
            onChange(e.target.value)
          }
        }}
        className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select trade...</option>
        {TRADES.map((t) => (
          <option key={t} value={t}>{t}</option>
        ))}
        <option value="__other__">Other (specify)</option>
      </select>
      {isOther && (
        <input
          type="text"
          placeholder="Specify trade"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          autoFocus
        />
      )}
    </div>
  )
}
```

**Step 3: Replace the trade text input in the Add Company form (lines 190–196)**

Replace:
```tsx
<input
  type="text"
  placeholder="Trade (e.g. Electrical Works)"
  value={addCompanyTrade}
  onChange={(e) => setAddCompanyTrade(e.target.value)}
  className="flex-1 min-w-[140px] px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
/>
```

With:
```tsx
<TradeSelect value={addCompanyTrade} onChange={setAddCompanyTrade} />
```

**Step 4: Replace the trade text input in the inline edit section (lines 229–237)**

Replace:
```tsx
<input
  type="text"
  value={editingTradeValue}
  onChange={(e) => setEditingTradeValue(e.target.value)}
  className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
  placeholder="Trade"
  autoFocus
  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTrade(company.id); if (e.key === 'Escape') setEditingTradeId(null) }}
/>
```

With a compact version of TradeSelect wired to `editingTradeValue`. Since the inline edit is small (text-xs), use an inline select + conditional input directly rather than reusing TradeSelect (which uses text-sm):

```tsx
<>
  <select
    value={
      editingTradeValue !== '' && !TRADES.includes(editingTradeValue as typeof TRADES[number])
        ? '__other__'
        : editingTradeValue
    }
    onChange={(e) => {
      if (e.target.value === '__other__') setEditingTradeValue('')
      else setEditingTradeValue(e.target.value)
    }}
    className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
    autoFocus
    onKeyDown={(e) => { if (e.key === 'Escape') setEditingTradeId(null) }}
  >
    <option value="">Select trade...</option>
    {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
    <option value="__other__">Other (specify)</option>
  </select>
  {editingTradeValue !== '' && !TRADES.includes(editingTradeValue as typeof TRADES[number]) && (
    <input
      type="text"
      value={editingTradeValue}
      onChange={(e) => setEditingTradeValue(e.target.value)}
      className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
      placeholder="Specify trade"
      autoFocus
      onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTrade(company.id); if (e.key === 'Escape') setEditingTradeId(null) }}
    />
  )}
</>
```

**Step 5: Manual verify**

1. Open the Companies page for any project
2. Click "Add Company" — trade field should be a dropdown
3. Select any standard trade → Add → company appears with that trade
4. Select "Other (specify)" → text input appears → type custom trade → Add → company appears with custom trade
5. Click an existing company's trade ("Add trade..." or existing value) → inline edit should show dropdown
6. Select a trade → Save → trade updates
7. Select "Other" → type custom → Save → trade updates

**Step 6: Commit**

```bash
git add "src/app/projects/[id]/companies/page.tsx"
git commit -m "feat: replace trade text input with standard trades dropdown"
git push
```
