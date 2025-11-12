# Traveller Combat VTT - Use Cases

**Last Updated:** 2025-11-11
**Purpose:** Document key use cases to guide development and demonstrate value

---

## Project Vision: Augment, Not Replace

**Core Principle:** This VTT is designed to **AUGMENT existing VTTs** (Roll20, Foundry, Fantasy Grounds), not replace them.

**Design Philosophy:**
- **Specialized Tool:** Best-in-class for Traveller starship operations
- **Complementary:** Works alongside existing VTTs for character sheets, maps, dice rolling
- **Focused Scope:** Ships, combat, space operations - not full RPG system
- **Easy Integration:** Pop open in browser tab/iframe during ship scenes
- **Return to Main VTT:** Combat resolves, sync results, continue campaign

**Use Cases Focus:**
- GM prep (ship design, encounter planning)
- Player prep (build their ship, understand mechanics)
- In-session augmentation (tactical combat, space operations)
- Between-session planning (upgrades, repairs, logistics)

---

## Overview

This document outlines use cases for the Traveller Combat VTT across all starship-related activities in a Traveller RPG campaign. These use cases inform feature prioritization and help validate design decisions.

**Organized by:**
1. **GM Preparation** - Before the session
2. **Player Preparation** - Before the session
3. **In-Session Gameplay** - During the session
4. **Between-Session Activities** - Campaign management
5. **Portfolio & Community** - Non-gameplay use cases

---

## Primary Use Cases

### Use Case 1: Tuesday Game Session (PRIMARY)

**Actor:** Bruce + Game Group
**Goal:** Run tactical space combat encounter during ongoing campaign
**Frequency:** Every other Tuesday

**Scenario:**
1. **Setup (5 minutes)**
   - GM (Bruce) opens deployed VTT on laptop
   - Players join via shared link (phones/tablets/laptops)
   - GM loads the party's custom ship "The Wandering Star" (designed in Ship Builder)
   - GM loads enemy ship "Pirate Corsair" (also custom-built)

2. **Combat (30-60 minutes)**
   - Initiative rolled (2D6 + pilot skill)
   - Players take turns:
     - Pilot: Changes range, evasive maneuvers
     - Gunners: Target enemy turrets, fire weapons
     - Engineer: Repairs critical hits
   - Missiles vs. point defense tactical decisions
   - Critical hits damage systems (M-drive, sensors, weapons)
   - Combat log shows all actions for narrative

3. **Resolution (5 minutes)**
   - Victor determined (ship destroyed or flees)
   - Damage persists to next session (save game state)
   - GM narrates outcome based on combat results
   - Players celebrate or regroup

**Success Criteria:**
- ✅ Combat runs smoothly without technical issues
- ✅ Players engaged and making tactical decisions
- ✅ Results feed back into campaign narrative
- ✅ Setup time minimal (<5 minutes)
- ✅ Fun, not frustrating

**Dependencies:**
- Stages 1-13 complete (core combat + ship builder + boarding)
- Stable multiplayer (Socket.io)
- Mobile-friendly UI (phone/tablet support)
- Campaign persistence (Stage 18)

---

### Use Case 2: Ship Design Session (Zero Session)

**Actor:** Game Group
**Goal:** Design the party's ship before campaign starts
**Frequency:** Once per campaign

**Scenario:**
1. **Planning (15 minutes)**
   - Group discusses ship type (trader vs. scout vs. corsair)
   - Agrees on budget (Cr 50 million)
   - Decides on priorities (cargo? weapons? speed?)

2. **Design (30-45 minutes)**
   - Bruce opens Ship Builder interface
   - Players collaborate on ship design:
     - Choose hull (400 ton Subsidized Merchant)
     - Add turrets (2× triple turrets)
     - Assign weapons (beam lasers + missile rack + sandcaster)
     - Customize armor (armor 6 for decent protection)
     - Name ship ("The Wandering Star")
     - Write ship description/backstory

3. **Save & Test (10 minutes)**
   - Export ship to JSON
   - Load in combat mode
   - Run test battle against pirate ship
   - Verify stats, weapons work correctly
   - Save for campaign use

**Success Criteria:**
- ✅ Ship builder intuitive, requires minimal explanation
- ✅ Real-time cost/tonnage tracking prevents invalid designs
- ✅ Players feel ownership of their ship
- ✅ Ship works correctly in combat
- ✅ Design process is FUN, not tedious

**Dependencies:**
- Stage 12 complete (Ship Builder)
- Validation prevents invalid ships
- Export/import JSON
- Combat integration

---

### Use Case 3: Portfolio Demo (Interview)

**Actor:** Bruce
**Goal:** Demonstrate project to potential $150/hr client in technical interview
**Frequency:** As needed for job applications

**Scenario:**
1. **Architecture Walkthrough (10 minutes)**
   - Show C4 diagrams (system, container, component)
   - Discuss Architecture Decision Records (ADRs):
     - Why Socket.io vs. WebRTC?
     - Why vanilla JS vs. React?
     - Why in-memory vs. Redis?
   - Explain scaling strategy (horizontal scaling, load balancer)
   - Discuss cost optimization (<$50/month for 100 users)

2. **Security Discussion (10 minutes)**
   - Walk through OWASP Top 10 threat model
   - Explain implemented protections:
     - Input validation (XSS prevention, 33 tests)
     - Rate limiting (planned)
     - Authentication (planned for production)
   - Discuss what WOULD be implemented in production
   - Show security checklist

3. **Live Demo (10 minutes)**
   - Open deployed app (AWS/Azure)
   - Show monitoring dashboard (CloudWatch/App Insights)
   - Demo ship builder (design custom ship)
   - Run combat scenario (multiplayer)
   - Highlight: "Real users, 99.9% uptime"

4. **Code Quality (10 minutes)**
   - Show test suite (95%+ coverage, 350+ tests)
   - Discuss TDD approach (tests-first development)
   - Walk through clean code examples
   - Mention AI repo score (9.0/10)

5. **Q&A (10 minutes)**
   - Interviewer asks technical questions
   - Bruce demonstrates deep knowledge:
     - "How would you scale to 1000 concurrent users?"
     - "What's your disaster recovery plan?"
     - "How would you handle a 10x traffic spike?"

**Success Criteria:**
- ✅ Demonstrates CTO-level thinking (not just coding)
- ✅ Shows ops/reliability engineering experience
- ✅ Security awareness evident
- ✅ Architecture well-documented
- ✅ Interviewer impressed, asks follow-up questions

**Dependencies:**
- Stage 14 complete (Architecture docs)
- Stage 15 complete (Security docs)
- Stage 16 complete (Deployment + monitoring)
- Stages 11-13 complete (full feature set)

---

### Use Case 4: Community Contribution

**Actor:** Traveller Reddit Community (r/Traveller)
**Goal:** Discover free VTT, share ship designs, provide feedback
**Frequency:** Ongoing after public launch

**Scenario:**
1. **Discovery (Week 1)**
   - Bruce posts: "Free Traveller Space Combat VTT - Open Source"
   - Includes screenshots, demo link, GitHub repo
   - r/Traveller community upvotes, discusses

2. **Early Adoption (Week 2-4)**
   - 20-50 GMs try it with their groups
   - Feedback flows in (bugs, feature requests, UX issues)
   - GitHub issues created, discussions active
   - Bruce iterates based on feedback

3. **Community Growth (Month 2-3)**
   - Players share custom ship designs (JSON files)
   - Unofficial ship library emerges (GitHub gists, Discord)
   - Community creates tutorials, videos
   - Word spreads to Mongoose forums, TravellerRPG Discord

4. **Ecosystem Development (Month 4+)**
   - Community contributes code (pull requests)
   - Third-party tools emerge (ship editors, scenario builders)
   - Mongoose Publishing notices
   - Potential official endorsement or partnership

**Success Criteria:**
- ✅ 50+ active users within first month
- ✅ Positive feedback on r/Traveller
- ✅ At least 5 community-contributed ship designs
- ✅ GitHub stars (50+)
- ✅ Mentioned on Mongoose forums

**Dependencies:**
- Stage 16 complete (Deployment)
- Stage 12 complete (Ship Builder - enables sharing)
- Stage 18 complete (Campaign persistence - retention)
- Good documentation (README, tutorials)
- Open-source license (MIT or GPL)

---

### Use Case 5: AI Repo Evaluation (9.0/10 Target)

**Actor:** Automated AI Repo Analysis Tool
**Goal:** Evaluate codebase quality for portfolio/interview purposes
**Frequency:** Monthly during development, on-demand for applications

**Scenario:**
1. **Code Quality Analysis**
   - Test coverage: 95%+ (350+ tests)
   - Code complexity: Low (avg cyclomatic complexity <10)
   - Documentation: Comprehensive (README, ADRs, inline comments)
   - Dependencies: Up-to-date, no vulnerabilities
   - Linting: No errors, consistent style

2. **Architecture Evaluation**
   - C4 diagrams present (system, container, component)
   - Architecture Decision Records (ADRs) documented
   - Clear separation of concerns (modular design)
   - Design patterns applied (Observer, Command, Facade)
   - Scalability considerations evident

3. **Security Assessment**
   - OWASP Top 10 threat model documented
   - Input validation comprehensive
   - Security tests present (XSS, injection, etc.)
   - Authentication/authorization plan
   - Secure coding practices evident

4. **DevOps Evaluation**
   - CI/CD pipeline (GitHub Actions)
   - Automated testing on commit
   - Deployment automation
   - Monitoring/observability (dashboards, alerts)
   - Logging strategy

5. **Professional Practices**
   - Git commit messages descriptive
   - Branch strategy (main, feature branches)
   - Issue tracking (GitHub issues)
   - Release notes/changelogs
   - Contributing guidelines

**Score Breakdown (Target: 9.0/10):**
- Code Quality: 2.0/2.0
- Architecture: 2.0/2.0
- Security: 1.5/2.0 (some planned features not implemented)
- DevOps: 1.5/2.0 (good but not perfect)
- Professional Practices: 2.0/2.0

**Success Criteria:**
- ✅ Overall score 9.0/10 or higher
- ✅ No category below 1.5/2.0
- ✅ All critical items addressed
- ✅ Demonstrates senior/principal level engineering

**Dependencies:**
- Stage 14 complete (Architecture docs)
- Stage 15 complete (Security docs)
- Stage 16 complete (DevOps/deployment)
- Comprehensive testing (Stages 1-13)
- Clean code refactoring (Stage 14)

---

## Secondary Use Cases

### Use Case 6: Solo Learning (New Players)

**Actor:** Player new to Traveller
**Goal:** Learn space combat rules through interactive play
**Frequency:** One-time (during rules learning)

**Scenario:**
1. Open VTT in two browser tabs
2. Play both sides (Scout vs. Free Trader)
3. See dice rolls, modifiers, damage calculation
4. Experiment with tactics (missiles, point defense, range changes)
5. Learn rules through play, not just reading

**Value:** Educational tool for rules learning

**Dependencies:**
- Stages 8-11 complete
- Clear combat log (shows calculations)
- Tutorial mode (optional, Stage 19)

---

### Use Case 7: Convention Demo (Mongoose Publishing)

**Actor:** Mongoose Publishing at GenCon
**Goal:** Demo Traveller to convention attendees
**Frequency:** Annual conventions

**Scenario:**
1. Projector shows combat on big screen
2. Two convention attendees play (or GM vs. player)
3. Quick setup (pre-built ships)
4. Visual feedback keeps audience engaged
5. Fast combat (10-15 minutes per battle)
6. Attendees scan QR code to play later

**Value:** Marketing tool for Mongoose

**Dependencies:**
- Stage 21 complete (UI/UX polish)
- Mobile support (tablets)
- Sound effects/animations (spectacle)
- QR code generation (easy access)

---

### Use Case 8: Ship Design Competition

**Actor:** Traveller Community
**Goal:** Community event - design best ship for specific scenario
**Frequency:** Monthly or quarterly

**Scenario:**
1. Announce challenge: "Design best 400-ton pirate hunter"
2. Constraints: Budget MCr 80, TL 12, combat-focused
3. Community designs ships, submits JSON files
4. Voting or automated tournament
5. Winner gets recognition, ship featured

**Value:** Community engagement, content generation

**Dependencies:**
- Stage 12 complete (Ship Builder)
- Stage 17 complete (Fleet battles for tournaments)
- Stage 18 complete (Campaign persistence for tournaments)

---

### Use Case 9: Integration with VTT Platforms

**Actor:** Roll20, Fantasy Grounds, or Foundry VTT user
**Goal:** Embed space combat into existing VTT session
**Frequency:** Per gaming session

**Scenario:**
1. GM running campaign in Roll20
2. Space combat encounter begins
3. GM clicks "Launch Space Combat" (embedded iframe)
4. Players join via link
5. Combat resolves in VTT overlay
6. Results sync back to Roll20 (damaged ship, casualties)

**Value:** Expands user base to VTT platforms

**Dependencies:**
- Stage 14 complete (VTT API integration)
- OAuth authentication (for VTT platforms)
- API endpoints for state sync

---

### Use Case 10: System Map Navigation (FUTURE - Stage 23)

**Actor:** Game Group
**Goal:** Navigate star system with top-down physics-accurate view
**Frequency:** Per gaming session (exploration + combat)

**Scenario:**
1. **System Entry**
   - GM opens system map view
   - TravellerMap.com integration loads system data
   - Shows: Main star, planets, jump points, stations
   - PC ship appears at jump point (accurate position)

2. **Navigation Phase**
   - Top-down solar system view
   - Physics-accurate orbital mechanics
   - PC ship maneuvers (thrust vectors, orbital transfers)
   - Time acceleration (hours/days)
   - Encounter triggers (pirates, patrols, anomalies)

3. **Combat Transition**
   - Encounter detected (e.g., pirate ambush near gas giant)
   - Zoom in from system map to tactical combat
   - Range determined by relative positions
   - Combat resolves (Stages 8-11 mechanics)
   - Zoom back out to system map

4. **Ongoing Navigation**
   - Track fuel consumption
   - Track time (in-system travel takes days/weeks)
   - Multiple ships visible (traders, patrols, etc.)
   - Animated orbits (optional, astrophysics-accurate)

**Success Criteria:**
- ✅ Seamless transition between system map and tactical combat
- ✅ TravellerMap.com data integrated (UWP, system stats)
- ✅ Physics-accurate (optional setting: realistic vs. gamey)
- ✅ Visual clarity (planets, ships, orbits distinguishable)
- ✅ Performance acceptable (60fps, thousands of objects)

**Value:**
- Immersive exploration experience
- Strategic layer (where to refuel, patrol routes)
- Astrophysics education (orbital mechanics)
- Unique feature (no other VTT has this)

**Dependencies:**
- Stage 23 (System Map Integration)
- TravellerMap.com API integration
- Physics engine (orbital mechanics)
- Canvas/WebGL rendering (performance)
- LOD system (level of detail for performance)

**Estimated Effort:**
- Time: 6-8 weeks (ambitious feature)
- LOC: ~1,500 production, ~500 test
- Tokens: ~20k

**Risks:**
- HIGH: Physics complexity (orbital mechanics)
- HIGH: Performance (render thousands of objects)
- MEDIUM: TravellerMap.com API availability
- LOW: User interest (niche feature)

**User Vision:**
> "I also have a vision, for later stages, to show an interactive top-down view of the current solar system. Ideally I'd like a clean transition from travellermap.com that includes system data on each system. As in, a top-down solar system view showing the PC ship and whatever is going on in the starsystem. Accurate to astrophysics maybe even to the point of animation. This is a late-stage nice-to-have"

---

## GM Preparation Use Cases

### GM-1: Planning a Pirate Ambush Encounter

**Context:** GM preparing next session, wants tactical pirate encounter
**Tools Used:** Main VTT (Roll20) + This VTT (ship design)

**Workflow:**
1. **In Roll20:**
   - Plan story: Players transporting cargo through dangerous system
   - Identify ambush location: Near gas giant
   - Decide pirate tactics: 2 corsairs vs. player ship

2. **In Traveller VTT (Ship Builder):**
   - Design pirate Corsair A (aggressive, beam lasers + missiles)
   - Design pirate Corsair B (support, sandcasters + point defense)
   - Export both ships to JSON
   - Test combat (solo, 2 tabs): Pirates vs. player's ship
   - Validate difficulty (should be tough but winnable)

3. **Back in Roll20:**
   - Add encounter notes: "Pirates demand cargo or combat"
   - Link to Traveller VTT combat instance
   - Prep narrative hooks (who are these pirates? why here?)

**Time:** 30 minutes (10 min story, 15 min ships, 5 min testing)

**Value:**
- Pre-designed ships ready for session
- Tested difficulty (no TPK surprise)
- GM confidence in encounter balance

---

### GM-2: Creating Ship NPCs for Sandbox Campaign

**Context:** GM running open-world Traveller campaign, needs variety of ships
**Tools Used:** This VTT (Ship Builder)

**Workflow:**
1. **Design Ship Library (2 hours, one-time):**
   - **Merchant Ships:** Fat Trader, Subsidized Merchant, Free Trader
   - **Military:** System Defense Boat, Patrol Cruiser, Frigate
   - **Pirates:** Corsairs (3 variants: light/medium/heavy)
   - **Corporate:** Corporate Courier, Mining Ship, Survey Vessel
   - **Navy:** Destroyer, Cruiser (if High Guard available)

2. **Save All to Folder:**
   - `campaign/ships/merchants/`
   - `campaign/ships/military/`
   - `campaign/ships/pirates/`
   - Export JSON for each

3. **Create Quick Reference:**
   - Spreadsheet: Ship name, role, threat level, weapons
   - Quick-load in VTT when encounter triggers

**Value:**
- Instant ship encounters (no on-the-fly design)
- Consistent world (same ships reappear)
- Varied tactical scenarios

---

### GM-3: Testing New House Rules

**Context:** GM wants to test custom rules (e.g., "double damage for rear attacks")
**Tools Used:** This VTT (solo testing)

**Workflow:**
1. **Modify Rules (if supported):**
   - House rule: Attacks from behind deal 2× damage
   - Adjust VTT settings or mentally apply rule

2. **Test Scenario:**
   - Open 2 tabs (attacker and defender)
   - Run 10 combat rounds with house rule
   - Observe balance (too powerful? underpowered?)

3. **Decide:**
   - Keep rule if balanced
   - Adjust (1.5× instead of 2×)
   - Discard if broken

**Value:**
- Validate house rules before introducing to players
- Avoid mid-session balance disasters

---

### GM-4: Prepping Multi-Session Ship Combat Arc

**Context:** GM planning 3-session arc involving prolonged ship pursuit
**Tools Used:** Main VTT + This VTT

**Workflow:**
1. **Session 1: First Encounter**
   - Pirates attack, players barely escape
   - Use this VTT for combat
   - Save ship damage state (hull 60%, M-drive critical hit)

2. **Between Sessions: Damage Persists**
   - Export damaged ship JSON
   - Players must decide: Repair now or flee?

3. **Session 2: Repair & Refit**
   - Players dock at station (main VTT roleplay)
   - Use Ship Builder to show repair options
   - Cost credits, takes time

4. **Session 3: Final Showdown**
   - Import repaired ship
   - Pirates return with reinforcements
   - Epic fleet battle (if Stage 17 implemented)

**Value:**
- Persistent ship state across sessions
- Consequences matter (damage sticks)
- Drama and tension build

---

### GM-5: Integrating with Foundry VTT

**Context:** GM runs campaign in Foundry VTT, needs space combat
**Tools Used:** Foundry VTT + This VTT (iframe embed)

**Workflow:**
1. **Setup (One-time):**
   - Deploy this VTT to cloud (Stage 16)
   - Add iframe module to Foundry
   - Configure API integration (Stage 14, if available)

2. **During Session:**
   - Space combat triggers in Foundry
   - GM clicks "Launch Space Combat" button
   - Iframe opens this VTT in Foundry overlay
   - Players join via link (or auto-join if API integrated)

3. **Combat Resolves:**
   - VTT handles all tactical combat
   - Damage, casualties sync back to Foundry
   - Close iframe, return to main campaign

**Value:**
- Seamless integration with existing VTT
- Best tool for space combat (specialized)
- No context-switching friction

---

## Player Preparation Use Cases

### Player-1: Designing the Party's Ship (Session Zero)

**Context:** Campaign starting, players want to design their ship together
**Tools Used:** This VTT (Ship Builder)

**Workflow:**
1. **Group Discussion (30 min):**
   - What role? (Trader, Explorer, Mercenary)
   - Budget? (Cr 50 million)
   - Priorities? (Speed? Weapons? Cargo?)

2. **Collaborative Design (1 hour):**
   - One player shares screen (Ship Builder open)
   - Group debates: "Should we get missiles or more armor?"
   - Try different configurations
   - Compromise: 400-ton Armed Merchant (2 turrets, decent cargo)

3. **Finalize:**
   - Name ship: "The Wandering Star"
   - Write backstory (where'd they get it? any debts?)
   - Export JSON, share with GM

**Value:**
- Player ownership (THEIR ship, not pre-gen)
- Collaborative storytelling
- Informed decisions (see trade-offs in real-time)

---

### Player-2: Learning Space Combat Mechanics

**Context:** New Traveller player wants to understand rules before campaign
**Tools Used:** This VTT (solo practice)

**Workflow:**
1. **Read Rulebook (1 hour):**
   - Understand attack rolls, damage, range bands

2. **Practice Combat (30 min):**
   - Open VTT in 2 tabs
   - Play both sides (Scout vs. Free Trader)
   - Experiment:
     - "What happens if I close range?"
     - "When should I use missiles vs. lasers?"
     - "How do critical hits work?"

3. **Join Campaign Confident:**
   - Knows mechanics
   - Can make tactical decisions
   - Doesn't slow down session

**Value:**
- Self-paced learning
- Interactive (not just reading)
- Confidence at table

---

### Player-3: Planning Ship Upgrades Between Sessions

**Context:** Player (ship owner) wants to upgrade ship during downtime
**Tools Used:** Main VTT (character sheet) + This VTT (Ship Builder)

**Workflow:**
1. **Check Resources:**
   - Character has Cr 2 million saved
   - Ship has 1 empty turret hardpoint

2. **Explore Options (Ship Builder):**
   - Load current ship JSON
   - Try adding:
     - Option A: Triple turret (beam lasers), Cr 1.2M
     - Option B: Double turret (pulse laser + missile), Cr 800K
     - Option C: Single turret (sandcaster), Cr 250K + armor upgrade

3. **Decide:**
   - Choose Option B (missiles add tactical options)
   - Export upgraded ship JSON
   - Tell GM: "I want to buy this upgrade at next station"

4. **GM Approves:**
   - Deduct credits (main VTT character sheet)
   - Import upgraded ship (this VTT)
   - Ready for next combat

**Value:**
- Player agency (customize ship over time)
- Informed spending (see exact stats before buying)
- Campaign progression (ship evolves)

---

### Player-4: Preparing for Known Combat Encounter

**Context:** Players know they're attacking pirate base next session
**Tools Used:** This VTT (tactical planning)

**Workflow:**
1. **GM Shares Intel:**
   - "Pirate base has 2 patrol ships orbiting"
   - GM exports enemy ships, shares JSONs
   - (Or just describes stats)

2. **Players Plan (Between Sessions):**
   - Import enemy ships into VTT
   - Run test combats (several tactics):
     - Tactic A: Ambush from long range with missiles
     - Tactic B: Close fast, board one ship
     - Tactic C: Distract one, focus fire other
   - Decide: "We'll use Tactic A - missiles from long range"

3. **Session Day:**
   - Players execute planned tactic
   - GM surprised: "They're actually coordinated!"
   - Combat feels strategic, not random

**Value:**
- Player engagement between sessions
- Strategic depth (not just improvise)
- Payoff for planning

---

### Player-5: Solo Ship Tinkering (Hobby)

**Context:** Player enjoys ship design, tinkers between sessions for fun
**Tools Used:** This VTT (Ship Builder)

**Workflow:**
1. **"What If" Scenarios:**
   - "What if we had bought the 600-ton ship instead?"
   - Design alternate ship
   - Compare stats (speed, weapons, cost)

2. **Dream Ships:**
   - Design ultimate ship (no budget limit)
   - Share with group: "Look what we could buy if we get rich!"

3. **Community Contribution:**
   - Upload cool designs to GitHub discussions
   - Other players use them in their campaigns

**Value:**
- Player engagement outside sessions
- Community building (share designs)
- Keeps enthusiasm high

---

## In-Session Gameplay Use Cases

### In-Session-1: Combat Encounter During Roll20 Session

**Context:** Space combat triggers mid-session
**Tools Used:** Roll20 (main) + This VTT (combat)

**Workflow:**
1. **Encounter Triggers (Roll20):**
   - GM narrates: "Sensors detect pirate ship closing fast"
   - GM: "Let's switch to space combat VTT"

2. **Launch Combat VTT:**
   - GM shares link in Roll20 chat
   - Players click link, opens in new tab
   - Ships load (pre-designed)

3. **Combat (20-40 min):**
   - Tactical turn-based combat
   - Players coordinate: "I'll fire missiles, you handle point defense"
   - GM narrates critical hits: "The laser burns through your M-drive!"

4. **Return to Roll20:**
   - Combat resolves (pirates flee)
   - Close VTT tabs
   - GM updates Roll20: "Your ship has 40% hull left"
   - Continue roleplay

**Value:**
- Specialized tool for combat (tactical depth)
- Main VTT stays clean (no combat clutter)
- Seamless transition back to roleplay

---

### In-Session-2: Running Fleet Battle

**Context:** Climactic battle - player fleet vs. enemy fleet
**Tools Used:** This VTT (fleet battles, Stage 17)

**Workflow:**
1. **Setup:**
   - GM loads 3 player ships, 5 enemy ships
   - Players each control 1 ship
   - Initiative rolled

2. **Coordinated Combat:**
   - Players use Discord/Zoom to coordinate
   - "Alpha wing: Focus fire on flagship"
   - "Bravo wing: Screen our damaged ship"
   - Fleet tactics matter

3. **Epic Conclusion:**
   - Flagship destroyed, enemies scatter
   - GM narrates: "The system is yours"
   - Players celebrate

**Value:**
- Epic-scale combat (not just 1v1)
- Coordination required (teamwork)
- Memorable campaign moments

---

### In-Session-3: Boarding Action

**Context:** Players board disabled pirate ship
**Tools Used:** Main VTT (deck map) + This VTT (boarding mechanics, Stage 13)

**Workflow:**
1. **Approach (Main VTT):**
   - GM shows deck map in Roll20
   - Players roleplay: "Stack up at airlock"

2. **Breach (This VTT):**
   - Resolve airlock breach (system mechanics)
   - Handle depressurization
   - Track crew combat

3. **Interior Combat (Main VTT):**
   - Return to Roll20 for dungeon-crawl style combat
   - VTT handled ship-to-ship mechanics
   - Main VTT handles personal combat

**Value:**
- Right tool for each phase
- Ship boarding feels distinct from ship combat
- Hybrid approach leverages both tools

---

### In-Session-4: Chase Through Star System

**Context:** Players fleeing enemy, cross-system pursuit
**Tools Used:** This VTT (System Map, Stage 23)

**Workflow:**
1. **Chase Begins:**
   - Players jump into system, enemy follows
   - GM opens System Map
   - Shows: Gas giant, mainworld, jump point

2. **Strategic Decisions:**
   - Players: "Head to gas giant to refuel?"
   - GM: "Enemy will catch you before you finish"
   - Players: "Run for jump point!"

3. **Pursuit:**
   - Time acceleration (hours pass)
   - Random encounter check (patrol ship offers help?)
   - Tension builds: "Enemy closing, 2 hours to jump point"

4. **Final Confrontation:**
   - Reach jump point, initiate jump sequence
   - Enemy fires parting shots
   - Zoom to tactical combat (this VTT)

**Value:**
- Strategic layer above tactical combat
- Cinematic chase scenes
- Time and space matter

---

## Between-Session Activities

### Between-1: Campaign Logistics (Fuel, Repairs, Cargo)

**Context:** Between sessions, players manage ship resources
**Tools Used:** This VTT (ship management) + Spreadsheet/Discord

**Workflow:**
1. **Post-Combat:**
   - Ship damaged (hull 50%, M-drive crit)
   - Low on fuel, ammo

2. **Players Discuss (Discord):**
   - "Where can we repair?"
   - "How much will it cost?"
   - "Can we afford it?"

3. **Make Decisions:**
   - Dock at station (main VTT roleplay next session)
   - Use Ship Builder to see repair costs
   - Budget: Repair hull, deal with crit later

4. **Track in Campaign Log:**
   - Update ship status
   - Deduct credits
   - Ready for next session

**Value:**
- Ship feels like persistent asset
- Resource management adds depth
- Downtime activities matter

---

### Between-2: Ship Modifications During Downtime

**Context:** Players spend months upgrading ship (in-game time)
**Tools Used:** This VTT (Ship Builder)

**Workflow:**
1. **Campaign Timeline:**
   - 3 months downtime (in-game)
   - Players pool credits: Cr 5 million

2. **Design Upgrades (Ship Builder):**
   - Add 3rd turret (Cr 1.5M)
   - Upgrade armor (Cr 2M)
   - Better sensors (Cr 500K)
   - Reserve: Cr 1M

3. **Next Session:**
   - GM: "3 months later, ship upgrades complete"
   - Import upgraded ship JSON
   - Players admire their investment

**Value:**
- Campaign progression (ship improves over time)
- Meaningful use of wealth
- Anticipation for next session

---

### Between-3: Planning Multi-Ship Acquisitions

**Context:** Players forming a small fleet (multiple ships)
**Tools Used:** This VTT (Ship Builder) + Spreadsheet

**Workflow:**
1. **Campaign Goal:**
   - Players want trading company (3 ships)
   - Main ship: Armed merchant (already own)
   - Support: 2 Free Traders (need to buy)

2. **Financial Planning:**
   - Calculate costs (Ship Builder)
   - Estimate profits (spreadsheet)
   - Loan required: Cr 20 million

3. **Campaign Arc:**
   - Players negotiate loan (main VTT roleplay)
   - GM creates loan terms: "10% interest, 5 years"
   - Next phase: Build trading empire

**Value:**
- Long-term campaign goals
- Economic gameplay (not just combat)
- Player-driven narrative

---

## Portfolio & Community Use Cases

(Previous use cases 3, 4, 5, 6, 7, 8, 9, 10 remain unchanged)

---

## Use Case Matrix

| Use Case | Priority | Dependencies | Value | Effort |
|----------|----------|--------------|-------|--------|
| 1. Tuesday Game | CRITICAL | Stages 1-13 | Play tool | Complete |
| 2. Ship Design | CRITICAL | Stage 12 | Creativity | 3-4 weeks |
| 3. Portfolio Demo | HIGH | Stages 14-16 | Career | 4-6 weeks |
| 4. Community | HIGH | Stages 12, 16, 18 | Adoption | Ongoing |
| 5. AI Repo Score | HIGH | Stages 14-16 | Portfolio | 4-6 weeks |
| 6. Solo Learning | MEDIUM | Stages 8-11 | Education | Complete |
| 7. Convention Demo | MEDIUM | Stage 21 | Marketing | 2-3 weeks |
| 8. Ship Competition | MEDIUM | Stages 12, 17, 18 | Engagement | Event-based |
| 9. VTT Integration | MEDIUM | Stage 14 | User base | 2-3 weeks |
| 10. System Map | LOW | Stage 23 | Immersion | 6-8 weeks |

---

## Success Metrics

### Phase 2 (Stages 11-13)
- **Primary:** Tuesday group plays weekly, enjoys it
- **Metric:** 5+ successful game sessions without major bugs
- **Measurement:** GM feedback, player satisfaction

### Phase 3 (Stages 14-16)
- **Primary:** Portfolio achieves 9.0/10 AI score
- **Secondary:** Secure 1+ consulting contract at $150/hr
- **Metric:** AI evaluation score, interview outcomes
- **Measurement:** Automated tools, job offers

### Phase 4 (Stages 17-22)
- **Primary:** Community adoption (50+ active users)
- **Secondary:** Mongoose Publishing acknowledgment
- **Metric:** GitHub stars, Reddit mentions, forum posts
- **Measurement:** Analytics, social listening

---

## Conclusion

These use cases guide development priorities and validate design decisions. The primary focus is **Use Case 1 (Tuesday Game)**, ensuring the tool is FUN and PLAYABLE. Secondary focus is **Use Case 3 (Portfolio Demo)**, achieving professional-grade quality for consulting work. Tertiary focus is **Use Case 4 (Community)**, enabling organic growth and adoption.

**Next Steps:**
1. Complete Stage 11 (Missiles & UI)
2. Build Stage 12 (Ship Builder) - enables Use Case 2
3. Polish Stages 14-16 (Architecture/Security/Deployment) - enables Use Case 3
4. Launch publicly - enables Use Case 4
5. Iterate based on feedback - continuous improvement

---

**Last Updated:** 2025-11-11
**Next Review:** After Stage 13 complete (validate Phase 2 success)
