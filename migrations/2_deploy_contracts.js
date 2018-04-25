var Forum = artifacts.require("./Forum.sol");
var ECRecovery = artifacts.require("./ECRecovery.sol");

module.exports = function(deployer) {
  deployer.deploy(ECRecovery);
  deployer.link(ECRecovery, Forum);
  deployer.deploy(Forum, 10000, web3.toWei('0.0000001', 'ether'), {gas: 4700000});
};
