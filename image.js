const rough = require("roughjs");

function updateCanvas(canvas, word, guesses, incorrectCount) {
  const context = canvas.getContext("2d");
  const rc = rough.canvas(canvas);

  const bodyOptions = { roughness: 1.2, strokeWidth: 1.0, bowing: 2.0 };
  const gallowsOptions = {
    roughness: 1.2,
    strokeWidth: 2.0,
    bowing: 2.0,
    stroke: "brown",
  };
  const correctOptions = {
    roughness: 1.2,
    strokeWidth: 0.8,
    bowing: 2.0,
    stroke: "green",
  };
  const incorrectOptions = {
    roughness: 1.2,
    strokeWidth: 0.8,
    bowing: 2.0,
    stroke: "red",
  };

  context.fillStyle = "white";
  context.fillRect(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < 2; i++) {
    switch (incorrectCount) {
      case 6:
        // left leg
        rc.line(37.5, 72.5, 18.75, 106.25, bodyOptions);
        // eyes
        rc.line(30, 27.5, 33.75, 31.25, bodyOptions);
        rc.line(30, 31.25, 33.75, 27.5, bodyOptions);
        rc.line(40.25, 27.5, 44, 31.25, bodyOptions);
        rc.line(40.25, 31.25, 44, 27.5, bodyOptions);
        // mouth
        rc.line(30, 35, 43.5, 37.25, bodyOptions);
      case 5:
        // right leg
        rc.line(37.5, 72.5, 61.25, 106.25, bodyOptions);
      case 4:
        // left arm
        rc.line(37.5, 53.75, 7.5, 38.75, bodyOptions);
      case 3:
        // right arm
        rc.line(37.5, 53.75, 72.5, 38.75, bodyOptions);
      case 2:
        // body
        rc.line(37.5, 42.5, 37.5, 72.5, bodyOptions);
      case 1:
        // head
        rc.circle(37.5, 31.25, 22.5, bodyOptions);
    }
  }

  // gallows
  rc.line(37.5, 117.5, 112.5, 117.5, gallowsOptions);
  rc.line(75, 117.5, 75, 8.75, gallowsOptions);
  rc.line(75, 8.75, 37.5, 8.75, gallowsOptions);
  rc.line(37.5, 8.75, 37.5, 16.25, gallowsOptions);

  const length = 18;
  context.font = "16px sans-serif";
  // blanks
  for (let i = 0; i < word.length; i++) {
    const margin = 8;
    const startX = margin + i * (length + margin);
    rc.line(startX, 147, startX + length, 147);
    const { width } = context.measureText(word[i].toUpperCase());
    context.fillStyle = "darkblue";
    if (word[i] === word[i].toLowerCase()) {
      context.fillStyle = "gray";
    }
    if (word[i] !== "_") {
      context.fillText(
        word[i].toUpperCase(),
        startX + (length - width) / 2.0,
        142
      );
    }
  }

  context.fillStyle = "darkblue";
  for (let i = 0; i < guesses.length; i++) {
    const margin = 15;
    const perRow = 5;
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const startX = 130 + col * (length + margin);
    const startY = 30 + row * 28;
    const { width } = context.measureText(guesses[i].toUpperCase());
    context.fillText(
      guesses[i].toUpperCase(),
      startX + (length - width) / 2.0,
      startY
    );
    if (guesses[i] === guesses[i].toUpperCase()) {
      rc.circle(
        startX + length / 2,
        startY - length / 2 + 3,
        20,
        correctOptions
      );
    } else {
      rc.line(
        startX + length,
        startY - length + 3,
        startX,
        startY + 3,
        incorrectOptions
      );
    }
  }
}

module.exports = {
  updateCanvas,
};
