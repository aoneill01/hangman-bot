const fs = require("fs");
const nodeHtmlToImage = require("node-html-to-image");
const hash = require("object-hash");

const letters = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode("a".charCodeAt(0) + i)
);

const fileExists = (s) =>
  new Promise((r) => fs.access(s, fs.F_OK, (e) => r(!e)));

async function generateImage(guesses, solution) {
  const key = hash({ guesses, solution });
  const output = `./cache/${key}.png`;

  if (await fileExists(output)) {
    return await fs.promises.readFile(output);
  }

  const image = await nodeHtmlToImage({
    puppeteerArgs: { args: ["--no-sandbox"] },
    output,
    html: `<html>
    <style>
      body {
        font-family: "Clear Sans", "Helvetica Neue", Arial, sans-serif;
        margin: 0;
        padding: 0;
        width: 350px;
        height: 485px;
      }
      
      * {
        box-sizing: border-box;
      }
      
      #board {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        grid-gap: 5px;
        padding: 10px;
        box-sizing: border-box;
        width: 350px;
      }
      
      .tile {
        width: 62px;
        height: 62px;
        border: 2px solid #d3d6da;
        display: inline-flex;
        font-size: 32px;
        line-height: 32px;
        justify-content: center;
        align-items: center;
        text-transform: uppercase;
        vertical-align: middle;
        font-weight: bold;
        color: #1a1a1b;
      }
      
      .correct {
        background-color: #6aaa64 !important;
        border: none;
        color: white;
      }
      
      .incorrect {
        background-color: #787c7e !important;
        border: none;
        color: white;
      }
      
      .present {
        background-color: #c9b458 !important;
        border: none;
        color: white;
      }

      #used {
        display: grid;
        grid-template-columns: repeat(13, 1fr);
        grid-gap: 2px;
        padding: 0 10px 10px 10px;
      }
      
      #used > div {
        text-align: center;
        text-transform: uppercase;
        background-color: #d3d6da;
        padding: 5px 0;
        border-radius: 4px;
      }
    </style>
    <body>
        <div id="board">
            ${guesses.map((guess) => htmlForGuess(guess, solution)).join("")}
            ${[...new Array(6 - guesses.length)].map(emptyGuess).join("")}
        </div>
        <div id="used">
            ${letters.map((letter) => htmlForUsed(letter, guesses, solution))}
        </div>
    </body>
    </html>`,
  });

  return image;
}

function isPresent(guess, solution, index) {
  const letter = guess[index];
  if (!solution.includes(letter)) return false;
  const totalCount = [...solution].filter((l) => l === letter).length;
  let correctCount = 0;
  let incorrectCountBeforeIndex = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] !== letter) continue;
    if (guess[i] === solution[i]) correctCount++;
    else if (i < index) incorrectCountBeforeIndex++;
  }
  return totalCount > correctCount + incorrectCountBeforeIndex;
}

function htmlForGuess(guess, solution) {
  return [...guess]
    .map((letter, i) => {
      if (letter == solution[i])
        return `<div class="tile correct">${letter}</div>`;
      else if (isPresent(guess, solution, i))
        return `<div class="tile present">${letter}</div>`;
      else return `<div class="tile incorrect">${letter}</div>`;
    })
    .join("");
}

function htmlForUsed(letter, guesses, solution) {
  if (guesses.some((guess) => guess.includes(letter))) {
    if (solution.includes(letter)) {
      return `<div class="correct">${letter}</div>`;
    }
    return `<div class="incorrect">${letter}</div>`;
  }
  return `<div>${letter}</div>`;
}

function emptyGuess() {
  return '<div class="tile"></div><div class="tile"></div><div class="tile"></div><div class="tile"></div><div class="tile"></div>';
}

module.exports = { generateImage };
