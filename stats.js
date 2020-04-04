const fs = require('fs');
const path = require('path');

const filename = path.join(__dirname, 'stats.json');

let stats = {
    players: {}
};

function getStats(player) {
    return Object.assign({}, playerStats(player));
}

function writeStats() {
    fs.writeFile(filename, JSON.stringify(stats, null, 2), null, err => {
        if (err) console.error(err);
    });
}

function playerStats(player) {
    if (!stats.players[player]) stats.players[player] = {};
    const s = stats.players[player];
    if (s.totalGuesses === undefined) s.totalGuesses = 0;
    if (s.correctGuesses === undefined) s.correctGuesses = 0;
    if (s.winningGuesses === undefined) s.winningGuesses = 0;
    if (s.wordsSuggested === undefined) s.wordsSuggested = 0;
    if (s.suggestionsGuessed === undefined) s.suggestionsGuessed = 0;
    return s;
}

function updateStatsForGuess(player, isCorrect, isFinalLetter) {
    const s = playerStats(player);
    s.totalGuesses++;
    if (isCorrect) {
        s.correctGuesses++;
        if (isFinalLetter) s.winningGuesses++;
    }
    writeStats();
}

function updateStatsForNewGame(suggester) {
    playerStats(suggester).wordsSuggested++;
    writeStats();
}

function updateStatsForCompletedGame(suggester, isSuccessful) {
    if (isSuccessful) playerStats(suggester).suggestionsGuessed++;
    writeStats();
}

if (fs.existsSync(filename)) {
    stats = JSON.parse(fs.readFileSync(filename));
}

module.exports = {
    getStats,
    updateStatsForGuess,
    updateStatsForNewGame,
    updateStatsForCompletedGame
};

