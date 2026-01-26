
# Plan: Make Privacy Policy and Terms of Service More Visible in Customer Portal Settings

## Problem
The Privacy Policy and Terms of Service links are currently hidden inside the "Appearance" tab under a "More" section. Users need to be on the Appearance tab AND scroll down to find them, making them difficult to discover.

## Solution
Add a dedicated **"Legal"** tab to the Settings page that prominently displays the Privacy Policy, Terms of Service, and Cookie Policy links. This will make these important documents easily accessible from the main settings navigation.

---

## Implementation Steps

### Step 1: Add a new "Legal" tab to the Settings tabs list
- Add a new tab trigger with a `Scale` (or `FileText`) icon labeled "Legal"
- Position it as the last tab in the navigation

### Step 2: Create the Legal tab content
- Add a new `TabsContent` for the "Legal" value
- Include a card with clear links to:
  - Terms of Service (`/terms`)
  - Privacy Policy (`/privacy`)  
  - Cookie Policy (`/cookies`)
- Each link will have an icon, title, description, and chevron arrow (matching existing design pattern)

### Step 3: Keep the "More" section in Appearance tab
- The existing links in the Appearance tab will remain for convenience
- This provides multiple access points for legal documents

---

## Technical Details

**File to modify:** `src/pages/CustomerSettings.tsx`

**Changes:**
1. Import `Scale` icon from `lucide-react` (for legal/balance icon)
2. Add new tab trigger in `TabsList`:
   ```tsx
   <TabsTrigger value="legal" className="gap-2">
     <Scale className="h-4 w-4" />
     <span className="hidden sm:inline">Legal</span>
   </TabsTrigger>
   ```
3. Add new `TabsContent` with legal document links styled consistently with existing design patterns
4. Update grid columns from `lg:grid-cols-5` to `lg:grid-cols-6` to accommodate the new tab

**Legal links to include:**
| Document | Route | Icon | Description |
|----------|-------|------|-------------|
| Terms of Service | `/terms` | FileText | Our terms of use agreement |
| Privacy Policy | `/privacy` | Shield | How we protect your data |
| Cookie Policy | `/cookies` | Cookie | How we use cookies |

---

## Expected Outcome
After implementation, customers will see a dedicated "Legal" tab in their Settings page that provides clear, easy access to all legal documents including the Privacy Policy and Terms of Service.
