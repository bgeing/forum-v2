var Forum = artifacts.require("./Forum.sol");

contract('Forum', function(accounts) {
  
  it("should be able to buy tokens", function() {
    var instance;
    var tokensSold;
    var userTokens;

    return Forum.deployed().then(function(contractInstance) {
      instance = contractInstance;
      return contractInstance.buy({value: web3.toWei(0.0000001, 'ether'), from: web3.eth.accounts[0]});
    }).then(function() {
      return instance.tokensSold.call();
    }).then(function(balance) {
      tokensSold = balance;
      return instance.getUserInfo.call(web3.eth.accounts[0]);
    }).then(function(userInfo) {
      userTokens = userInfo[1];
    });

    assert.equal(tokensSold, 10, "10 tokens were not sold");
    assert.equal(userTokens, 10, "10 tokens were not sold");
  });

});
