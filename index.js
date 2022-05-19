const express = require("express");
const { status } = require("express/lib/response");
const app = express();
const fs = require("fs");
const { STATUS_CODES } = require("http");
const { start } = require("repl");
const port = 3000;

function getStarOftWeek(d) {
  const firstDay = new Date(d.setDate(d.getDate() - d.getDay()));
  return firstDay;
}
// this is to convert date and remove timezone to make it UTC compatible
function toIsoString(date) {
  var tzo = -date.getTimezoneOffset(),
    dif = tzo >= 0 ? "+" : "-",
    pad = function (num) {
      return (num < 10 ? "0" : "") + num;
    };

  return (
    date.getUTCFullYear() +
    "-" +
    pad(date.getUTCMonth() + 1) +
    "-" +
    pad(date.getUTCDate()) +
    "T" +
    pad(date.getUTCHours()) +
    ":" +
    pad(date.getUTCMinutes()) +
    ":" +
    pad(date.getUTCSeconds()) +
    "Z"
  );
}

app.get("/users/:id/rewards", (req, res) => {
  try {
    const filename = req.params.id.toString() + ".json";

    let atDate = new Date(Date.parse(req.query.at));
    let startWeekDate = getStarOftWeek(atDate);
    // we need the time to be UTC and start of the week representing midnight or 00  of next day
    startWeekDate.setUTCHours(0);
    startWeekDate.setUTCMinutes(0);
    startWeekDate.setUTCSeconds(0);
    startWeekDate.setUTCMilliseconds(0);

    const fdata = fs.readFileSync(filename, { flag: "a+" });
    let jsonData;
    // create structure of not existed
    if (fdata.byteLength == 0) {
      jsonData = {};
    } else {
      jsonData = JSON.parse(fdata);
    }
    weekObj = jsonData[toIsoString(startWeekDate)];
    if (weekObj === undefined || weekObj === {}) {
      weekObj = {};
      // we set start of the week as the key identifier for the week
      weekObj[toIsoString(startWeekDate)] = { data: [] };
      weekData = weekObj[toIsoString(startWeekDate)]["data"];
      let data = [];
      for (let i = 0; i < 7; i++) {
        let expireOfDay = new Date(
          startWeekDate.getTime() + (i + 1) * (24 * 60 * 60 * 1000)
        );
        let startOfDay = new Date(
          startWeekDate.getTime() + i * (24 * 60 * 60 * 1000)
        );
        weekData.push({
          availableAt: toIsoString(startOfDay),
          redeemedAt: null,
          expiresAt: toIsoString(expireOfDay),
        });
      }
      jsonData[toIsoString(startWeekDate)] = {};
      jsonData[toIsoString(startWeekDate)]["data"] = weekData;
      fs.writeFileSync(filename, JSON.stringify(jsonData));
      return res.send(jsonData);
    } else {
      return res.send(jsonData);
    }
  } catch (error) {
    return res.status(500).send("something went wrong");
  }
});
app.patch("/users/:id/rewards/:date/redeem", (req, res) => {
  try {
    const userDataPath = req.params.id.toString() + ".json";
    const fdata = fs.readFileSync(userDataPath, { flag: "r" });
    const fileJsondata = JSON.parse(fdata);
    // here we get start of the week for the input date to find it inside user's file
    let startWeek = toIsoString(
      getStarOftWeek(new Date(Date.parse(req.params.date)))
    );
    // if its not inside user's file we don't have it yet generated and stored!
    if (fileJsondata[startWeek] === undefined) {
      // there is no data for this week
      return res.status(404).send({ error: { message: "No redeem found" } });
    }
    // get reward data for the week
    const rewardDataForWeek = fileJsondata[startWeek]["data"];
    for (let i = 0; i < rewardDataForWeek.length; i++) {
      const idata = rewardDataForWeek[i];
      if (idata["availableAt"] !== undefined) {
        if (idata["availableAt"] != req.params.date) {
          // check if date is equal to input date (since its acting as id no change is needed)
          continue;
        }
        const expireDate = new Date(Date.parse(idata["expiresAt"]));
        // check if redeemed already or not
        if (idata["redeemedAt"] != null) {
          const redeemedAtDate = new Date(Date.parse(idata["redeemedAt"]));
          if (redeemedAtDate.getDate() != 0) {
            return res
              .status(400)
              .send({ error: { message: "This reward is already redeemed" } });
          }
        }
        // check if expireDate is not met yet
        if (expireDate.getDate() < new Date().getTime()) {
          idata["redeemedAt"] = toIsoString(new Date());
          fs.writeFileSync(userDataPath, JSON.stringify(fileJsondata)); // update file with new data
          return res.status(200).send("Redeemed");
        } else {
          return res
            .status(400)
            .send({ error: { message: "This reward is already expired" } });
        }
      }
    }
    res.status(404).send({ error: { message: "No redeem found" } });
  } catch (error) {
    res.status(500).send({ error: { message: error.toString() } });
  }
});

app.listen(port, () => {
  console.log(`app listening on port ${port}`);
});

module.exports = { app, getStarOftWeek, toIsoString }; // for testing
