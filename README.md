# hangman-bot

Slack bot for playing Hangman.

![Screenshot](http://hangman.do.aoneill.com/image?word=cActUs&guesses=eiArUlfm&incorrectCount=6)

1. Add bot to channel
2. Start a new game by `/hangman [word]`
3. Guess letters by posting messages consisting of a single letter

## Deployment Notes

_Notes to myself for if I need to host it again._

* Apps can be configured at [https://api.slack.com/apps](https://api.slack.com/apps)
* Enable events, pointing to `/slack/events` url of hosted bot
* Subscribe to bot events:
  * `message.channels`
  * `message.im`
  * `message.groups`
* Add additional scopes:
  * `chat.write`
  * `reactions.write`
* Add `/hangman [word]` slash command, using same endpoint as events
* Host the bot somewhere, such as the [Node.js Quickstart](https://cloud.digitalocean.com/marketplace/5df3a5a374ec0f0d4d2c0085?i=0163e6) droplet
* Run `index.js` with Node, with the following environment variables set:
  * `SLACK_SIGNING_SECRET`
  * `SLACK_BOT_TOKEN`
