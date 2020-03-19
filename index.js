const { App } = require('@slack/bolt');

const app = new App({
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    token: process.env.SLACK_BOT_TOKEN,
});

let word = "WORD";
let incorrectCount = 0;

app.message(/^([a-zA-Z])[!?]*$/, async ({ context, say }) => {
    const letter = context.matches[1].toUpperCase();
    if (word.includes(letter)) {
        say(`${letter} *is* in the word! :tada:`);
    } else {
        incorrectCount++;
        say(`Sorry, ${letter} is not in the word. :disappointed: You have made ${incorrectCount} incorrect guesses.`);
    }
});

(async () => {
    // Start the app
    await app.start(process.env.PORT || 3000);

    console.log('⚡️ Bolt app is running!');
})();
