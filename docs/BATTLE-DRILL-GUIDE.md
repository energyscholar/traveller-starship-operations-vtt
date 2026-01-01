# Battle Drill System Guide

## Overview

The Battle Drill system allows GMs to run combat training scenarios with predefined enemy contacts. Players can practice combat roles without risking their actual ship.

## GM Quick Start

### Loading a Drill

1. Open the **GM Menu** (top-right corner or `G` hotkey)
2. Find the **Drill Scenarios** section
3. Select a drill from the dropdown:
   - **Run 1**: Single corsair (training)
   - **Run 2**: Two corsairs (easy)
   - **Run 3**: Corsair pack with missiles (medium)
   - **Run 4**: Full assault with warship (hard)
4. Click **Load** (confirms before clearing contacts)

### Using Tactical Overview

1. In GM Menu, expand **Tactical Overview**
2. See all contacts with health bars
3. Sort by **Range** or **Health**
4. Click fire button to fire contact weapons at PC ship

### Resetting a Drill

1. Click **Reset** in Drill Scenarios section
2. Confirms before restoring all contacts to full health
3. Ship snapshot restored if available

## Player Roles in Combat

### Gunner
- Lock targets using sensor data
- Fire ship weapons at contacts
- See damage dealt on hit

### Sensors
- Scan contacts to reveal details
- Provide targeting data to gunner
- Track enemy movements

### Engineer
- Monitor hull damage
- Repair critical systems
- Manage power distribution

### Pilot
- Evasive maneuvers
- Range management
- Escape if needed

## Creating Contacts from Templates

### From GM Menu
1. Find **Add from Template** section
2. Select ship type (23 templates available)
3. Set disposition (hostile/neutral/friendly)
4. Click **Add from Template**

### Using Encounter Builder
1. Click **Encounter Builder** button
2. Search/filter templates on left
3. Click to add ships to roster
4. Edit each ship's name, disposition, range
5. Click **Activate Encounter** to spawn all

## Drill Scenario Details

| Run | Contacts | Difficulty | Notes |
|-----|----------|------------|-------|
| 1 | 1 Corsair | Training | Basic combat intro |
| 2 | 2 Corsairs | Easy | Pincer attack practice |
| 3 | 3 Corsairs | Medium | Missiles, point defense |
| 4 | 5 ships + warship | Hard | Full combat simulation |

## Troubleshooting

### Contacts not appearing
- Ensure drill loaded successfully (check status)
- Refresh browser if contacts stale
- Check console for errors

### Fire button missing
- Contact must have weapons defined
- Contact must be targetable
- Check contact's weapons array

### Reset not working
- Must have active drill loaded
- Check GM privileges
- Verify campaign connection

## Technical Notes

- Drill contacts marked with `is_targetable: true`
- Ship state snapshot taken at drill load
- Memento pattern used for reset
- State machine: INACTIVE -> LOADING -> ACTIVE -> RESETTING
