# Current Data

> This file holds metrics, data points, and current state information relevant to your role and strategy. It provides Claude with concrete context for analysis and decision-making.

---

To complete your **Claude Code** workspace configuration, here are the final three context files. These are tailored to integrate **EverjoyAi Technology**, **MegaViews**, your **AI Music Avatar**, and **Lave Gallery** into the specific templates you provided.

### 1. strategy.md
**Path:** `context/strategy.md`
```markdown
# Strategy

> This file outlines current strategic priorities for the EverjoyAi and Lave Gallery ecosystem. Claude reads this to understand what you're working toward, enabling it to act as a thought partner aligned with your goals.

---

## How This Connects

- **business-info.md** provides organizational context
- **personal-info.md** defines your role and responsibilities
- **This file** captures what success looks like right now
- **current-data.md** tracks progress against these priorities

---

## Current Focus Period

Q1 - Q2 2026

## Strategic Priorities

1. **MegaViews Authority:** Execute and publish high-value business audits to establish B2B lead generation.
2. **"Vibe-Coded" Product Launch:** Deploy the first set of functional web apps and tools designed specifically for the creative industry.
3. **Entertainment Scaling:** Increase the YouTube following and music release cadence for the EverjoyAi AI Music Avatar.
4. **Artistic Synergy:** Finalize a tech-forward exhibition at Lave Gallery that utilizes EverjoyAi tools.

## What Success Looks Like

* A consistent pipeline of B2B strategy leads generated through the MegaViews channel.
* Successful community adoption of the first "vibe-coded" tool.
* Increased cross-platform engagement between the Avatar's music audience and the Gallery's art collectors.

## Key Decisions or Open Questions

* Determining which "vibe-coded" tool to prioritize for public beta first.
* Finding the right balance between technical transparency on MegaViews and the high-end curation of Lave Gallery.

---

_Update this as priorities shift. Claude uses this to help drive work in the right direction._
```

---

### 2. personal-info.md
**Path:** `context/personal-info.md`
```markdown
# Personal Info

> This file captures who you are as the founder of EverjoyAi and Lave Gallery. Claude reads this during `/prime` to understand your role and tailor assistance accordingly.

---

## How This Connects

- **business-info.md** sets the organizational stage
- **This file** defines your place within it
- **strategy.md** outlines what you're working toward
- **current-data.md** provides metrics that inform decisions

---

## Your Role

**Founder & Technical Strategist**
You lead the overarching vision for all brands, acting as the primary decision-maker for both technical AI development and artistic curation.

## Key Responsibilities

- **Technical Development:** Designing "vibe-coded" web apps and managing AI implementation strategies.
- **Content Strategy:** Leading the MegaViews "Behind the Scenes" channel and the AI Music Avatar's identity.
- **Curation:** Managing artist relationships and the exhibition roadmap for Lave Gallery.
- **Business Audits:** Performing the high-level marketing and operational audits featured on MegaViews.

## How This Workspace Helps

- **Code & Tool Generation:** Assisting in the rapid building and "vibe-coding" of new tools.
- **Audit Structuring:** Helping transform raw audit data into scripts and reports for MegaViews.
- **Strategy Alignment:** Ensuring that daily tasks contribute to the larger goals of all four brand pillars.

---

_Keep this concise — enough for Claude to understand your context, not an exhaustive biography._
```

---

### 3. current-data.md
**Path:** `context/current-data.md`
```markdown
# Current Data

> This file holds metrics and current state information for EverjoyAi, MegaViews, and Lave Gallery. It provides Claude with concrete context for analysis and decision-making.

---

## How This Connects

- **business-info.md** provides organizational context
- **personal-info.md** defines what you're responsible for
- **strategy.md** outlines what you're optimizing toward
- **This file** gives Claude the numbers behind the narrative

---

## Key Metrics

| Metric | Current Value | Target | Notes |
| ------ | ------------- | ------ | ----- |
| MegaViews YT Subs | [Value] | [Target] | B2B Authority |
| AI Avatar YT Subs | [Value] | [Target] | Entertainment reach |
| B2B Audit Leads | [Value] | [Target] | From MegaViews |
| Lave Gallery Sales | [Value] | [Target] | Art Revenue |

## Current State

* **EverjoyAi:** Currently refining the UI/UX "vibe" for the first creative industry tool.
* **MegaViews:** In production for a new "Business Audit" video featuring a marketing agency breakdown.
* **Lave Gallery:** Identifying artists for a summer collection focusing on AI-art intersections.

## Data Sources

* YouTube Studio (MegaViews/Avatar), Google Analytics (Websites), and Internal CRM.

---

## Automation Note

_This file works as a static snapshot, but can be enhanced with scripts that pull live data. Once comfortable with the workspace, consider adding a script to `scripts/` that refreshes this file from your data sources._

---

_Update regularly — stale data limits Claude's usefulness as an analytical partner._
```