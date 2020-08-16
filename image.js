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
        // right leg
        rc.line(50, 90, 25, 135, bodyOptions);
        // eyes
        rc.line(40, 30, 45, 35, bodyOptions);
        rc.line(40, 35, 45, 30, bodyOptions);
        rc.line(55, 30, 60, 35, bodyOptions);
        rc.line(55, 35, 60, 30, bodyOptions);
        // mouth
        rc.line(40, 40, 58, 43, bodyOptions);
      case 5:
        // right leg
        rc.line(50, 90, 75, 135, bodyOptions);
      case 4:
        // left arm
        rc.line(50, 65, 10, 45, bodyOptions);
      case 3:
        // right arm
        rc.line(50, 65, 90, 45, bodyOptions);
      case 2:
        // body
        rc.line(50, 50, 50, 90, bodyOptions);
      case 1:
        // head
        rc.circle(50, 35, 30, bodyOptions);
    }
  }

  // gallows
  rc.line(50, 150, 150, 150, gallowsOptions);
  rc.line(100, 150, 100, 5, gallowsOptions);
  rc.line(100, 5, 50, 5, gallowsOptions);
  rc.line(50, 5, 50, 15, gallowsOptions);

  const length = 20;
  context.font = "28px sans-serif";
  // blanks
  for (let i = 0; i < word.length; i++) {
    const margin = 10;
    const startX = margin + i * (length + margin);
    rc.line(startX, 195, startX + length, 195);
    const { width } = context.measureText(word[i].toUpperCase());
    context.fillStyle = "darkblue";
    if (word[i] === word[i].toLowerCase()) {
      context.fillStyle = "gray";
    }
    if (word[i] !== "_") {
      context.fillText(
        word[i].toUpperCase(),
        startX + (length - width) / 2.0,
        190
      );
    }
  }

  context.fillStyle = "darkblue";
  for (let i = 0; i < guesses.length; i++) {
    const margin = 30;
    const perRow = 5;
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const startX = 160 + col * (length + margin);
    const startY = 30 + row * 40;
    const { width } = context.measureText(guesses[i].toUpperCase());
    context.fillText(
      guesses[i].toUpperCase(),
      startX + (length - width) / 2.0,
      startY
    );
    if (guesses[i] === guesses[i].toUpperCase()) {
      rc.circle(startX + width / 2, startY - width / 2, 30, correctOptions);
    } else {
      rc.line(startX + width, startY - width, startX, startY, incorrectOptions);
    }
  }
}

module.exports = {
  updateCanvas
}
