// Quick test to verify participant addition logic
console.log('Testing participant addition scenarios...');

// Scenario 1: 8-slot bracket with 2 players initially
// Should be able to add 6 more participants before regeneration
const bracket8_2players = [
  [
    { participants: ['Player1', '(bye)'] },
    { participants: ['Player2', '(bye)'] },
    { participants: ['(bye)', '(bye)'] },
    { participants: ['(bye)', '(bye)'] }
  ]
];

let totalByeSlots = 0;
let totalRealParticipants = 0;
bracket8_2players[0].forEach(match => {
  match.participants.forEach(participant => {
    if (participant === "(bye)") {
      totalByeSlots++;
    } else if (participant && participant !== null) {
      totalRealParticipants++;
    }
  });
});

const bracketCapacity = bracket8_2players[0].length * 2;
const availableSlots = bracketCapacity - totalRealParticipants;

console.log(`8-slot bracket with 2 players:
  - Bracket capacity: ${bracketCapacity}
  - Real participants: ${totalRealParticipants}
  - Available slots: ${availableSlots}
  - Bye slots: ${totalByeSlots}
  - Should be able to add: ${availableSlots} more participants`);

// Scenario 2: After adding one more participant (total 3)
const bracket8_3players = [
  [
    { participants: ['Player1', '(bye)'] },
    { participants: ['Player2', '(bye)'] },
    { participants: ['Player3', '(bye)'] }, // Added Player3
    { participants: ['(bye)', '(bye)'] }
  ]
];

totalByeSlots = 0;
totalRealParticipants = 0;
bracket8_3players[0].forEach(match => {
  match.participants.forEach(participant => {
    if (participant === "(bye)") {
      totalByeSlots++;
    } else if (participant && participant !== null) {
      totalRealParticipants++;
    }
  });
});

const availableSlots2 = bracketCapacity - totalRealParticipants;

console.log(`8-slot bracket with 3 players:
  - Real participants: ${totalRealParticipants}
  - Available slots: ${availableSlots2}
  - Bye slots: ${totalByeSlots}
  - Should be able to add: ${availableSlots2} more participants`);

console.log('Test completed!');
