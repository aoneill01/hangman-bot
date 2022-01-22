const { App, ExpressReceiver } = require("@slack/bolt");
const GIFEncoder = require("gif-encoder-2");
const { cache, streamToString } = require("./cache.js");
const { createCanvas } = require("canvas");
const { lookupWord } = require("./dictionary");
const { Status, createGame, getGame } = require("./game");
const { updateCanvas } = require("./image.js");
const { getStats, getLeaderboard, getRecentWords } = require("./stats");

const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

receiver.router.get(
  "/image",
  cache(60 * 60, "image/gif"),
  async ({ query: { word, guesses, incorrectCount } }, res) => {
    console.log(`Generating image for ${word} ${guesses} ${incorrectCount}`);
    res.set("Content-Type", "image/gif");

    const encoder = new GIFEncoder(430, 155, "octree", false);
    const stream = encoder.createReadStream();
    stream.setEncoding("binary");

    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(300);
    encoder.setQuality(30);

    const canvas = createCanvas(430, 155);
    const context = canvas.getContext("2d");

    for (let i = 0; i < 3; i++) {
      updateCanvas(canvas, word, guesses, +incorrectCount);
      encoder.addFrame(context);
    }

    encoder.finish();

    res.send(Buffer.from(await streamToString(stream), "binary"));
  }
);

const successEmoji = [
  "tada",
  "partyparrot",
  "white_check_mark",
  "banana-dance",
  "success",
];
const failureEmoji = [
  "skull_and_crossbones",
  "x",
  "man-gesturing-no",
  "blob_dead",
  "coffin",
];

app.command("/hangman", async ({ ack, command, context, say }) => {
  if (!/^[a-zA-Z]+$/.test(command.text)) {
    ephemeralAck("Suggestion must be a single word, only letters.", ack);
    return;
  }

  if (command.text.length < 5) {
    ephemeralAck(
      "Let's give them a chance with a word that is at least 5 letters.",
      ack
    );
    return;
  }

  if (getRecentWords().includes(command.text.toUpperCase())) {
    ephemeralAck("Your word was recently used. Try another one!", ack);
    return;
  }

  const existingGame = getGame(command.channel_id);

  if (existingGame && existingGame.status == Status.IN_PROGRESS) {
    ephemeralAck(
      "Please finish the current game before suggesting a new word.",
      ack
    );
    app.client.chat.update({
      ...game.messageDetails,
      blocks: generateMessage(game),
    });
    return;
  }

  const definition = await lookupWord(command.text);
  if (!definition.foundWord) {
    ephemeralAck(
      `I could not find ${
        command.text
      } in my dictionary. Did you mean ${definition.suggestions
        .slice(0, 5)
        .join(", ")}?`,
      ack
    );
    return;
  }

  ack();

  const game = createGame(
    command.channel_id,
    command.text.toUpperCase(),
    command.user_id,
    definition.defintion
  );

  console.log(`Starting game with ${game.word}.`);

  const result = await retry(async () =>
    app.client.chat.postMessage({
      token: context.botToken,
      channel: command.channel_id,
      blocks: generateMessage(game),
    })
  );

  game.messageDetails = {
    channel: result.channel,
    ts: result.ts,
    token: context.botToken,
  };

  say({
    thread_ts: result.ts,
    text: "_Let me start the thread for you._",
  });
});

app.message(/^([a-zA-Z])[!?]*$/, async ({ context, message, say }) => {
  const game = getGame(message.channel);
  if (!game || game.status == Status.NOT_STARTED) {
    console.log("No game found");
    return;
  }
  if (game.status != Status.IN_PROGRESS) return;

  const letter = context.matches[1].toUpperCase();

  if (game.hasLetterBeenGuessed(letter)) {
    if (message.thread_ts) {
      say({
        thread_ts: message.thread_ts,
        text: `*${letter}* has already been guessed.`,
      });
    } else {
      say(`*${letter}* has already been guessed.`);
    }
    return;
  }

  game.guessLetter(letter, message.user);

  react(
    randomEmoji(game.word.includes(letter) ? successEmoji : failureEmoji),
    context.botToken,
    message
  );

  retry(() =>
    app.client.chat.update({
      ...game.messageDetails,
      blocks: generateMessage(game),
    })
  );

  if (game.status == Status.WON || game.status == Status.LOST) {
    if (message.thread_ts) {
      say({
        thread_ts: message.thread_ts,
        text: `*${game.word}*: ${game.definition}`,
      });
    } else {
      say(`*${game.word}*: ${game.definition}`);
    }
  }
});

app.event("app_home_opened", async ({ event, context }) => {
  const stats = getStats(event.user);
  const leaderboard = getLeaderboard();

  app.client.views.publish({
    token: context.botToken,
    user_id: event.user,
    view: {
      type: "home",
      blocks: [
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Welcome to Hangman*\n\nPlay a game of hangman with other people in a channel.\n\n*How to use*\n\n1. *Required*: Add this *hangman app* to the channel where you want to play.\n2. In the channel, use the slash command \`/hangman [word]\` to start a new game. _Don't worry, other users in the channel won't see the word._\n3. Everyone in the channel can guess letters by posting messages with a single letter.\n\nRecent words: ${getRecentWords().join(
              ", "
            )}`,
          },
        },
        {
          type: "divider",
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:chart_with_upwards_trend: *Personal Statistics* :chart_with_downwards_trend:\n\n*Letters guessed*: ${
              stats.totalGuesses
            }\n*Correct guesses*: ${stats.correctGuesses} ${
              stats.totalGuesses != 0
                ? "(" +
                  Math.round(
                    (100 * stats.correctGuesses) / stats.totalGuesses
                  ) +
                  "%)"
                : ""
            }\n*Game winning guesses*: ${
              stats.winningGuesses
            }\n*Words suggested*: ${
              stats.wordsSuggested
            }\n*Your words resulting in a hanging*: ${stats.suggestionsHung} ${
              stats.wordsSuggested != 0
                ? "(" +
                  Math.round(
                    (100 * stats.suggestionsHung) / stats.wordsSuggested
                  ) +
                  "%)"
                : ""
            }`,
          },
        },
        {
          type: "divider",
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `:trophy: *Leaderboards* :trophy:\n\n*Most accurate* (% correct, min. 20 letters)\n${formatList(
              leaderboard.bestGuesses,
              (val) => `${Math.round(val.percentage)}%`
            )}\n\n*Most guesses*\n${formatList(
              leaderboard.mostTotalGuesses,
              (val) => val.totalGuesses
            )}\n\n*Most game winning guesses*\n${formatList(
              leaderboard.mostWinningGuesses,
              (val) => val.winningGuesses
            )}\n\n*Deadliest wordsmiths* (% hanged, min. 5 words)\n${formatList(
              leaderboard.deadliestWords,
              (val) => `${Math.round(val.percentage)}%`
            )}\n\n*Most words suggested*\n${formatList(
              leaderboard.mostWordsSuggested,
              (val) => val.wordsSuggested
            )}`,
          },
        },
      ],
    },
  });
});

function formatList(list, getValue) {
  const emoji = [
    ":first_place_medal:",
    ":second_place_medal:",
    ":third_place_medal:",
  ];
  return list
    .map((val, i) => `${emoji[i]} <@${val.player}> (${getValue(val)})`)
    .join("\n");
}

function randomEmoji(options) {
  return options[Math.floor(Math.random() * options.length)];
}

function generateMessage(game) {
  const incorrectCount = game.calculateIncorrectCount();

  let message = `Word suggested by <@${game.userName}>.`;
  if (game.status == Status.LOST) {
    message += `\n:skull_and_crossbones: *You lose. The word was ${game.word}.* :skull_and_crossbones: Suggest a new word with \`/hangman [word]\``;
  } else if (game.status == Status.WON) {
    message += `\n:tada: *You win!* :tada: Suggest a new word with \`/hangman [word]\``;
  } else {
    message += `\n_Please reply in thread._`;
  }

  return [
    {
      type: "image",
      image_url: `http://hangman.do.aoneill.com/image?word=${blanksString(
        game
      )}&guesses=${guessesString(game)}&incorrectCount=${incorrectCount}`,
      alt_text: "hangman",
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: message,
        },
      ],
    },
  ];
}

function guessesString(game) {
  return game.guesses.reduce(
    (acc, c) =>
      `${acc}${game.word.includes(c) ? c.toUpperCase() : c.toLowerCase()}`,
    ""
  );
}

function blanksString(game) {
  return Array.from(game.word).reduce((acc, c) => {
    if (game.guesses.includes(c)) {
      return acc + c.toUpperCase();
    }
    if (game.status === Status.LOST) {
      return acc + c.toLowerCase();
    }
    return acc + "_";
  }, "");
}

function ephemeralAck(text, ack) {
  ack({
    text,
    response_type: "ephemeral",
  });
}

function react(name, token, message) {
  app.client.reactions.add({
    token,
    name,
    channel: message.channel,
    timestamp: message.ts,
  });
}

async function retry(action) {
  let retries = 0;
  while (true) {
    try {
      return await action();
    } catch (err) {
      console.error(err);
      if (retries++ === 5) throw err;
      await new Promise((resolve) => setTimeout(resolve, 10000));
    }
  }
}

// Begin Wordle section

const { generateImage } = require("./generateImage");

const wordleGames = {
  new: {
    solution: "     ",
    guesses: [],
  }
};

app.command("/wordle", async ({ ack, command, context, say }) => {
  if (!/^[a-z]{5}$/i.test(command.text)) {
    await ack({
      text: "Word must be 5 letters",
      response_type: "ephemeral",
    });
    return;
  }

  const definition = await lookupWord(command.text);
  if (!definition.foundWord) {
    await ack({
      text: `I could not find ${command.text} in my dictionary`,
      response_type: "ephemeral",
    });
    return;
  }

  const wordleGame = {
    solution: command.text.toLowerCase(),
    guesses: [],
    user: command.user_id,
  }

  ack();

  const result = await app.client.chat.postMessage({
    token: context.botToken,
    channel: command.channel_id,
    blocks: getBlocks("new", wordleGame.user),
  });

  wordleGame.messageDetails = {
    channel: result.channel,
    ts: result.ts,
    token: context.botToken,
  };

  wordleGames[result.ts] = wordleGame;

  say({
    thread_ts: result.ts,
    text: "_Type a message in this thread with just a five-letter word to make a guess._",
  })
});

app.message(/^[a-z]{5}$/i, async ({ context, message, say }) => {
  const wordleGame = wordleGames[message.thread_ts];

  if (!wordleGame || wordleGame.guesses.length >= 6) return;

  const guess = context.matches[0];
  const definition = await lookupWord(guess);
  if (!definition.foundWord) {
    await say({
      thread_ts: message.thread_ts,
      text: `I could not find ${guess} in my dictionary`,
    });
    return;
  }

  wordleGame.guesses.push(guess.toLowerCase());  

  react(
    "eyes",
    context.botToken,
    message
  );

  return app.client.chat.update({
    ...wordleGame.messageDetails,
    blocks: getBlocks(message.thread_ts, wordleGame.user),
  });
});

const getBlocks = (thread_ts, user) => [
  {
    type: "image",
    image_url: `http://hangman.do.aoneill.com/wordle?thread_ts=${thread_ts}&v=${Math.random()}`,
    alt_text: "Wordle",
  },
  {
    type: "context",
    elements: [
      {
        type: "mrkdwn",
        text: `Word suggested by <@${user}>`,
      },
    ],
  },
];

receiver.router.get(`/wordle`, async function (req, res) {
  const { thread_ts } = req.query;
  const wordleGame = wordleGames[thread_ts] ?? { solution: "zzzzz", guesses: [" not ", "found"] };
  const image = await generateImage(wordleGame.guesses, wordleGame.solution);
  res.writeHead(200, { "Content-Type": "image/png" });
  res.end(image, "binary");
});

// End Wordle section

(async () => {
  // Start the app
  await app.start(process.env.PORT || 3000);

  console.log("⚡️ Bolt app is running!");
})();
