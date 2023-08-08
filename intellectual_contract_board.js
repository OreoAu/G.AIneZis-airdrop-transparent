const crypto = require('crypto');
const Intelpoint = require('./intelpoint.js');
const UserConnector = require('./user_connector.js');

class IntellectualContractBoard {
  constructor() {

    this.totalTokenAmount = 0;
    this.tokenInCirculation = 0;
    this.intellectualContract = {};
    this.initialIntelpoints = 12;
    this.proofOfBartering = 'Proof of Bartering';

    for (let i = 1; i <= this.initialIntelpoints; i++) {
      const randomPart = crypto.randomBytes(32).toString('hex');
      this.intellectualContract[i] = new Intelpoint(i, randomPart);
    }
  }

  generateToken(amount) {
    this.totalTokenAmount += amount;
    this.tokenInCirculation += amount;
  }

  setTokenValue(value) {
    this.tokenValue = value;
  }

  connectUser(user) {
    return new UserConnector(this, user);
  }
}

module.exports = IntellectualContractBoard;
