const mcache = require("memory-cache");

function cache(duration, contentType) {
  return (req, res, next) => {
    const key = "__express__" + req.originalUrl || req.url;
    console.log(`key: ${key}`);
    const cachedBody = mcache.get(key);
    if (cachedBody) {
      console.log("Returning cached response");
      res.set("Content-Type", contentType);
      res.send(cachedBody);
      return;
    } else {
      res.sendResponse = res.send;
      res.send = (body) => {
        console.log("Caching response");
        mcache.put(key, body, duration * 1000);
        res.sendResponse(body);
      }
      next();
    }
  }
}

async function streamToString (stream) {
  let data = ''
  return new Promise((resolve, reject) => {
    stream.on('data', chunk => (data += chunk))
    stream.on('error', reject)
    stream.on('end', () => resolve(data))
  })
}

module.exports = {
  cache,
  streamToString
}

