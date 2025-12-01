// Tutorial Scenario Definitions - Session 8, Stage 14
// Purpose: Define tutorial stories with dramatic narration

const TUTORIAL_SCENARIOS = {
  'first-blood': {
    id: 'first-blood',
    title: 'First Blood - Basic Combat',
    description: 'Your first encounter with a pirate corsair. Learn the basics of space combat in solo mode vs AI.',
    duration: '5-7 minutes',
    difficulty: 'beginner',
    prerequisites: [],
    learningObjectives: [
      'Ship selection UI',
      'Range selection mechanics',
      'Solo mode (vs AI)',
      'Firing weapons',
      'Turn-based combat flow'
    ],

    steps: [
      {
        index: 0,
        total: 6,
        title: 'ACT 1: ENCOUNTER',
        narration: `Captain, we've detected a pirate corsair at Short range!

Your crew is green, but they're ready for their first fight.

Let's select your ship and prepare for combat against the AI...

👉 STEP 1: Click "Solo Battle (vs AI)" button below
👉 STEP 2: Then click "Continue" in this tutorial panel`,
        pointer: {
          target: '[data-test-id="btn-solo-battle"]',
          duration: 800
        },
        tooltip: {
          element: '[data-test-id="btn-solo-battle"]',
          text: `Click this button to start a Solo Battle against the AI`
        },
        action: null,
        chatMessage: {
          sender: '🎓 Instructor',
          text: 'Welcome to your first space combat tutorial!',
          delay: 500
        },
        manualAction: 'Click the "Solo Battle (vs AI)" button to continue'
      },

      {
        index: 1,
        total: 6,
        title: 'ACT 2: SHIP SELECTION',
        narration: `Now, let's choose our ship. The Scout is perfect for beginners - it's fast, maneuverable, and has a deadly pulse laser.

The Type-S Scout has:
• Hull: 40 points
• Armor: 4 points
• Thrust: 2G acceleration
• Weapons: Pulse Laser, Sandcaster, Missiles

👉 Click the Scout ship card, then click "Continue" below.`,
        pointer: {
          target: '[data-test-id="ship-option-scout"]',
          duration: 600
        },
        tooltip: {
          element: '[data-test-id="ship-option-scout"]',
          text: `<strong>Type-S Scout/Courier</strong><br>
Fast and deadly. Perfect for learning!`
        },
        action: null,
        chatMessage: {
          sender: '🎓 Instructor',
          text: 'The Scout is the perfect ship for learning the ropes.',
          delay: 1000
        },
        manualAction: 'Select the Scout ship'
      },

      {
        index: 2,
        total: 6,
        title: 'ACT 3: RANGE SELECTION',
        narration: `Starting range is crucial in space combat.

Let's go with SHORT range - close enough to use our pulse laser effectively, but not too close for the enemy's beam weapons.

At Short range, our pulse laser gets +0 DM. Perfect for beginners!

👉 Select "Short" from the dropdown, then click "Continue".`,
        pointer: {
          target: '[data-test-id="range-select"]',
          duration: 600
        },
        tooltip: {
          element: '[data-test-id="range-select"]',
          text: `Range affects weapon accuracy and damage.<br>
Short range: Good for lasers`
        },
        action: null,
        chatMessage: {
          sender: '🎓 Instructor',
          text: 'Range choice is a key tactical decision in every battle.',
          delay: 1500
        },
        manualAction: 'Select "Short" range from the dropdown'
      },

      {
        index: 3,
        total: 6,
        title: 'ACT 4: READY FOR COMBAT',
        narration: `Excellent choices, Captain!

You've selected the Scout and set your starting range to Short.

Now click READY to enter combat. In Solo Mode, the AI opponent will be automatically assigned and the battle will begin immediately!

This is where the real fight begins!

👉 Click the "Ready" button, then click "Continue".`,
        pointer: {
          target: '[data-test-id="ready-button"]',
          duration: 600
        },
        tooltip: {
          element: '[data-test-id="ready-button"]',
          text: `Confirms your ship selection and starts the AI battle`
        },
        action: null,
        chatMessage: {
          sender: '🎓 Instructor',
          text: 'Time to put your training to the test!',
          delay: 2000
        },
        manualAction: 'Click the "Ready" button to enter combat'
      },

      {
        index: 4,
        total: 6,
        title: 'ACT 5: COMBAT HUD',
        narration: `Welcome to the Combat HUD!

Here you can see:
• Your ship status (hull, armor)
• Enemy ship status
• Available weapons
• Combat log
• Action buttons

The FIRE button fires your currently selected weapon. The END TURN button passes control to the AI opponent.

You can now engage in actual combat! Try firing your weapons and see the AI fight back!

👉 Take your time to review the interface. Click "Continue" when ready.`,
        pointer: {
          target: '[data-test-id="fire-button"]',
          duration: 800
        },
        tooltip: {
          element: '[data-test-id="fire-button"]',
          text: `<strong>FIRE Button</strong><br>
Fires your selected weapon at the enemy.
Each weapon can only fire once per turn.`
        },
        action: null,
        chatMessage: {
          sender: '🎓 Instructor',
          text: 'This is your command center. Study it carefully!',
          delay: 1000
        },
        manualAction: 'Review the Combat HUD interface'
      },

      {
        index: 5,
        total: 6,
        title: '🎉 TUTORIAL COMPLETE',
        narration: `Congratulations, Captain!

You've completed the "First Blood" tutorial. You've learned:

✓ How to start a space battle
✓ How to select your ship
✓ How to set starting range
✓ How to read the Combat HUD

The actual combat mechanics (firing, damage, turns) are now active - the AI will fight back!

Ready for more? Try exploring the ship templates or start a real battle!

👉 Click "Done" to exit the tutorial.`,
        pointer: null,
        tooltip: null,
        action: null,
        chatMessage: {
          sender: '🎉 Crew',
          text: 'Well done, Captain! Ready for your first real battle!',
          delay: 500
        },
        manualAction: 'Tutorial complete!'
      }
    ]
  },

  'missile-mayhem': {
    id: 'missile-mayhem',
    title: 'Missile Mayhem - Advanced Weapons',
    description: 'Learn missile combat and point defense systems.',
    duration: '7-10 minutes',
    difficulty: 'intermediate',
    prerequisites: ['first-blood'],
    learningObjectives: [
      'Missile launching mechanics',
      'Point defense systems',
      'Ammo tracking',
      'Multi-round combat'
    ],
    steps: [
      {
        index: 0,
        total: 1,
        title: 'COMING SOON',
        narration: `This tutorial is not yet implemented.

It will teach you:
• How to launch missiles
• How to use point defense
• How to track ammunition
• Advanced combat tactics

For now, try the "First Blood" tutorial to learn the basics!`,
        pointer: null,
        tooltip: null,
        action: null,
        chatMessage: null
      }
    ]
  }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { TUTORIAL_SCENARIOS };
}
