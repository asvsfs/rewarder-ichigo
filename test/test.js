//Require the dev-dependencies
let chai = require("chai");
let chaiHttp = require("chai-http");
let { app, getStarOftWeek, toIsoString } = require("../index");
let should = chai.should();
const fs = require("fs");
chai.use(chaiHttp);

const wrongDate = toIsoString(
  // some time in future
  new Date(new Date().getTime() - 148 * 60 * 60 * 1000)
);
const wrongStartWeek = getStarOftWeek(new Date(Date.parse(wrongDate)));
wrongStartWeek.setUTCHours(0);
wrongStartWeek.setUTCMinutes(0);
wrongStartWeek.setUTCSeconds(0);
wrongStartWeek.setUTCMilliseconds(0);

const futureDate = toIsoString(
  // some time in future
  new Date(new Date().getTime() + 48 * 60 * 60 * 1000)
);
const startWeek = getStarOftWeek(new Date(Date.parse(futureDate)));
startWeek.setUTCHours(0);
startWeek.setUTCMinutes(0);
startWeek.setUTCSeconds(0);
startWeek.setUTCMilliseconds(0);
describe("Rewarder", () => {
  after(() => {
    fs.unlinkSync("test.json");
  });
  describe("/GET /users/:id/rewards", () => {
    it("it should GET/CREATE reward booking for user", (done) => {
      chai
        .request(app)
        .get(`/users/test/rewards?at=${futureDate}`)
        .end((err, res) => {
          res.should.have.status(200);
          const startWeekStr = toIsoString(startWeek);
          chai.expect(res.body).to.have.property(startWeekStr);
          chai.expect(res.body[startWeekStr]).to.have.property("data");
          chai.expect(res).to.be.json;
          done();
        });
    });
  });

  describe("/PATCH /users/:id/rewards/:date/redeem success", () => {
    it("it should success redeem reward for user", (done) => {
      chai
        .request(app)
        .patch(`/users/test/rewards/${toIsoString(startWeek)}/redeem`)
        .end((err, res) => {
          res.should.have.status(200);
          const startWeekStr = toIsoString(startWeek);
          chai.expect(res.text).to.equal("Redeemed");
          done();
        });
    });
  });

  describe("/PATCH /users/:id/rewards/:date/redeem fail", () => {
    it("it should fail redeem reward for user", (done) => {
      chai
        .request(app)
        .patch(`/users/test/rewards/${toIsoString(wrongStartWeek)}/redeem`)
        .end((err, res) => {
          console.log(res.body)
          res.should.have.status(404);
          chai.expect(res.body).to.have.property("error");
          chai.expect(res.body["error"]).to.have.property("message");
          chai
            .expect(res.body["error"]["message"])
            .to.be.equal("No redeem found");
          done();
        });
    });
  });
});
