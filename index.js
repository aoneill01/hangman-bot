const { App } = require('@slack/bolt');

const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
});

let word = "WORD";
let guesses = [];

app.message(/^([a-zA-Z])[!?]*$/, async ({ context, say }) => {
    const letter = context.matches[1].toUpperCase();
    if (!guesses.includes(letter)) {
        guesses.push(letter);
    } else {
        say(`*${letter}* has already been guessed.`);
        return;
    }
    if (word.includes(letter)) {
        say(`${generateMessage()}\n${letter} *is* in the word! :tada:`);
    } else {
        say(`${generateMessage()}\nSorry, ${letter} is not in the word. :disappointed:`);
    }
});

function generateMessage() {
    const incorrectCount = calculateIncorrectCount();
    return `\`\`\`
 ━━┳━━┓ 
   ${incorrectCount > 0 ? '☹︎' : ' '}  ┃
  ${incorrectCount > 4 ? '/' : ' '}${incorrectCount > 1 ? '|' : ' '}${incorrectCount > 5 ? '\\' : ' '} ┃        ${blanksString()}
  ${incorrectCount > 2 ? '/' : ' '} ${incorrectCount > 3 ? '\\' : ' '} ┃
   ━━━┻━━━
${guessesString()}
\`\`\``;
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

(async () => {
    // Start the app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();
