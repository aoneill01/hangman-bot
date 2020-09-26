const fetch = require("node-fetch");

const apiKey = process.env.DICTIONARY_API_KEY;

async function lookupWord(word) {
  const response = await fetch(
    `https://dictionaryapi.com/api/v3/references/collegiate/json/${encodeURIComponent(
      word
    )}?key=${encodeURIComponent(apiKey)}`
  );

  if (!response.ok) {
    throw new Error(`Dictionary returned status ${response.statusText}`);
  }

  const json = await response.json();

  if (json.length && typeof json[0] === "object") {
    return {
      foundWord: true,
      defintion: json[0].shortdef[0],
    };
  }

  return {
    foundWord: false,
    suggestions: json,
  };
}

module.exports = {
  lookupWord,
};
