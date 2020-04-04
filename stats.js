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
    if (s.suggestionsHung === undefined) s.suggestionsHung = 0;
    return s;
}

function getLeaderboard() {
    return {
        mostTotalGuesses: topForProperty('totalGuesses'),
        mostWinningGuesses: topForProperty('winningGuesses'),
        bestGuesses: topForPercentage('correctGuesses', 'totalGuesses', 20),
        mostWordsSuggested: topForProperty('wordsSuggested'),
        deadliestWords: topForPercentage('suggestionsHung', 'wordsSuggested', 5)
    };
}

function topForProperty(property) {
    return Object.keys(stats.players)
        .map(player => ({ player, [property]: stats.players[player][property] || 0 }))
        .sort((a, b) => b[property] - a[property])
        .filter(val => val[property] !== 0)
        .slice(0, 3);
}

function topForPercentage(numerator, denominator, minDenominator) {
    return Object.keys(stats.players)
        .filter(player => stats.players[player][denominator] >= minDenominator)
        .map(player => ({ player, percentage: 100 * (stats.players[player][numerator] || 0) / stats.players[player][denominator]}))
        .sort((a, b) => b.percentage - a.percentage)
        .filter(val => val.percentage !== 0)
        .slice(0, 3);
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
    if (!isSuccessful) playerStats(suggester).suggestionsHung++;
    writeStats();
}

if (fs.existsSync(filename)) {
    stats = JSON.parse(fs.readFileSync(filename));
}

module.exports = {
    getStats,
    getLeaderboard,
    updateStatsForGuess,
    updateStatsForNewGame,
    updateStatsForCompletedGame
};

