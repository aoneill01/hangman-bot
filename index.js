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

    if (gameStatus() == Status.IN_PROGRESS) {
        ack({
            text: 'Please finish the current game before suggesting a new word.',
            response_type: 'ephemeral'
        });
        return;
    } 

    ack();

    word = command.text.toUpperCase();
    guesses = [];
    userName = command.user_name;

    console.log(`Starting game with ${word}.`);

    const result = await app.client.chat.postMessage({
        token: context.botToken,
        channel: command.channel_id,
        text: generateMessage()
    });

    messageDetails = {
        channel: result.channel,
        ts: result.ts,
        token: context.botToken
    };
});

app.message(/^([a-zA-Z])[!?]*$/, async ({ context, message, say }) => {
    const status = gameStatus();
    if (status == Status.NOT_STARTED) {
        say('No game found');
        return;
    }
    if (status != Status.IN_PROGRESS) return;

    const letter = context.matches[1].toUpperCase();

    if (!guesses.includes(letter)) {
        guesses.push(letter);
    } else {
        say(`*${letter}* has already been guessed.`);
        return;
    }

    app.client.chat.update({
        ...messageDetails,
        text: generateMessage()
    });

    if (word.includes(letter)) {
        app.client.reactions.add({
            token: context.botToken,
            name: 'tada',
            channel: message.channel,
            timestamp: message.ts
        });
    } else {
        app.client.reactions.add({
            token: context.botToken,
            name: 'skull_and_crossbones',
            channel: message.channel,
            timestamp: message.ts
        });
    }
});

function generateMessage() {
    const status = gameStatus();
    const incorrectCount = calculateIncorrectCount();
    let message = `\`\`\`
 ━━┳━━┓ 
   ${incorrectCount > 0 ? '☹︎' : ' '}  ┃
  ${incorrectCount > 4 ? '/' : ' '}${incorrectCount > 1 ? '|' : ' '}${incorrectCount > 5 ? '\\' : ' '} ┃        ${blanksString()}
  ${incorrectCount > 2 ? '/' : ' '} ${incorrectCount > 3 ? '\\' : ' '} ┃
   ━━━┻━━━
${guessesString()}
\`\`\``;

    if (status == Status.LOST) {
        message += `\n:skull_and_crossbones: *You lose. The word was ${word}.* :skull_and_crossbones: Suggest a new word with \`/hangman [word]\``;
    } else if (status == Status.WON) {
        message += '\n:tada: *You win!* :tada: Suggest a new word with `/hangman [word]`';
    } else {
        message += `\n_Word suggested by <@${userName}>. Please guess in thread._`;
    }

    return message;
}

function calculateIncorrectCount() {
    return guesses.reduce((acc, c) => word.includes(c) ? acc : acc + 1, 0);
}

function guessesString() {
    return guesses.reduce((acc, c) => `${acc} ${c}${word.includes(c) ? '✔' : '✗'}`, '');
}

function blanksString() {
    return Array.from(word).reduce((acc, c) => `${acc} ${guesses.includes(c) ? c : '_'}`, '');
}

function gameStatus() {
    if (!word || !messageDetails) return Status.NOT_STARTED;
    if (calculateIncorrectCount() > 5) return Status.LOST;
    if (Array.from(word).every(c => guesses.includes(c))) return Status.WON;
    return Status.IN_PROGRESS;
}

(async () => {
    // Start the app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();
