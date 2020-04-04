const { updateStatsForGuess, updateStatsForNewGame, updateStatsForCompletedGame }  = require('./stats');

const Status = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    WON: 'won',
    LOST: 'lost'
};

class HangmanGame {
    #word;
    #guesses;
    #userName;
    messageDetails;

    constructor(word, userName) {
        this.#word = word;
        this.#userName = userName;
        this.#guesses = [];
        updateStatsForNewGame(userName);
    }

    get word() {
        return this.#word;
    }

    get userName() {
        return this.#userName;
    }

    get guesses() {
        return this.#guesses.slice(0);
    }

    get status() {
        if (!this.#word || !this.messageDetails) return Status.NOT_STARTED;
        if (this.calculateIncorrectCount() > 5) return Status.LOST;
        if (Array.from(this.#word).every(c => this.#guesses.includes(c))) return Status.WON;
        return Status.IN_PROGRESS;
    }

    calculateIncorrectCount() {
        return this.#guesses.reduce((acc, c) => this.#word.includes(c) ? acc : acc + 1, 0);
    }

    hasLetterBeenGuessed(letter) {
        letter = letter.toUpperCase()[0];

        return this.#guesses.includes(letter);
    }

    guessLetter(letter, player) {
        if (this.status === Status.WON || this.status === Status.LOST) return; 

        letter = letter.toUpperCase()[0];

        if (!this.hasLetterBeenGuessed(letter)) {
            this.#guesses.push(letter);
            const won = this.status === Status.WON;
            const lost = this.status === Status.LOST;
            updateStatsForGuess(player, this.#word.includes(letter), won);
            if (won || lost) {
                updateStatsForCompletedGame(this.userName, won);
            }
        }
    }
}

const games = {};

function createGame(channelId, word, userName) {
    return games[channelId] = new HangmanGame(word, userName);
}

function getGame(channelId) {
    return games[channelId];
}

module.exports = {
    Status,
    HangmanGame,
    createGame,
    getGame
}
