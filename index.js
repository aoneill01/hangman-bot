const { App } = require('@slack/bolt');

const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
});

const Status = {
    NOT_STARTED: 'not_started',
    IN_PROGRESS: 'in_progress',
    WON: 'won',
    LOST: 'lost'
};

const successEmoji = [ 'tada', 'parrot', 'white_check_mark', 'banana-dance', 'gopher-dance' ];
const failureEmoji = [ 'skull_and_crossbones', 'x', 'man-gesturing-no', 'blob_dead', 'coffin' ];

const games = {};
let word;
let guesses = [];
let messageDetails;
let userName;

app.command('/hangman', async ({ ack, command, context }) => {
    if (!/^[a-zA-Z]+$/.test(command.text)) {
        ack({
            text: 'Suggestion must be a single word, only letters.',
            response_type: 'ephemeral'
        });
        return;
    } 

    if (gameStatus(command.channel_id) == Status.IN_PROGRESS) {
        ack({
            text: 'Please finish the current game before suggesting a new word.',
            response_type: 'ephemeral'
        });
        return;
    } 

    ack();

    if (!games[command.channel_id]) games[command.channel_id] = {};
    const game = games[command.channel_id];

    game.word = command.text.toUpperCase();
    game.guesses = [];
    game.userName = command.user_name;

    console.log(`Starting game with ${game.word}.`);

    const result = await app.client.chat.postMessage({
        token: context.botToken,
        channel: command.channel_id,
        text: generateMessage(command.channel_id)
    });

    game.messageDetails = {
        channel: result.channel,
        ts: result.ts,
        token: context.botToken
    };
});

app.message(/^([a-zA-Z])[!?]*$/, async ({ context, message, say }) => {
    const status = gameStatus(message.channel);
    if (status == Status.NOT_STARTED) {
        console.log('No game found');
        return;
    }
    if (status != Status.IN_PROGRESS) return;

    const letter = context.matches[1].toUpperCase();
    const { guesses, word, messageDetails } = games[message.channel];

    if (!guesses.includes(letter)) {
        guesses.push(letter);
    } else {
        say(`*${letter}* has already been guessed.`);
        return;
    }

    app.client.chat.update({
        ...messageDetails,
        text: generateMessage(message.channel)
    });

    if (word.includes(letter)) {
        app.client.reactions.add({
            token: context.botToken,
            name: randomEmoji(successEmoji),
            channel: message.channel,
            timestamp: message.ts
        });
    } else {
        app.client.reactions.add({
            token: context.botToken,
            name: randomEmoji(failureEmoji),
            channel: message.channel,
            timestamp: message.ts
        });
    }
});

function randomEmoji(options) {
    return options[Math.floor(Math.random() * options.length)];
}

function generateMessage(channel) {
    const status = gameStatus(channel);
    const incorrectCount = calculateIncorrectCount(channel);
    const { word, userName } = games[channel];
    let message = `_Word suggested by <@${userName}>._\n\`\`\`
 ━━┳━━┓ 
   ${incorrectCount > 0 ? '☹︎' : ' '}  ┃
  ${incorrectCount > 4 ? '/' : ' '}${incorrectCount > 1 ? '|' : ' '}${incorrectCount > 5 ? '\\' : ' '} ┃        ${blanksString(channel)}
  ${incorrectCount > 2 ? '/' : ' '} ${incorrectCount > 3 ? '\\' : ' '} ┃
   ━━━┻━━━
${guessesString(channel)}
\`\`\``;

    if (status == Status.LOST) {
        message += `\n:skull_and_crossbones: *You lose. The word was ${word}.* :skull_and_crossbones: Suggest a new word with \`/hangman [word]\``;
    } else if (status == Status.WON) {
        message += `\n:tada: *You win!* :tada: Suggest a new word with \`/hangman [word]\``;
    } else {
        message += `\nPlease reply in thread._`;
    }

    return message;
}

function calculateIncorrectCount(channel) {
    const { word, guesses } = games[channel];
    return guesses.reduce((acc, c) => word.includes(c) ? acc : acc + 1, 0);
}

function guessesString(channel) {
    const { word, guesses } = games[channel];
    return guesses.reduce((acc, c) => `${acc} ${c}${word.includes(c) ? '✔' : '✗'}`, '');
}

function blanksString(channel) {
    const { word, guesses } = games[channel];
    return Array.from(word).reduce((acc, c) => `${acc} ${guesses.includes(c) ? c : '_'}`, '');
}

function gameStatus(channel) {
    if (!games[channel]) return Status.NOT_STARTED;
    const { word, guesses, messageDetails } = games[channel];
    if (!word || !messageDetails) return Status.NOT_STARTED;
    if (calculateIncorrectCount(channel) > 5) return Status.LOST;
    if (Array.from(word).every(c => guesses.includes(c))) return Status.WON;
    return Status.IN_PROGRESS;
}

(async () => {
    // Start the app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();
