const { App } = require('@slack/bolt');
const { HangmanGame, Status, createGame, getGame } = require('./game');

const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
});

const successEmoji = [ 'tada', 'parrot', 'white_check_mark', 'banana-dance', 'gopher-dance' ];
const failureEmoji = [ 'skull_and_crossbones', 'x', 'man-gesturing-no', 'blob_dead', 'coffin' ];

app.command('/hangman', async ({ ack, command, context, say }) => {
    if (!/^[a-zA-Z]+$/.test(command.text)) {
        ephemeralAck('Suggestion must be a single word, only letters.', ack);
        return;
    } 

    const existingGame = getGame(command.channel_id);

    if (existingGame && existingGame.status == Status.IN_PROGRESS) {
        ephemeralAck('Please finish the current game before suggesting a new word.', ack);
        return;
    } 

    ack();

    const game = createGame(command.channel_id, command.text.toUpperCase(), command.user_name);

    console.log(`Starting game with ${game.word}.`);

    const result = await app.client.chat.postMessage({
        token: context.botToken,
        channel: command.channel_id,
        text: generateMessage(game)
    });

    game.messageDetails = {
        channel: result.channel,
        ts: result.ts,
        token: context.botToken
    };

    say({
        thread_ts: result.ts,
        text: 'There are 6 guesses.'
    });
});

app.message(/^([a-zA-Z])[!?]*$/, async ({ context, message, say }) => {
    const game = getGame(message.channel);
    if (!game || game.status == Status.NOT_STARTED) {
        console.log('No game found');
        return;
    }
    if (game.status != Status.IN_PROGRESS) return;

    const letter = context.matches[1].toUpperCase();

    if (game.hasLetterBeenGuessed(letter)) {
        if (message.thread_ts) {
            say({
                thread_ts: message.thread_ts,
                text: `*${letter}* has already been guessed.`
            });
        } else {
            say(`*${letter}* has already been guessed.`);
        }
        return;
    }

    game.guessLetter(letter);

    app.client.chat.update({
        ...game.messageDetails,
        text: generateMessage(game)
    });

    react(randomEmoji(game.word.includes(letter) ? successEmoji : failureEmoji), context.botToken, message);
});

function randomEmoji(options) {
    return options[Math.floor(Math.random() * options.length)];
}

function generateMessage(game) {
    const incorrectCount = game.calculateIncorrectCount();
    let message = `Word suggested by <@${game.userName}>.\n\`\`\`
 ━━┳━━┓ 
   ${incorrectCount > 0 ? '☹︎' : ' '}  ┃
  ${incorrectCount > 4 ? '/' : ' '}${incorrectCount > 1 ? '|' : ' '}${incorrectCount > 5 ? '\\' : ' '} ┃        ${blanksString(game)}
  ${incorrectCount > 2 ? '/' : ' '} ${incorrectCount > 3 ? '\\' : ' '} ┃
   ━━━┻━━━
${guessesString(game)}
\`\`\``;

    if (game.status == Status.LOST) {
        message += `\n:skull_and_crossbones: *You lose. The word was ${game.word}.* :skull_and_crossbones: Suggest a new word with \`/hangman [word]\``;
    } else if (game.status == Status.WON) {
        message += `\n:tada: *You win!* :tada: Suggest a new word with \`/hangman [word]\``;
    } else {
        message += `\n_Please reply in thread._`;
    }

    return message;
}

function guessesString(game) {
    return game.guesses.reduce((acc, c) => `${acc} ${c}${game.word.includes(c) ? '✔' : '✗'}`, '');
}

function blanksString(game) {
    return Array.from(game.word).reduce((acc, c) => `${acc} ${game.guesses.includes(c) ? c : '_'}`, '');
}

function ephemeralAck(text, ack) {
    ack({
        text,
        response_type: 'ephemeral'
    });
} 

function react(name, token, message) {
    app.client.reactions.add({
        token,
        name,
        channel: message.channel,
        timestamp: message.ts
    });
}

(async () => {
    // Start the app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();
